import React from 'react';
import { createContext, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    // Initialize user state from localStorage if available
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      const response = await api.login(username, password);
      
      // Store user data in state and localStorage
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store access token if it exists
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
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
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
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
