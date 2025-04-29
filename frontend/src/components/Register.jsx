import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
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

      // Use api.register method
      const response = await api.register(formData);
      
      // Check the success flag in the response
      if (response.success) {
        // Registration successful, navigate to login
        navigate('/login');
      } else {
        // Server returned a structured error
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Display error message from the server or a default message
      setError(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Register</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 text-sm sm:text-base">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <input
              type="text"
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <input
              type="email"
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <select
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              name="role"
              value={formData.role || ''}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select Role</option>
              <option value="Doctor">Doctor</option>
              <option value="Care Taker">Care Taker</option>
              <option value="Patient">Patient</option>
            </select>
          </div>
          <div>
            <input
              type="password"
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white py-2 sm:py-2.5 px-4 text-sm sm:text-base rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
          >
            Register
          </button>
        </form>
        <div className="mt-4 text-center text-sm sm:text-base">
          Already have an account? <Link to="/login" className="text-blue-500 hover:text-blue-600">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;