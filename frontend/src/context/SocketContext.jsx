import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { initializeSocket, disconnect, reconnect, isConnected } from '../services/socket';
import AuthContext from './AuthContext';

export const SocketContext = createContext({
  connected: {
    chat: false,
    monitor: false
  },
  reconnect: () => {},
});

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [connected, setConnected] = useState({
    chat: false,
    monitor: false
  });
  
  useEffect(() => {
    // Initialize sockets when user is authenticated
    if (user) {
      // Initialize chat socket
      const chatSocket = initializeSocket('chat');
      if (chatSocket) {
        chatSocket.on('connect', () => {
          setConnected(prev => ({ ...prev, chat: true }));
        });
        
        chatSocket.on('disconnect', () => {
          setConnected(prev => ({ ...prev, chat: false }));
        });
      }
      
      // Initialize monitor socket
      const monitorSocket = initializeSocket('monitor');
      if (monitorSocket) {
        monitorSocket.on('connect', () => {
          setConnected(prev => ({ ...prev, monitor: true }));
        });
        
        monitorSocket.on('disconnect', () => {
          setConnected(prev => ({ ...prev, monitor: false }));
        });
      }
      
      // Set initial connection status
      setConnected({
        chat: isConnected('chat'),
        monitor: isConnected('monitor')
      });
    } else {
      // Clean up sockets when user logs out
      disconnect();
      setConnected({ chat: false, monitor: false });
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [user]);
  
  const handleReconnect = (namespace = 'chat') => {
    const socket = reconnect(namespace);
    
    if (namespace === 'chat') {
      setConnected(prev => ({ ...prev, chat: !!socket && socket.connected }));
    } else if (namespace === 'monitor') {
      setConnected(prev => ({ ...prev, monitor: !!socket && socket.connected }));
    }
    
    return !!socket;
  };
  
  return (
    <SocketContext.Provider value={{ 
      connected, 
      reconnect: handleReconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export default SocketContext;