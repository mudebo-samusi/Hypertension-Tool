# app/routes/chat.py
from flask import Blueprint, request, jsonify, current_app, session
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request, exceptions as jwt_exceptions, decode_token as jwt_decode_token
from models.chat import ChatRoom, Message
from models.user import User
from db import db
from flask_socketio import join_room, leave_room, emit
import socketio  # Import the main socketio library for exceptions
from datetime import datetime  # Import datetime

chat_bp = Blueprint('chat_bp', __name__, url_prefix='/api/chat')

@chat_bp.route('/rooms', methods=['GET'])
@jwt_required()
def list_rooms():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    user_rooms = ChatRoom.query.join(ChatRoom.users).filter(User.id == user_id).order_by(ChatRoom.updated_at.desc()).all()

    rooms_data = []
    for r in user_rooms:
        last_msg_data = None
        if r.last_message:
            last_msg_data = {
                'id': r.last_message.id,
                'content': r.last_message.content,
                'timestamp': r.last_message.timestamp.isoformat(),
                'sender': {
                    'id': r.last_message.sender.id,
                    'username': r.last_message.sender.username,
                    'avatar': r.last_message.sender.profile_image
                }
            }

        room_name = r.name
        room_avatar = None

        participants_data = []
        for p_user in r.users:
            participants_data.append({
                'id': p_user.id,
                'username': p_user.username,
                'avatar': p_user.profile_image,
                'is_online': p_user.is_online,
                'last_seen': p_user.last_seen.isoformat() if p_user.last_seen else None
            })

        if not r.is_group and len(r.users) == 2:
            other_user = next((u for u in r.users if u.id != user_id), None)
            if other_user:
                room_name = other_user.username
                room_avatar = other_user.profile_image

        rooms_data.append({
            'id': r.id,
            'name': room_name,
            'is_group': r.is_group,
            'lastMessage': last_msg_data,
            'updated_at': r.updated_at.isoformat(),
            'avatar': room_avatar,
            'participants': participants_data,
            'unreadCount': 0
        })
    return jsonify(rooms_data), 200

@chat_bp.route('/rooms/<int:room_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(room_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    room = ChatRoom.query.get_or_404(room_id)
    if user not in room.users:
        return jsonify({'error': 'Access denied'}), 403

    limit = request.args.get('limit', 20, type=int)
    before_id = request.args.get('before', type=int)

    query = Message.query.filter(Message.room_id == room_id)
    if before_id:
        query = query.filter(Message.id < before_id)

    messages_batch = query.order_by(Message.id.desc()).limit(limit).all()
    messages_batch.reverse()

    return jsonify([{
        'id': m.id,
        'sender': {'id': m.sender.id, 'username': m.sender.username, 'avatar': m.sender.profile_image},
        'content': m.content,
        'timestamp': m.timestamp.isoformat()
    } for m in messages_batch]), 200

@chat_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    users = User.query.filter(User.id != user_id).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'name': u.username,
        'email': u.email,
        'profile_image': u.profile_image,
        'is_online': u.is_online,
        'last_seen': u.last_seen.isoformat() if u.last_seen else None
    } for u in users]), 200

@chat_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    user_id = int(get_jwt_identity())
    current_user_obj = db.session.get(User, user_id)
    data = request.json

    if not data or 'user_ids' not in data:
        return jsonify({'error': 'Missing required fields (user_ids)'}), 400

    name = data.get('name', '')
    participant_ids = data.get('user_ids', [])
    is_group = data.get('is_group', len(participant_ids) > 1)

    if user_id not in participant_ids:
        participant_ids.append(user_id)

    if not is_group and len(participant_ids) == 2:
        other_user_id = next((pid for pid in participant_ids if pid != user_id), None)
        if other_user_id:
            from sqlalchemy import and_
            existing_room = ChatRoom.query.join(ChatRoom.users).filter(
                ChatRoom.is_group == False,
                ChatRoom.users.any(User.id == user_id),
                ChatRoom.users.any(User.id == other_user_id)
            ).having(db.func.count(User.id) == 2).group_by(ChatRoom.id).first()

            if existing_room:
                last_msg_data = None
                if existing_room.last_message:
                    last_msg_data = {
                        'id': existing_room.last_message.id,
                        'content': existing_room.last_message.content,
                        'timestamp': existing_room.last_message.timestamp.isoformat(),
                        'sender': {
                            'id': existing_room.last_message.sender.id,
                            'username': existing_room.last_message.sender.username,
                            'avatar': existing_room.last_message.sender.profile_image
                        }
                    }
                participants_data = [{
                    'id': u.id,
                    'username': u.username,
                    'avatar': u.profile_image,
                    'is_online': u.is_online,
                    'last_seen': u.last_seen.isoformat() if u.last_seen else None
                } for u in existing_room.users]
                room_name_res = existing_room.name
                room_avatar_res = None
                other_user_obj = db.session.get(User, other_user_id)
                if other_user_obj:
                    room_name_res = other_user_obj.username
                    room_avatar_res = other_user_obj.profile_image

                return jsonify({
                    'id': existing_room.id,
                    'name': room_name_res,
                    'is_group': existing_room.is_group,
                    'lastMessage': last_msg_data,
                    'updated_at': existing_room.updated_at.isoformat(),
                    'avatar': room_avatar_res,
                    'participants': participants_data,
                    'unreadCount': 0
                }), 200

    room = ChatRoom(name=name, is_group=is_group)
    room.updated_at = datetime.utcnow()

    for p_id in participant_ids:
        u = db.session.get(User, p_id)
        if u:
            room.users.append(u)

    db.session.add(room)
    db.session.commit()

    participants_data_new = [{
        'id': u.id,
        'username': u.username,
        'avatar': u.profile_image,
        'is_online': u.is_online,
        'last_seen': u.last_seen.isoformat() if u.last_seen else None
    } for u in room.users]
    room_name_new = room.name
    room_avatar_new = None
    if not room.is_group and len(room.users) == 2:
        other_user_new = next((u_new for u_new in room.users if u_new.id != user_id), None)
        if other_user_new:
            room_name_new = other_user_new.username
            room_avatar_new = other_user_new.profile_image

    return jsonify({
        'id': room.id,
        'name': room_name_new,
        'is_group': room.is_group,
        'created_at': room.created_at.isoformat(),
        'updated_at': room.updated_at.isoformat(),
        'lastMessage': None,
        'avatar': room_avatar_new,
        'participants': participants_data_new,
        'unreadCount': 0
    }), 201

