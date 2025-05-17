import io from 'socket.io-client';
import api from './api';

// Create array of potential socket URLs matching the backend URLs
const potentialSocketURLs = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
];

let socket = null;

// Function to initialize socket connection
export function initializeSocket() {
    const token = localStorage.getItem('access_token');
    if (!token || token === "null") {
        console.error('No authentication token found. Socket connection not established.');
        return null;
    }
    
    if (socket && socket.connected) return socket;
    
    // Get saved backend URL if available
    const savedBackendURL = localStorage.getItem('backend_url') || potentialSocketURLs[0];
    
    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    // Create socket connection with auth
    socket = io(savedBackendURL, {
        withCredentials: true,
        extraHeaders: {
            Authorization: `Bearer ${token}`
        },
        auth: {
            token: `Bearer ${token}`
        },
        transportOptions: {
            polling: {
                extraHeaders: {
                    Authorization: `Bearer ${token}`
                }
            }
        },
        transports: ['websocket', 'polling']
    });
    
    // Set up connection event handlers
    socket.on('connect', () => {
        console.log('Socket connected successfully');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        
        // Try to reconnect with a refreshed token
        const refreshedToken = localStorage.getItem('access_token');
        if (refreshedToken && refreshedToken !== token) {
            console.log('Attempting reconnect with refreshed token');
            socket.auth.token = `Bearer ${refreshedToken}`;
            socket.connect();
        }
    });
    
    return socket;
}

// Get socket or initialize a new one
export function getSocket() {
    if (!socket || !socket.connected) {
        return initializeSocket();
    }
    return socket;
}

// Join a chat room
export function joinRoom(roomId) {
    const socket = getSocket();
    if (socket && socket.connected) {
        console.log(`Joining room ${roomId}`);
        socket.emit('join', { room: roomId });
    } else {
        console.error('Cannot join room: Socket not connected');
    }
}

// Leave a chat room
export function leaveRoom(roomId) {
    const socket = getSocket();
    if (socket && socket.connected) {
        socket.emit('leave', { room: roomId });
    } else {
        console.error('Cannot leave room: Socket not connected');
    }
}

// Send a message
export function sendMessage(roomId, content) {
    const socket = getSocket();
    if (socket && socket.connected) {
        socket.emit('message', { room: roomId, content });
    } else {
        console.error('Cannot send message: Socket not connected');
    }
}

// Listen for new messages
export function onNewMessage(cb) {
    const socket = getSocket();
    if (socket) socket.on('new_message', cb);
}

// Listen for status updates
export function onStatus(cb) {
    const socket = getSocket();
    if (socket) socket.on('status', cb);
}

// Add typing indicators
export function sendTyping(roomId, isTyping) {
    const socket = getSocket();
    if (socket && socket.connected) {
        socket.emit('typing', { room: roomId, isTyping });
    } else {
        console.error('Cannot send typing status: Socket not connected');
    }
}

export function onTyping(cb) {
    const socket = getSocket();
    if (socket) socket.on('typing_status', cb);
    return () => {
        if (socket) socket.off('typing_status', cb);
    };
}

// Cleanup function to properly disconnect
export function disconnect() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
