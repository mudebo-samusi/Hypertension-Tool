import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Import the API service

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: '',
    profileImage: '' // Add field to store the current profile image URL
    // Initialize with only the fields that backend provides
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null); // New state for the file
  const [imagePreview, setImagePreview] = useState(null); // New state for image preview

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Use the API service instead of direct axios call
        const data = await api.getProfile();
        setProfileData(data);
        // Set initial image preview if profileImage exists
        if (data.profileImage) {
          // Assuming profileImage is a URL accessible by the browser
          // If it's just a filename, you might need to construct the full URL
          setImagePreview(data.profileImage); 
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        
        // Add more user feedback about the error
        setMessage(error.response?.data?.error || 
                  'Failed to load profile. Please try logging in again.');
                
        // If there's an authentication issue, redirect to login
        if (error.response?.status === 401 || error.response?.status === 422) {
          // Wait briefly to show the error message before redirecting
          setTimeout(() => {
            window.location.href = '/login?expired=true';
          }, 1500);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };

  // New function to handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      // Create a FormData object to handle file upload along with other data
      const formData = new FormData();
      
      // Append text data
      formData.append('name', profileData.name);
      formData.append('email', profileData.email);
      // Role is read-only, typically not sent for update unless needed by backend
      // formData.append('role', profileData.role); 
      
      // Append the image file if a new one was selected
      if (imageFile) {
        formData.append('profileImage', imageFile);
      }
      
      // Use a potentially new API service method designed for FormData/multipart uploads
      // If your existing updateProfile handles FormData, you can use it.
      // Otherwise, create a new one like updateProfileWithImage.
      await api.updateProfile(formData); // Or api.updateProfileWithImage(formData)
      
      setMessage('Profile updated successfully!');
      // Optionally, refetch profile data to get the updated image URL if backend returns it
      // const updatedData = await api.getProfile();
      // setProfileData(updatedData);
      // if (updatedData.profileImage) setImagePreview(updatedData.profileImage);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile. Please try again.');
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
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-6 space-y-4">
          {/* Image Preview */}
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
          
          {/* Image Upload Input */}
          <div>
            <label htmlFor="profileImageInput" className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Change Picture
            </label>
            <input
              type="file"
              id="profileImageInput"
              name="profileImage"
              accept="image/png, image/jpeg, image/jpg" // Specify acceptable image types
              onChange={handleImageChange}
              className="sr-only" // Hide the default file input visually
            />
            <p className="mt-2 text-xs text-gray-500">PNG, JPG up to 2MB</p> 
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profileData.name || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileData.email || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Role field */}
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
            <p className="mt-1 text-xs text-gray-500">Role cannot be changed</p>
          </div>
        </div>
        
        <div className="flex justify-end pt-4"> {/* Added padding top */}
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto"
          >
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
