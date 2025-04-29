
import React, { useState } from 'react';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import { formatDistanceToNow } from 'date-fns';

const Ad = ({ ad, onLikeToggle }) => {
  const [showComments, setShowComments] = useState(false);
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition hover:shadow-lg border border-violet-100">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded">Sponsored</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-1">{ad.title}</h3>
        <p className="text-gray-700 mb-3">{ad.content}</p>
      </div>
      
      {ad.image && (
        <div className="w-full h-40 overflow-hidden">
          <img 
            src={ad.image} 
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
              onToggle={onLikeToggle} 
            />
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 hover:text-violet-600 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span>{ad.comments}</span>
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
            postId={ad.id} 
            postType="ad"
            initialCommentCount={ad.comments}
          />
        )}
      </div>
    </div>
  );
};

export default Ad;