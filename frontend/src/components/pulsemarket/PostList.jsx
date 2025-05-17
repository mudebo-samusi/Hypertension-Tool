import React, { useState, useEffect } from 'react';
import Post from './Post';
import api from '../../services/api';

const PostList = ({ onNewPost }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const postsData = await api.getPosts();
        setPosts(postsData);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);
  
  // Add a function to handle new posts
  const addNewPost = (newPost) => {
    // Check if post has necessary fields and prepare for display
    if (newPost) {
      // Get current user for author info
      const currentUser = api.getCurrentUser();
      
      // Prepare post for display if it doesn't have all required fields
      const formattedPost = {
        ...newPost,
        userLiked: false,
        likes: newPost.likes || 0,
        comments: newPost.comments || 0,
        createdAt: newPost.createdAt || new Date().toISOString(),
        author: newPost.author || {
          id: currentUser?.id,
          name: currentUser?.username || 'User',
          avatar: currentUser?.profile_image
        }
      };
      
      setPosts(prevPosts => [formattedPost, ...prevPosts]);
    }
  };

  // Pass the addNewPost function up via callback if provided
  useEffect(() => {
    if (onNewPost) {
      onNewPost(addNewPost);
    }
  }, [onNewPost]);

  const handleLikeToggle = async (postId) => {
    try {
      const response = await api.togglePostLike(postId);
      // Update the posts state with the updated like count and liked status from response
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              userLiked: response.liked, 
              likes: response.count 
            } 
          : post
       ));
      return response; // Return backend response for child to update its state
    } catch (error) {
      console.error('Error toggling like:', error);
      return null;
    }
  };

  // Add a handler for comment count updates
  const handleCommentCountChange = (postId, newCount) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            comments: newCount 
          } 
        : post
    ));
  };

  if (loading) return <div className="text-center py-6">Loading posts...</div>;
  if (error) return <div className="text-center py-6 text-red-500">{error}</div>;
  if (posts.length === 0) return <div className="text-center py-6">No posts yet. Be the first to post!</div>;

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <Post 
          key={post.id} 
          post={post} 
          onLikeToggle={handleLikeToggle}
          onCommentCountChange={handleCommentCountChange}
        />
      ))}
    </div>
  );
};

export default PostList;