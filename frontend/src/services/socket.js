import io from 'socket.io-client';
import api from './api';

// Create array of potential socket URLs matching the backend URLs
const potentialSocketURLs = [
    'http://localhost:5000',      // Main backend
    'http://localhost:5001',      // BP Monitor microservice
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001',
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

// Service discovery for BP Monitor microservice
async function discoverBPMonitorService() {
    const monitorURLs = [
        'http://localhost:5001',
        'http://127.0.0.1:5001',
        'http://192.168.66.235:5001'
    ];
    
    console.log('Starting BP Monitor service discovery...');
    
    for (const url of monitorURLs) {
        try {
            console.log(`Trying BP Monitor at: ${url}`);
            const response = await fetch(`${url}/health`, { 
                method: 'GET',
                timeout: 3000 
            });
            if (response.ok) {
                const data = await response.json();
                console.log(`Health response from ${url}:`, data);
                if (data.service === 'bp-monitor-microservice') {
                    console.log(`✅ Found BP Monitor microservice at: ${url}`);
                    localStorage.setItem('bp_monitor_url', url);
                    return url;
                }
            }
        } catch (error) {
            console.debug(`❌ BP Monitor not available at ${url}:`, error.message);
        }
    }
    
    // Fallback to main backend
    console.log('❌ BP Monitor microservice not found, using main backend');
    return localStorage.getItem('backend_url') || potentialSocketURLs[0];
}

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
export async function initializeSocket(namespace = 'chat') {
    let token = getAuthToken();
    
    // For monitor namespace, NEVER use token (BP monitor doesn't require auth)
    if (namespace === 'monitor') {
        console.log('Monitor namespace detected - connecting without authentication');
        token = null;
    } else if (!token) {
        console.error('No authentication token found and required for namespace:', namespace);
        return null;
    }
    
    const namespaceUrl = namespace === 'chat' ? '/chat' : 
                          namespace === 'monitor' ? '/monitor' : '';
    
    if (socketInstances[namespace] && socketInstances[namespace].connected) {
        return socketInstances[namespace];
    }
    
    clearTimeout(reconnectTimers[namespace]);
    
    // Get appropriate backend URL based on namespace
    let savedBackendURL;
    if (namespace === 'monitor') {
        // Try to discover BP Monitor microservice
        savedBackendURL = await discoverBPMonitorService();
    } else {
        // Use main backend for chat
        savedBackendURL = localStorage.getItem('backend_url') || potentialSocketURLs[0];
    }
    
    // Disconnect existing socket if any
    if (socketInstances[namespace]) {
        socketInstances[namespace].disconnect();
        socketInstances[namespace] = null;
    }
    
    console.log(`Initializing ${namespace} socket connection${token ? ' with token' : ' without token'} to ${savedBackendURL}`);
    
    // Create socket connection - conditionally include auth based on token availability
    const socketOptions = {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
    };
    
    // Only add auth headers if token is available
    if (token) {
        const socketUrl = `${savedBackendURL}${namespaceUrl}?token=${encodeURIComponent(token.replace('Bearer ', ''))}`;
        socketOptions.withCredentials = true;
        socketOptions.extraHeaders = {
            Authorization: token
        };
        socketOptions.auth = {
            token: token
        };
        socketOptions.transportOptions = {
            polling: {
                extraHeaders: {
                    Authorization: token
                }
            }
        };
        socketInstances[namespace] = io(socketUrl, socketOptions);
    } else {
        // Connect without authentication for monitor namespace
        const socketUrl = `${savedBackendURL}${namespaceUrl}`;
        console.log(`Connecting to monitor namespace at: ${socketUrl}`);
        socketInstances[namespace] = io(socketUrl, socketOptions);
    }
    
    // Reset reconnect attempts on new connection
    reconnectAttempts[namespace] = 0;
    
    // Set up connection event handlers
    socketInstances[namespace].on('connect', () => {
        console.log(`${namespace} socket connected successfully to ${savedBackendURL}`);
        console.log(`${namespace} socket ID: ${socketInstances[namespace].id}`);
        reconnectAttempts[namespace] = 0;
    });
    
    socketInstances[namespace].on('connect_error', (error) => {
        console.error(`${namespace} socket connection error:`, error);
        console.error(`Error details:`, error.message, error.description, error.type, error.context);
        
        // For monitor namespace without token, try different approaches
        if (namespace === 'monitor' && !token) {
            if (reconnectAttempts[namespace] < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts[namespace]++;
                console.log(`Scheduling reconnect attempt ${reconnectAttempts[namespace]}/${MAX_RECONNECT_ATTEMPTS} for ${namespace}`);
                clearTimeout(reconnectTimers[namespace]);
                reconnectTimers[namespace] = setTimeout(() => {
                    console.log(`Attempting reconnect ${reconnectAttempts[namespace]} for ${namespace}`);
                    initializeSocket(namespace);
                }, 3000 * reconnectAttempts[namespace]);
            }
            return;
        }
        
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

// Function to ensure socket is ready for a specific namespace
export async function ensureSocketReady(namespace = 'chat') {
    if (!socketInstances[namespace] || !socketInstances[namespace].connected) {
        return await initializeSocket(namespace);
    }
    return socketInstances[namespace];
}

// Get socket or initialize a new one
export async function getSocket(namespace = 'chat') {
    if (!socketInstances[namespace] || !socketInstances[namespace].connected) {
        return await initializeSocket(namespace);
    }
    return socketInstances[namespace];
}

// Synchronous version - returns existing socket or null
export function getSocketSync(namespace = 'chat') {
    return socketInstances[namespace] && socketInstances[namespace].connected ? 
           socketInstances[namespace] : null;
}

// Function to specifically get the monitor socket 
export async function getMonitorSocket() {
    console.log("Getting monitor socket. Current status:", 
                socketInstances.monitor ? 
                (socketInstances.monitor.connected ? "Connected" : "Disconnected") : 
                "Not initialized");
    return await ensureSocketReady('monitor');
}

// Synchronous version for monitor socket
export function getMonitorSocketSync() {
    return socketInstances.monitor && socketInstances.monitor.connected ? 
           socketInstances.monitor : null;
}

// Join a chat room
export async function joinRoom(roomId) {
    const socket = await getSocket('chat');
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
export async function leaveRoom(roomId) {
    const socket = await getSocket('chat');
    if (socket && socket.connected) {
        socket.emit('leave', { room: roomId });
    } else {
        console.error('Cannot leave room: Socket not connected');
    }
}

// Send a message
export async function sendMessage(roomId, content) {
    const socket = await getSocket('chat');
    if (socket && socket.connected) {
        socket.emit('message', { room: roomId, content });
    } else {
        console.error('Cannot send message: Socket not connected');
    }
}

// Listen for new messages
export async function onNewMessage(cb) {
    const socket = await getSocket('chat');
    if (socket) socket.on('new_message', cb);
}

// Listen for status updates
export async function onStatus(cb) {
    const socket = await getSocket('chat');
    if (socket) socket.on('status', cb);
}

// Add throttling for typing events
let typingThrottleTimers = {};

export async function sendTyping(roomId, isTyping) {
    const socket = await getSocket('chat');
    if (!socket || !socket.connected) {
        return false;
    }

    const throttleKey = `${roomId}_typing`;
    
    // If the status is the same and throttled, skip update
    if (typingThrottleTimers[throttleKey]) {
        return true;
    }

    socket.emit('typing', { room: roomId, isTyping });
    
    // Only throttle if user is typing
    // Allow immediate update when stopping typing
    if (isTyping) {
        typingThrottleTimers[throttleKey] = setTimeout(() => {
            delete typingThrottleTimers[throttleKey];
        }, 2000);
    }

    return true;
}

export async function onTyping(cb) {
    const socket = await getSocket('chat');
    if (socket) socket.on('typing_status', cb);
    return () => {
        if (socket) socket.off('typing_status', cb);
    };
}

// Monitor-specific events - use synchronous socket access for event handlers
export function onBPReading(cb) {
    const setupListener = async () => {
        const socket = await getSocket('monitor');
        if (socket) {
            console.log("Registering onBPReading listener on monitor socket");
            socket.on('new_bp_reading', cb);
            return () => {
                if (socket) socket.off('new_bp_reading', cb);
            };
        } else {
            console.error("Failed to register onBPReading: No socket available");
            return () => {};
        }
    };
    
    // For immediate use, try sync version first
    const socket = getSocketSync('monitor');
    if (socket) {
        console.log("Registering onBPReading listener on monitor socket (sync)");
        socket.on('new_bp_reading', cb);
        return () => {
            if (socket) socket.off('new_bp_reading', cb);
        };
    } else {
        // If no sync socket, set up async
        let cleanup = () => {};
        setupListener().then(cleanupFn => {
            cleanup = cleanupFn;
        });
        return () => cleanup();
    }
}

export function onPrediction(cb) {
    const setupListener = async () => {
        const socket = await getSocket('monitor');
        if (socket) {
            console.log("Registering onPrediction listener on monitor socket");
            socket.on('prediction_result', cb);
            return () => {
                if (socket) socket.off('prediction_result', cb);
            };
        } else {
            console.error("Failed to register onPrediction: No socket available");
            return () => {};
        }
    };
    
    // For immediate use, try sync version first
    const socket = getSocketSync('monitor');
    if (socket) {
        console.log("Registering onPrediction listener on monitor socket (sync)");
        socket.on('prediction_result', cb);
        return () => {
            if (socket) socket.off('prediction_result', cb);
        };
    } else {
        // If no sync socket, set up async
        let cleanup = () => {};
        setupListener().then(cleanupFn => {
            cleanup = cleanupFn;
        });
        return () => cleanup();
    }
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

    Object.keys(typingThrottleTimers).forEach(key => {
        clearTimeout(typingThrottleTimers[key]);
    });
    typingThrottleTimers = {};
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
