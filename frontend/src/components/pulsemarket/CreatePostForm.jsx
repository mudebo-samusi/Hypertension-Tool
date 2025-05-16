import React, { useState, useContext, useRef } from 'react';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';

const CreatePostForm = ({ onPostCreated, onCancel }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAdOptions, setShowAdOptions] = useState(false);
  const [isAd, setIsAd] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adImage, setAdImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAdImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAdImage(null);
      setPreviewImage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }
    
    if (isAd && !adTitle.trim()) {
      setError('Ad title cannot be empty');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      let response;
      const currentUser = api.getCurrentUser();
      
      if (isAd) {
        // Use FormData for ads with image upload
        const formData = new FormData();
        formData.append('title', adTitle);
        formData.append('content', content);
        formData.append('link', adLink || '#');
        if (adImage) {
          formData.append('image', adImage);
        }
        response = await api.createAd(formData);
        
        // Format the ad properly if needed
        const adResponse = {
          ...response,
          userLiked: false,
          likes: 0,
          comments: 0,
          // Add missing fields if needed
          sponsor: response.sponsor || currentUser?.username || 'User',
          sponsorProfileImage: response.sponsorProfileImage || currentUser?.profile_image,
          createdAt: response.createdAt || new Date().toISOString()
        };
        
        onPostCreated(adResponse);
      } else {
        response = await api.createPost(content);
        
        // Format the post properly for display
        const postResponse = {
          ...response,
          content: content,
          userLiked: false,
          likes: 0,
          comments: 0,
          createdAt: new Date().toISOString(),
          author: {
            id: currentUser?.id,
            name: currentUser?.username || 'User',
            avatar: currentUser?.profile_image
          }
        };
        
        onPostCreated(postResponse);
      }
      
      // Reset form
      setContent('');
      setAdTitle('');
      setAdLink('');
      setAdImage(null);
      setPreviewImage('');
      setIsAd(false);
      setShowAdOptions(false);
    } catch (err) {
      console.error('Error creating post:', err);
      if (err.response?.status === 405) {
        setError('The requested method is not allowed. Please contact support.');
      } else {
        setError(err.message || 'Failed to create post. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => { setIsAd(false); setShowAdOptions(false); }}
            className={`px-4 py-2 rounded-lg ${!isAd ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Post
          </button>
          <button
            type="button"
            onClick={() => { setIsAd(true); setShowAdOptions(true); }}
            className={`px-4 py-2 rounded-lg ${isAd ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Sponsored
          </button>
        </div>
      </div>

      {showAdOptions && (
        <div className="mb-4 space-y-3">
          <div>
            <label htmlFor="adTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Ad Title
            </label>
            <input
              type="text"
              id="adTitle"
              value={adTitle}
              onChange={(e) => setAdTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Enter ad title"
            />
          </div>
          
          <div>
            <label htmlFor="adLink" className="block text-sm font-medium text-gray-700 mb-1">
              Link URL
            </label>
            <input
              type="url"
              id="adLink"
              value={adLink}
              onChange={(e) => setAdLink(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="https://example.com"
            />
          </div>
          
          <div>
            <label htmlFor="adImage" className="block text-sm font-medium text-gray-700 mb-1">
              Ad Image
            </label>
            <input
              type="file"
              id="adImage"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {previewImage && (
              <div className="mt-2">
                <img src={previewImage} alt="Preview" className="h-32 object-cover rounded-lg" />
                <button 
                  type="button" 
                  className="mt-1 text-red-500 text-sm"
                  onClick={() => {
                    setAdImage(null);
                    setPreviewImage('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="content" className="sr-only">Content</label>
        <textarea
          id="content"
          rows="3"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder={isAd ? "Enter your sponsored message..." : "What's on your mind?"}
          disabled={isSubmitting}
        ></textarea>
        
        {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Posting...
            </span>
          ) : (
            `${isAd ? 'Post Ad' : 'Post'}`
          )}
        </button>
      </div>
    </form>
  );
};

export default CreatePostForm;