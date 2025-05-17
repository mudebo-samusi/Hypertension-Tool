import io from 'socket.io-client';
import api from './api';

// Create array of potential socket URLs matching the backend URLs
const potentialSocketURLs = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
];

let socketInstances = {
    chat: null,
    monitor: null,
};

let reconnectTimers = {
    chat: null,
    monitor: null,
};

let reconnectAttempts = {
    chat: 0,
    monitor: 0,
};

const MAX_RECONNECT_ATTEMPTS = 5;

// Function to get authorization token for socket connections
function getAuthToken() {
    const token = localStorage.getItem('access_token');
    if (!token || token === "null") {
        console.error('No authentication token found.');
        return null;
    }
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

// Function to initialize socket connection with specific namespace
export function initializeSocket(namespace = 'chat') {
    const token = getAuthToken();
    if (!token) return null;
    
    const namespaceUrl = namespace === 'chat' ? '/chat' : 
                          namespace === 'monitor' ? '/monitor' : '';
    
    if (socketInstances[namespace] && socketInstances[namespace].connected) {
        return socketInstances[namespace];
    }
    
    clearTimeout(reconnectTimers[namespace]);
    
    // Get saved backend URL if available
    const savedBackendURL = localStorage.getItem('backend_url') || potentialSocketURLs[0];
    
    // Disconnect existing socket if any
    if (socketInstances[namespace]) {
        socketInstances[namespace].disconnect();
        socketInstances[namespace] = null;
    }
    
    console.log(`Initializing ${namespace} socket connection with token`);
    
    // Create socket connection with auth - pass token in query string for reliability
    const socketUrl = `${savedBackendURL}${namespaceUrl}?token=${encodeURIComponent(token.replace('Bearer ', ''))}`;
    
    socketInstances[namespace] = io(socketUrl, {
        withCredentials: true,
        extraHeaders: {
            Authorization: token
        },
        auth: {
            token: token
        },
        transportOptions: {
            polling: {
                extraHeaders: {
                    Authorization: token
                }
            }
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
    });
    
    // Reset reconnect attempts on new connection
    reconnectAttempts[namespace] = 0;
    
    // Set up connection event handlers
    socketInstances[namespace].on('connect', () => {
        console.log(`${namespace} socket connected successfully`);
        reconnectAttempts[namespace] = 0;
    });
    
    socketInstances[namespace].on('connect_error', (error) => {
        console.error(`${namespace} socket connection error:`, error);
        
        // Try to reconnect with a refreshed token
        const refreshedToken = getAuthToken();
        if (refreshedToken && refreshedToken !== token) {
            console.log(`Attempting reconnect with refreshed token for ${namespace}`);
            socketInstances[namespace].auth.token = refreshedToken;
            socketInstances[namespace].io.opts.query = `token=${encodeURIComponent(refreshedToken.replace('Bearer ', ''))}`;
            socketInstances[namespace].connect();
        } else if (reconnectAttempts[namespace] < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts[namespace]++;
            console.log(`Scheduling reconnect attempt ${reconnectAttempts[namespace]}/${MAX_RECONNECT_ATTEMPTS} for ${namespace}`);
            clearTimeout(reconnectTimers[namespace]);
            reconnectTimers[namespace] = setTimeout(() => {
                console.log(`Attempting reconnect ${reconnectAttempts[namespace]} for ${namespace}`);
                initializeSocket(namespace);
            }, 3000 * reconnectAttempts[namespace]); // Increasing backoff
        }
    });
    
    socketInstances[namespace].on('disconnect', (reason) => {
        console.log(`${namespace} socket disconnected: ${reason}`);
        if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect with fresh token
            clearTimeout(reconnectTimers[namespace]);
            reconnectTimers[namespace] = setTimeout(() => {
                console.log(`Attempting reconnect after server disconnect for ${namespace}`);
                initializeSocket(namespace);
            }, 3000);
        }
    });
    
    return socketInstances[namespace];
}

// Get socket or initialize a new one
export function getSocket(namespace = 'chat') {
    if (!socketInstances[namespace] || !socketInstances[namespace].connected) {
        return initializeSocket(namespace);
    }
    return socketInstances[namespace];
}

// Function to specifically get the monitor socket 
export function getMonitorSocket() {
    return getSocket('monitor');
}

// Join a chat room
export function joinRoom(roomId) {
    const socket = getSocket('chat');
    if (socket && socket.connected) {
        console.log(`Joining room ${roomId}`);
        socket.emit('join', { room: roomId });
        return true;
    } else {
        console.error('Cannot join room: Socket not connected');
        return false;
    }
}

// Leave a chat room
export function leaveRoom(roomId) {
    const socket = getSocket('chat');
    if (socket && socket.connected) {
        socket.emit('leave', { room: roomId });
    } else {
        console.error('Cannot leave room: Socket not connected');
    }
}

// Send a message
export function sendMessage(roomId, content) {
    const socket = getSocket('chat');
    if (socket && socket.connected) {
        socket.emit('message', { room: roomId, content });
    } else {
        console.error('Cannot send message: Socket not connected');
    }
}

// Listen for new messages
export function onNewMessage(cb) {
    const socket = getSocket('chat');
    if (socket) socket.on('new_message', cb);
}

// Listen for status updates
export function onStatus(cb) {
    const socket = getSocket('chat');
    if (socket) socket.on('status', cb);
}

// Add typing indicators
export function sendTyping(roomId, isTyping) {
    const socket = getSocket('chat');
    if (socket && socket.connected) {
        socket.emit('typing', { room: roomId, isTyping });
        return true;
    } else {
        console.error('Cannot send typing status: Socket not connected');
        
        // Try to reconnect socket
        initializeSocket('chat');
        return false;
    }
}

export function onTyping(cb) {
    const socket = getSocket('chat');
    if (socket) socket.on('typing_status', cb);
    return () => {
        if (socket) socket.off('typing_status', cb);
    };
}

// Monitor-specific events
export function onBPReading(cb) {
    const socket = getSocket('monitor');
    if (socket) socket.on('new_bp_reading', cb);
    return () => {
        if (socket) socket.off('new_bp_reading', cb);
    };
}

export function onPrediction(cb) {
    const socket = getSocket('monitor');
    if (socket) socket.on('prediction_result', cb);
    return () => {
        if (socket) socket.off('prediction_result', cb);
    };
}

// Cleanup function to properly disconnect all sockets
export function disconnect() {
    Object.keys(socketInstances).forEach(namespace => {
        clearTimeout(reconnectTimers[namespace]);
        if (socketInstances[namespace]) {
            socketInstances[namespace].disconnect();
            socketInstances[namespace] = null;
        }
    });
}

// Function to check if a specific socket is currently connected
export function isConnected(namespace = 'chat') {
    return socketInstances[namespace] && socketInstances[namespace].connected;
}

// Function to force a reconnection attempt
export function reconnect(namespace = 'chat') {
    clearTimeout(reconnectTimers[namespace]);
    
    if (socketInstances[namespace]) {
        socketInstances[namespace].disconnect();
        socketInstances[namespace] = null;
    }
    
    return initializeSocket(namespace);
}
