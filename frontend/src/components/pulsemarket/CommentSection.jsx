import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import LikeButton from '../../components/pulsemarket/LikeButton'; // Adjust the path based on the actual location of LikeButton

const CommentSection = ({ postId, postType, initialCommentCount, onCommentCountChange }) => {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Get a proper avatar URL with fallback
  const getAvatarUrl = (avatarPath, name) => {
    if (!avatarPath || avatarPath === '') {
      // Generate a placeholder with the user's initials
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=8b5cf6&color=fff`;
    }
    return api.getFullImageUrl(avatarPath);
  };
  
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        // Use the real API endpoint to fetch comments
        const fetchedComments = await api.getComments(postType, postId);
        setComments(fetchedComments || []);
        
        // Update the comment count in parent component if count has changed
        if (onCommentCountChange && fetchedComments && initialCommentCount !== fetchedComments.length) {
          onCommentCountChange(fetchedComments.length);
        }
        
        setError(null);
      } catch (error) {
        console.error("Error fetching comments:", error);
        setError("Failed to load comments. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComments();
  }, [postId, postType, initialCommentCount, onCommentCountChange]);
  
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // Use the real API endpoint to create a comment
      const createdComment = await api.createComment(postType, postId, newComment);
      
      // Update local state with new comment
      const updatedComments = [createdComment, ...comments];
      setComments(updatedComments);
      setNewComment('');
      
      // Notify parent component about the updated comment count
      if (onCommentCountChange) {
        onCommentCountChange(updatedComments.length);
      }
      
      setError(null);
    } catch (error) {
      console.error("Error posting comment:", error);
      setError("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const response = await api.toggleCommentLike(commentId);
      setComments(comments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              userLiked: response.liked, 
              likes: response.count 
            } 
          : comment
      ));
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };
  
  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <h4 className="font-medium text-gray-700 mb-3">Comments</h4>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-3 text-sm">
          {error}
        </div>
      )}
      
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-4 flex items-start space-x-2">
          <img 
            src={getAvatarUrl(user.avatar, user.name || user.username)} 
            alt={user.name || user.username || 'User'} 
            className="w-8 h-8 rounded-full object-cover" 
          />
          <div className="flex-grow">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Write a comment..."
              rows="1"
              disabled={isSubmitting}
            ></textarea>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-700"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="flex space-x-2">
              <img 
                src={getAvatarUrl(comment.author.avatar, comment.author.name)} 
                alt={comment.author.name} 
                className="w-8 h-8 rounded-full object-cover" 
              />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium text-sm">{comment.author.name}</h5>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                </div>
                <div className="flex mt-1 ml-2 space-x-4 text-xs text-gray-500">
                  <LikeButton 
                    liked={comment.userLiked || false} 
                    count={comment.likes || 0} 
                    onToggle={() => handleCommentLike(comment.id)} 
                  />
                  <button className="hover:text-violet-600">Reply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
CommentSection.propTypes = {
  postId: PropTypes.string.isRequired,
  postType: PropTypes.string.isRequired,
  initialCommentCount: PropTypes.number,
  onCommentCountChange: PropTypes.func
};

CommentSection.defaultProps = {
  initialCommentCount: 0
};

export default CommentSection;