
import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const TypingContext = createContext(null);

export const TypingProvider = ({ children }) => {
  const [isTyping, setIsTyping] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const startTyping = useCallback((roomId) => {
    setIsTyping(true);
    setCurrentRoom(roomId);
    
    // Clear existing timeout if any
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      setIsTyping(false);
      setCurrentRoom(null);
    }, 3000); // Stop typing after 3 seconds of inactivity
    
    setTypingTimeout(timeout);
  }, [typingTimeout]);

  const stopTyping = useCallback(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    setIsTyping(false);
    setCurrentRoom(null);
  }, [typingTimeout]);

  return (
    <TypingContext.Provider value={{
      isTyping,
      currentRoom,
      startTyping,
      stopTyping
    }}>
      {children}
    </TypingContext.Provider>
  );
};

TypingProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTyping = () => {
  const context = useContext(TypingContext);
  if (!context) {
    throw new Error('useTyping must be used within a TypingProvider');
  }
  return context;
};

export default TypingContext;