
import React, { useState } from 'react';
import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import { formatDistanceToNow } from 'date-fns';

const Post = ({ post, onLikeToggle }) => {
  const [showComments, setShowComments] = useState(false);
  
  return (
    <div className="bg-white rounded-xl shadow-md p-4 transition hover:shadow-lg">
      <div className="flex items-start space-x-3">
        <img 
          src={post.author.avatar} 
          alt={post.author.name} 
          className="w-10 h-10 rounded-full object-cover" 
        />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-semibold">{post.author.name}</h3>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-gray-700 mb-3">{post.content}</p>
          
          <div className="flex items-center space-x-4 text-gray-500 pt-2 border-t border-gray-100">
            <LikeButton 
              liked={post.userLiked} 
              count={post.likes} 
              onToggle={onLikeToggle} 
            />
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 hover:text-violet-600 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span>{post.comments}</span>
            </button>
            
            <button className="flex items-center space-x-1 hover:text-violet-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
          
          {showComments && (
            <CommentSection 
              postId={post.id} 
              postType="post"
              initialCommentCount={post.comments}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Post;