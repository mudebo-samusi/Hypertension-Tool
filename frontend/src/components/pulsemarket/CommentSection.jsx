
import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

const CommentSection = ({ postId, postType, initialCommentCount }) => {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        // In a real app, you would fetch from your backend
        // const response = await api.get(`/${postType}s/${postId}/comments`);
        
        // For demo, we'll create mock data
        const mockComments = [
          {
            id: 1,
            author: { id: 3, name: "Alice Johnson", avatar: "https://via.placeholder.com/40" },
            content: "This is really helpful information, thanks for sharing!",
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 2,
            author: { id: 4, name: "Bob Williams", avatar: "https://via.placeholder.com/40" },
            content: "I've been looking for something like this. Great post!",
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        
        setComments(mockComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComments();
  }, [postId, postType]);
  
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      // In a real app, you would post to your backend
      // const response = await api.post(`/${postType}s/${postId}/comments`, { content: newComment });
      
      // For demo, we'll create mock data
      const mockComment = {
        id: Date.now(),
        author: {
          id: user.id,
          name: user.name || 'Current User',
          avatar: user.avatar || 'https://via.placeholder.com/40'
        },
        content: newComment,
        createdAt: new Date().toISOString()
      };
      
      setComments([mockComment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <h4 className="font-medium text-gray-700 mb-3">Comments</h4>
      
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-4 flex items-start space-x-2">
          <img 
            src={user.avatar || 'https://via.placeholder.com/40'} 
            alt={user.name} 
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
                src={comment.author.avatar} 
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
                  <button className="hover:text-violet-600">Like</button>
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

export default CommentSection;