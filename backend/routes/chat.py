# app/routes/chat.py
from flask import Blueprint, request, jsonify, current_app, session
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request, exceptions as jwt_exceptions, decode_token as jwt_decode_token
from models.chat import ChatRoom, Message
from models.user import User
from db import db
from flask_socketio import join_room, leave_room, emit
import socketio  # Import the main socketio library for exceptions

chat_bp = Blueprint('chat_bp', __name__, url_prefix='/api/chat')

@chat_bp.route('/rooms', methods=['GET'])
@jwt_required()
def list_rooms():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    rooms = user.rooms
    return jsonify([{'id': r.id, 'name': r.name, 'is_group': r.is_group} for r in rooms]), 200

@chat_bp.route('/rooms/<int:room_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(room_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    room = ChatRoom.query.get_or_404(room_id)
    if user not in room.users:
        return jsonify({'error': 'Access denied'}), 403
    msgs = room.messages.order_by(Message.timestamp.asc()).all()
    return jsonify([{
        'id': m.id,
        'sender': {'id': m.sender.id, 'name': m.sender.username},
        'content': m.content,
        'timestamp': m.timestamp.isoformat()
    } for m in msgs]), 200

@chat_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    # Get all users except current user
    users = User.query.filter(User.id != user_id).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'name': u.username,  # Use username as name if no name field exists
        'email': u.email,
        'isOnline': u.is_active  # Simplification - could use a real online status
    } for u in users]), 200

@chat_bp.route('/rooms', methods=['POST'])
@jwt_required()
def create_room():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    data = request.json
    
    # Validate request
    if not data or 'user_ids' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Extract data
    name = data.get('name', '')
    user_ids = data.get('user_ids', [])
    is_group = data.get('is_group', len(user_ids) > 1)
    
    # Ensure current user is included
    if user_id not in user_ids:
        user_ids.append(user_id)
    
    # Create room
    room = ChatRoom(name=name, is_group=is_group)
    
    # Add users to room
    for u_id in user_ids:
        u = db.session.get(User, u_id)
        if u:
            room.users.append(u)
    
    db.session.add(room)
    db.session.commit()
    
    return jsonify({
        'id': room.id,
        'name': room.name,
        'is_group': room.is_group,
        'created_at': room.created_at.isoformat()
    }), 201

