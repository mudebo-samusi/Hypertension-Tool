
import React, { useState, useContext } from 'react';
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
  const [adImage, setAdImage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // In a real app, you would post to your backend
      // const response = await api.post("/posts", { content });
      
      // For demo, we'll create mock data
      const newPost = {
        id: Date.now(),
        author: {
          id: user.id,
          name: user.name || 'Current User',
          avatar: user.avatar || 'https://via.placeholder.com/40'
        },
        content: content,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        userLiked: false
      };

      // If this is an ad, add the ad-specific fields
      if (isAd) {
        // In a real app, you'd post to a different endpoint
        // const adResponse = await api.post("/ads", { content, title: adTitle, link: adLink, image: adImage });
        
        const newAd = {
          id: Date.now(),
          sponsor: user.name || 'Current User',
          title: adTitle,
          content: content,
          image: adImage || 'https://via.placeholder.com/300x150',
          link: adLink || '#',
          createdAt: new Date().toISOString(),
          likes: 0,
          comments: 0,
          userLiked: false
        };
        
        onPostCreated(newAd);
      } else {
        onPostCreated(newPost);
      }
      
      setContent('');
      setAdTitle('');
      setAdLink('');
      setAdImage('');
      setIsAd(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
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
              Image URL
            </label>
            <input
              type="url"
              id="adImage"
              value={adImage}
              onChange={(e) => setAdImage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="https://example.com/image.jpg"
            />
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