@chat_bp.route('/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    contacts = user.contacts.all()
    return jsonify([{
        'id': c.id,
        'username': c.username,
        'email': c.email,
        'profile_image': c.profile_image,
        'is_online': c.is_online,
        'last_seen': c.last_seen.isoformat() if c.last_seen else None
    } for c in contacts]), 200

@chat_bp.route('/contacts', methods=['POST'])
@jwt_required()
def add_contact():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    data = request.json
    contact_user_id = data.get('user_id')

    if not contact_user_id:
        return jsonify({'error': 'User ID required for contact'}), 400

    contact_user = db.session.get(User, contact_user_id)
    if not contact_user:
        return jsonify({'error': 'Contact user not found'}), 404
    if contact_user.id == user_id:
        return jsonify({'error': 'Cannot add yourself as a contact'}), 400
    if contact_user in user.contacts:
        return jsonify({'message': 'User already in contacts'}), 200

    user.contacts.append(contact_user)
    db.session.commit()
    return jsonify({
        'message': 'Contact added successfully',
        'contact': {
            'id': contact_user.id,
            'username': contact_user.username,
            'email': contact_user.email,
            'profile_image': contact_user.profile_image,
            'is_online': contact_user.is_online,
            'last_seen': contact_user.last_seen.isoformat() if contact_user.last_seen else None
        }
    }), 201

@chat_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
@jwt_required()
def remove_contact(contact_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    contact_to_remove = db.session.get(User, contact_id)

    if not contact_to_remove:
        return jsonify({'error': 'Contact not found to remove'}), 404
    if contact_to_remove not in user.contacts:
        return jsonify({'error': 'User is not in your contacts list'}), 404

    user.contacts.remove(contact_to_remove)
    db.session.commit()
    return jsonify({'message': 'Contact removed successfully'}), 200

def register_socketio_handlers(socketio_instance, namespace_path):
    @socketio_instance.on('connect', namespace=namespace_path)
    def handle_connect():
        sid = request.sid
        current_app.logger.info(f"Chat client attempting to connect with sid: {sid}")

        token = None
        if request.args and 'token' in request.args:
            token = request.args.get('token')
            current_app.logger.debug(f"Token found in query string for SID {sid}")

        if not token and hasattr(request, 'event') and isinstance(request.event, dict) and request.event.get('auth'):
            client_auth_dict = request.event.get('auth')
            if client_auth_dict and isinstance(client_auth_dict, dict) and client_auth_dict.get('token'):
                raw_client_token = client_auth_dict.get('token')
                if raw_client_token.startswith('Bearer '):
                    token = raw_client_token.split(' ')[1]
                else:
                    token = raw_client_token
                current_app.logger.debug(f"Token found in client_auth for SID {sid}")

        if not token:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                current_app.logger.debug(f"Token found in Authorization header for SID {sid}")

        if not token:
            current_app.logger.warning(f"Socket connection attempt by {sid} without token.")
            return False

        try:
            identity_claim = current_app.config.get("JWT_IDENTITY_CLAIM", "sub")
            decoded_token = jwt_decode_token(token)
            user_identity = decoded_token[identity_claim]

            session['user_id'] = str(user_identity)
            session['sid'] = sid

            user = db.session.get(User, int(user_identity))
            if user:
                user.is_online = True
                user.last_seen = datetime.utcnow()
                db.session.commit()

            current_app.logger.info(f"Chat client {sid} (User ID: {user_identity}) connected successfully.")
            return True
        except jwt_exceptions.ExpiredSignatureError:
            current_app.logger.warning(f"Socket connection attempt by {sid} with expired token.")
            return False
        except jwt_exceptions.InvalidTokenError as e:
            current_app.logger.warning(f"Socket connection attempt by {sid} with invalid token: {str(e)}")
            return False
        except Exception as e:
            current_app.logger.error(f"Unexpected error during socket authentication for {sid}: {str(e)}")
            return False

    def authenticated_only(f):
        def wrapper(*args, **kwargs):
            if 'user_id' not in session or session.get('sid') != request.sid:
                current_app.logger.warning(f"Unauthenticated access by SID {request.sid} to event {f.__name__}.")
                socketio_instance.emit('error', {'msg': 'Authentication required for this action.'}, namespace=namespace_path)
                return None
            return f(*args, **kwargs)
        return wrapper

    @socketio_instance.on('join', namespace=namespace_path)
    @authenticated_only
    def on_join(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            current_app.logger.error(f"User {user_id} not found for SID {request.sid} during join.")
            socketio_instance.emit('error', {'msg': 'User not found.'}, namespace=namespace_path)
            return

        room_id = data.get('room')
        if not room_id:
            socketio_instance.emit('error', {'msg': 'Room ID is required for join.'}, namespace=namespace_path)
            return

        join_room(str(room_id))
        current_app.logger.info(f"User {user.username} (SID: {request.sid}) joined room {room_id}")
        socketio_instance.emit('status', {'msg': f"{user.username} has entered room {room_id}"}, to=str(room_id), namespace=namespace_path)

    @socketio_instance.on('leave', namespace=namespace_path)
    @authenticated_only
    def on_leave(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            socketio_instance.emit('error', {'msg': 'User not found.'}, namespace=namespace_path)
            return

        room_id = data.get('room')
        if not room_id:
            socketio_instance.emit('error', {'msg': 'Room ID is required for leave.'}, namespace=namespace_path)
            return

        leave_room(str(room_id))
        current_app.logger.info(f"User {user.username} (SID: {request.sid}) left room {room_id}")
        socketio_instance.emit('status', {'msg': f"{user.username} has left room {room_id}"}, to=str(room_id), namespace=namespace_path)

    @socketio_instance.on('message', namespace=namespace_path)
    @authenticated_only
    def handle_message(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            socketio_instance.emit('error', {'msg': 'User not found.'}, namespace=namespace_path)
            return

        room_id_str = str(data.get('room'))
        content = data.get('content')

        if not room_id_str or content is None:
            socketio_instance.emit('error', {'msg': 'Room ID and content are required for message.'}, namespace=namespace_path)
            return

        try:
            room_id_int = int(room_id_str)
            msg = Message(room_id=room_id_int, sender_id=user.id, content=content)
            db.session.add(msg)

            room = db.session.get(ChatRoom, room_id_int)
            if room:
                room.last_message = msg
                room.updated_at = datetime.utcnow()

            db.session.commit()

            payload = {
                'id': msg.id,
                'room': room_id_str,
                'sender': {'id': user.id, 'username': user.username, 'avatar': user.profile_image},
                'content': content,
                'timestamp': msg.timestamp.isoformat()
            }
            socketio_instance.emit('new_message', payload, to=room_id_str, namespace=namespace_path)
            current_app.logger.info(f"User {user.username} (SID: {request.sid}) sent message to room {room_id_str}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error saving/sending message from {user.username} in room {room_id_str}: {str(e)}")
            socketio_instance.emit('error', {'msg': 'Error sending message.'}, namespace=namespace_path)

    @socketio_instance.on('typing', namespace=namespace_path)
    @authenticated_only
    def handle_typing(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            socketio_instance.emit('error', {'msg': 'User not found for typing event.'}, namespace=namespace_path)
            return

        room_id_str = str(data.get('room'))
        is_typing = data.get('isTyping', False)

        if not room_id_str:
            socketio_instance.emit('error', {'msg': 'Room ID is required for typing event.'}, namespace=namespace_path)
            return

        socketio_instance.emit('typing_status', {
            'userId': user_id,
            'username': user.username,
            'room': room_id_str,
            'isTyping': is_typing
        }, to=room_id_str, skip_sid=request.sid, namespace=namespace_path)

    @socketio_instance.on('disconnect', namespace=namespace_path)
    def handle_disconnect():
        sid = request.sid
        user_id_str = session.pop('user_id', None)
        session.pop('sid', None)
        if user_id_str:
            user_id = int(user_id_str)
            user = db.session.get(User, user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.utcnow()
                db.session.commit()
        current_app.logger.info(f"Client {sid} disconnected.")