# Define a function to register socketio handlers
def register_socketio_handlers(socketio_instance):
    @socketio_instance.on('connect')
    def handle_connect():
        sid = request.sid
        current_app.logger.info(f"Client attempting to connect with sid: {sid}")
        
        token = None
        # Try to get token from 'auth' dict (recommended for Socket.IO client)
        client_auth_dict = request.event.get('auth') if hasattr(request, 'event') and isinstance(request.event, dict) else None
        if not client_auth_dict and hasattr(socketio_instance, 'auth'):
            client_auth_dict = socketio_instance.auth

        if client_auth_dict and isinstance(client_auth_dict, dict) and client_auth_dict.get('token'):
            raw_client_token = client_auth_dict.get('token')
            if raw_client_token.startswith('Bearer '):
                token = raw_client_token.split(' ')[1]
            else:
                token = raw_client_token
            current_app.logger.debug(f"Token found in client_auth (socketio.auth or request.event['auth']) for SID {sid}")
        
        # Fallback: Check Authorization header (for WebSocket transport after handshake)
        if not token:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                current_app.logger.debug(f"Token found in Authorization header for SID {sid}")
        
        # Fallback: Check query parameter (less secure, last resort)
        if not token:
            query_token = request.args.get('token')
            if query_token:
                if query_token.startswith('Bearer '):
                    token = query_token.split(' ')[1]
                else:
                    token = query_token
                current_app.logger.debug(f"Token found in query parameter for SID {sid}")

        if not token:
            current_app.logger.warning(f"Socket connection attempt by {sid} without token in known locations.")
            raise socketio.exceptions.ConnectionRefusedError('Authentication token required')

        try:
            # Use the JWT_IDENTITY_CLAIM from app config, default to 'sub'
            identity_claim = current_app.config.get("JWT_IDENTITY_CLAIM", "sub")
            decoded_token = jwt_decode_token(token)
            user_identity = decoded_token[identity_claim]
            
            # Store user_id and sid in Flask session, managed by Flask-SocketIO if manage_session=True
            session['user_id'] = str(user_identity)
            session['sid'] = sid

            current_app.logger.info(f"Client {sid} (User ID: {user_identity}) connected successfully.")
            return True
        except jwt_exceptions.ExpiredSignatureError:
            current_app.logger.warning(f"Socket connection attempt by {sid} with expired token.")
            raise socketio.exceptions.ConnectionRefusedError('Token has expired')
        except jwt_exceptions.InvalidTokenError as e:
            current_app.logger.warning(f"Socket connection attempt by {sid} with invalid token: {str(e)}")
            raise socketio.exceptions.ConnectionRefusedError('Invalid token')
        except KeyError:
            current_app.logger.error(f"Token for {sid} is missing identity claim '{identity_claim}'.")
            raise socketio.exceptions.ConnectionRefusedError('Invalid token structure')
        except Exception as e:
            current_app.logger.error(f"Unexpected error during socket authentication for {sid}: {str(e)}")
            raise socketio.exceptions.ConnectionRefusedError('Authentication failed due to server error')

    def authenticated_only(f):
        def wrapper(*args, **kwargs):
            if 'user_id' not in session or session.get('sid') != request.sid:
                current_app.logger.warning(f"Unauthenticated access by SID {request.sid} to event {f.__name__}.")
                emit('error', {'msg': 'Authentication required for this action.'})
                return None
            return f(*args, **kwargs)
        return wrapper

    @socketio_instance.on('join')
    @authenticated_only
    def on_join(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            current_app.logger.error(f"User {user_id} not found for SID {request.sid} during join.")
            emit('error', {'msg': 'User not found.'})
            return

        room_id = data.get('room')
        if not room_id:
            emit('error', {'msg': 'Room ID is required for join.'})
            return
            
        join_room(str(room_id))
        current_app.logger.info(f"User {user.username} (SID: {request.sid}) joined room {room_id}")
        emit('status', {'msg': f"{user.username} has entered room {room_id}"}, to=str(room_id))

    @socketio_instance.on('leave')
    @authenticated_only
    def on_leave(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            emit('error', {'msg': 'User not found.'})
            return

        room_id = data.get('room')
        if not room_id:
            emit('error', {'msg': 'Room ID is required for leave.'})
            return

        leave_room(str(room_id))
        current_app.logger.info(f"User {user.username} (SID: {request.sid}) left room {room_id}")
        emit('status', {'msg': f"{user.username} has left room {room_id}"}, to=str(room_id))

    @socketio_instance.on('message')
    @authenticated_only
    def handle_message(data):
        user_id = int(session['user_id'])
        user = db.session.get(User, user_id)
        if not user:
            emit('error', {'msg': 'User not found.'})
            return

        room_id_str = str(data.get('room'))
        content = data.get('content')

        if not room_id_str or content is None:
            emit('error', {'msg': 'Room ID and content are required for message.'})
            return

        try:
            msg = Message(room_id=int(room_id_str), sender_id=user.id, content=content)
            db.session.add(msg)
            db.session.commit()
            payload = {
                'id': msg.id,
                'room': room_id_str,
                'sender': {'id': user.id, 'name': user.username},
                'content': content,
                'timestamp': msg.timestamp.isoformat()
            }
            emit('new_message', payload, to=room_id_str)
            current_app.logger.info(f"User {user.username} (SID: {request.sid}) sent message to room {room_id_str}")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error saving/sending message from {user.username} in room {room_id_str}: {str(e)}")
            emit('error', {'msg': 'Error sending message.'})

    @socketio_instance.on('typing')
    @authenticated_only
    def handle_typing(data):
        user_id = int(session['user_id'])
        room_id_str = str(data.get('room'))
        is_typing = data.get('isTyping', False)

        if not room_id_str:
            emit('error', {'msg': 'Room ID is required for typing event.'})
            return
            
        emit('typing_status', {
            'userId': user_id,
            'room': room_id_str,
            'isTyping': is_typing
        }, to=room_id_str, skip_sid=request.sid)

    @socketio_instance.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        user_id = session.pop('user_id', None)
        session.pop('sid', None)
        if user_id:
            current_app.logger.info(f"Client {sid} (User ID: {user_id}) disconnected.")
        else:
            current_app.logger.info(f"Client {sid} (unauthenticated or session expired) disconnected.")
