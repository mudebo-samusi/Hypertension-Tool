import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: '',
    profileImage: '',
    // Additional fields will be added dynamically based on role
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getProfile();
        setProfileData(data);
        
        // Set initial image preview if profileImage exists
        if (data.profileImage) {
          // Check if the URL is relative or absolute
          const imageUrl = data.profileImage.startsWith('http') 
            ? data.profileImage 
            : `${api.defaults.baseURL}${data.profileImage}`;
          setImagePreview(imageUrl);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError(error.response?.data?.error || 
                'Failed to load profile. Please try logging in again.');
                
        // Handle authentication issues
        if (error.response?.status === 401 || error.response?.status === 422) {
          setTimeout(() => window.location.href = '/login?expired=true', 1500);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  // New function to handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size exceeds 2MB limit');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    if (!imageFile) {
      setError('Please select an image to upload');
      return;
    }
    
    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      
      const response = await api.updateProfile(formData);
      
      setMessage('Profile picture updated successfully!');
      
      // Update profile image in state if response contains new URL
      if (response.profileImage) {
        setProfileData(prev => ({...prev, profileImage: response.profileImage}));
        
        // Update preview with full URL
        const imageUrl = response.profileImage.startsWith('http') 
          ? response.profileImage 
          : `${api.defaults.baseURL}${response.profileImage}`;
        setImagePreview(imageUrl);
      }
      
      // Clear the file input
      setImageFile(null);
      document.getElementById('profileImageInput').value = '';
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile picture. Please try again.');
    }
  };

  // Function to render role-specific information
  const renderRoleSpecificInfo = () => {
    // Using memo pattern for performance with complex UIs
    switch(profileData.role) {
      case 'doctor':
        return (
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Doctor Information</h3>
            <p><strong>Specialty:</strong> {profileData.doctorType || 'Not specified'}</p>
          </div>
        );
      case 'organization':
        return (
          <div className="bg-purple-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium text-purple-800 mb-2">Organization Information</h3>
            <p><strong>Type:</strong> {profileData.organizationType || 'Not specified'}</p>
            <p><strong>Hospital/Clinic:</strong> {profileData.hospitalName || 'Not specified'}</p>
          </div>
        );
      case 'patient':
        return (
          <div className="bg-green-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium text-green-800 mb-2">Patient Information</h3>
            {profileData.caretakerId && <p><strong>Care Taker Assigned:</strong> Yes</p>}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Your Profile</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {message}
        </div>
      )}
      
      {/* Role-specific information */}
      {renderRoleSpecificInfo()}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-6 space-y-4">
          <div>
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Profile Preview" 
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="profileImageInput" className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Change Picture
            </label>
            <input
              type="file"
              id="profileImageInput"
              name="profileImage"
              accept="image/png, image/jpeg, image/jpg, image/gif"
              onChange={handleImageChange}
              className="sr-only"
            />
            <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p> 
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* All fields are now read-only */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profileData.name || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileData.email || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={profileData.role || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
            />
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto"
            disabled={!imageFile}
          >
            Update Profile Picture
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
