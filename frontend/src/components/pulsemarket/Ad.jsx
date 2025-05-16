import React, { useState } from 'react';
import PropTypes from 'prop-types';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

const Ad = ({ ad, onLikeToggle, onCommentCountChange }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(ad.comments);
  
  // Format date with validation
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Recently';
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Recently';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'Recently';
    }
  };

  // Get proper avatar and image URLs
  const profileImageUrl = ad.sponsorProfileImage && ad.sponsorProfileImage.trim() !== '' 
    ? api.getFullImageUrl(ad.sponsorProfileImage)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(ad.sponsor)}&background=8b5cf6&color=fff`;
  
  // Only set adImageUrl if image exists and is not empty
  const adImageUrl = ad.image && ad.image.trim() !== '' ? api.getFullImageUrl(ad.image) : null;

  // Handle comment count updates
  const handleCommentCountChange = (newCount) => {
    setCommentCount(newCount);
    // Propagate to parent if needed
    if (onCommentCountChange) {
      onCommentCountChange(ad.id, newCount);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition hover:shadow-lg border border-violet-100">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <img 
            src={profileImageUrl} 
            alt={ad.sponsor} 
            className="w-10 h-10 rounded-full mr-3 object-cover"
          />
          <div>
            <div className="font-medium">{ad.sponsor}</div>
            <div className="text-xs text-gray-500">{formatDate(ad.createdAt)}</div>
          </div>
          <span className="ml-auto text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded">
            Sponsored
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-1">{ad.title}</h3>
        <p className="text-gray-700 mb-3">{ad.content}</p>
      </div>
      
      {adImageUrl && (
        <div className="w-full h-40 overflow-hidden">
          <img 
            src={adImageUrl} 
            alt={ad.title} 
            className="w-full h-full object-cover transition hover:scale-105"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-gray-500">
            <LikeButton 
              liked={ad.userLiked} 
              count={ad.likes} 
              onToggle={() => onLikeToggle(ad.id)}
            />
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 hover:text-violet-600 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span>{commentCount}</span>
            </button>
          </div>
          
          <a 
            href={ad.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
          >
            Learn More
          </a>
        </div>
        
        {showComments && (
          <CommentSection 
            postId={String(ad.id)} // Ensure postId is a string
            postType="ad"
            initialCommentCount={commentCount}
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </div>
    </div>
  );
};

Ad.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sponsor: PropTypes.string.isRequired,
    sponsorProfileImage: PropTypes.string,
    createdAt: PropTypes.string,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    image: PropTypes.string,
    userLiked: PropTypes.bool.isRequired,
    likes: PropTypes.number.isRequired,
    comments: PropTypes.number.isRequired,
    link: PropTypes.string.isRequired,
  }).isRequired,
  onLikeToggle: PropTypes.func.isRequired,
  onCommentCountChange: PropTypes.func,
};

export default Ad;