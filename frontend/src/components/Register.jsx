import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ''  // Added role to initial state
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      if (!formData.email || !formData.email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
      
      if (!formData.role) {
        setError('Please select a role');
        return;
      }

      const response = await api.post('/register', formData);
      
      // Check if response status is successful (2xx)
      if (response.status >= 200 && response.status < 300) {
        navigate('/login');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response) {
        // Handle specific error messages from the server
        const errorMessage = error.response.data?.message || 'Registration failed. Please try again.';
        setError(errorMessage);
      } else if (error.request) {
        setError('Cannot connect to server. Please check if the server is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div></div>
        <div className="mb-4">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            name="role"
            value={formData.role || ''}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select Role</option>
            <option value="Doctor">Doctor</option>
            <option value="Care Taker">Care Taker</option>
          </select>
        </div>
        <div className="mb-4">
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Register
        </button>
      </form>
      <div className="mt-4 text-center">
        Already have an account? <Link to="/login" className="text-blue-500 hover:text-blue-600">Login</Link>
      </div>
    </div>
  );
}

export default Register;