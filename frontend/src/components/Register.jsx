import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    additionalInfo: {}, // Store role-specific data
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('additionalInfo.')) {
      const key = name.split('.')[1];
      setFormData({
        ...formData,
        additionalInfo: {
          ...formData.additionalInfo,
          [key]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
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

      // Check for internet connectivity
      if (!navigator.onLine) {
        setError('You appear to be offline. Please check your internet connection.');
        return;
      }

      // Use api.register method with better error handling
      const response = await api.register(formData);

      // Check the success flag in the response
      if (response.success) {
        if (response.temp_token) {
          await api.assignTemporaryToken(response.temp_token);
        }
        // Registration successful, navigate to subscriptions
        navigate('/subscriptions');
      } else {
        // Server returned a structured error
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Display a user-friendly error message
      if (error.message && error.message.includes('Cannot connect to the server')) {
        setError('Cannot connect to the server. Please check that the backend server is running.');
      } else {
        // Display error message from the server or a default message
        setError(error.message || 'Registration failed. Please try again.');
      }
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
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
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
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <select
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              name="role"
              value={formData.role || ''}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select Role</option>
              <option value="Doctor">Doctor</option>
              <option value="Care Taker">Care Taker</option>
              <option value="Patient">Patient</option>
              <option value="Organization">Organization</option>
            </select>
          </div>
          {formData.role === 'Care Taker' && (
            <div>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                name="additionalInfo.patientId"
                placeholder="Patient ID"
                value={formData.additionalInfo.patientId || ''}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {formData.role === 'Doctor' && (
            <div>
              <select
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                name="additionalInfo.type"
                value={formData.additionalInfo.type || ''}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Doctor Type</option>
                <option value="Private">Private</option>
                <option value="Organizational">Organizational</option>
              </select>
            </div>
          )}
          {formData.role === 'Doctor' && formData.additionalInfo.type === 'Organizational' && (
            <div>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                name="additionalInfo.hospitalName"
                placeholder="Hospital/Clinic Name"
                value={formData.additionalInfo.hospitalName || ''}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {formData.role === 'Patient' && (
            <div>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                name="additionalInfo.caretakerId"
                placeholder="Caretaker ID"
                value={formData.additionalInfo.caretakerId || ''}
                onChange={handleChange}
                required
              />
            </div>
          )}
          {formData.role === 'Organization' && (
            <div>
              <input
                type="text"
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                name="additionalInfo.organizationType"
                placeholder="Organization Type (e.g., Hospital, Clinic)"
                value={formData.additionalInfo.organizationType || ''}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div>
            <input
              type="password"
              className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-violet-500 text-white py-2 sm:py-2.5 px-4 text-sm sm:text-base rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 transition-colors duration-200"
          >
            Register
          </button>
        </form>
        <div className="mt-4 text-center text-sm sm:text-base">
          Already have an account? <Link to="/login" className="text-violet-500 hover:text-violet-600">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;