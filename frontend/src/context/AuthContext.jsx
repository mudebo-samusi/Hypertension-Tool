import React from 'react';
import { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { initializeSocket, disconnect } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    // Initialize user state from localStorage if available
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Set up API auth token whenever user changes
  useEffect(() => {
    // Update API authentication headers when token changes
    const token = localStorage.getItem('access_token');
    if (token) {
      api.setAuthToken(token);
      
      // Initialize socket connection when user is authenticated
      initializeSocket();
    } else {
      api.clearAuthToken();
      
      // Disconnect socket when token is cleared
      disconnect();
    }
  }, [user]);

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      const response = await api.login(username, password);
      
      // Check if user is active before proceeding
      if (response.user && response.user.hasOwnProperty('is_active') && !response.user.is_active) {
        return { 
          success: false, 
          error: 'Your account is inactive. Please contact support to activate your account.'
        };
      }
      
      // Store user data in state and localStorage
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store access token if it exists
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        api.setAuthToken(response.access_token); // Update API token immediately
        
        // Initialize socket connection with new token
        initializeSocket();
      }
      
      navigate('/'); // Redirect to home page after login
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    // Disconnect socket before clearing auth data
    disconnect();
    
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    api.clearAuthToken(); // Clear API token on logout
    navigate('/login');
  };

  const register = async (userData) => {
    try {
      const response = await api.register(userData);
      if (response.access_token) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const value = {
    user,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
