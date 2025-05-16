import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../../context/AuthContext";
import CreatePostForm from "./CreatePostForm";
import Post from "./Post";
import Ad from "./Ad";
import api from "../../services/api";

const PulseMarket = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "posts", "ads"

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        
        // Get authentication token if required
        const token = localStorage.getItem('access_token');
        
        const postsResponse = await api.get("/api/posts", null, !!token);
        const adsResponse = await api.get("/api/ads", null, !!token);
        
        // Process and validate response data
        const processedPosts = Array.isArray(postsResponse) ? postsResponse.map(post => ({
          ...post,
          createdAt: post.createdAt || new Date().toISOString() // Ensure valid date
        })) : [];
        
        const processedAds = Array.isArray(adsResponse) ? adsResponse.map(ad => ({
          ...ad,
          createdAt: ad.createdAt || new Date().toISOString() // Ensure valid date
        })) : [];
        
        setPosts(processedPosts);
        setAds(processedAds);
      } catch (error) {
        console.error("Error fetching content:", error);
        // For demo, add sample data
        setPosts([
          {
            id: 1,
            author: { id: 1, name: "Jane Doe", avatar: "https://via.placeholder.com/40" },
            content: "Just measured my blood pressure: 120/80. Making progress!",
            createdAt: new Date().toISOString(),
            likes: 24,
            comments: 3,
            userLiked: false
          },
          {
            id: 2,
            author: { id: 2, name: "John Smith", avatar: "https://via.placeholder.com/40" },
            content: "Found a great low-sodium recipe that actually tastes good! Who wants me to share it?",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            likes: 42,
            comments: 7,
            userLiked: true
          }
        ]);
        setAds([
          {
            id: 101,
            sponsor: "HealthTech Inc.",
            title: "New BP Monitor",
            content: "Try our new smart blood pressure monitor with cloud sync and doctor sharing features!",
            image: "https://via.placeholder.com/300x150",
            link: "https://example.com/monitor",
            createdAt: new Date().toISOString(),
            likes: 8,
            comments: 2,
            userLiked: false
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setShowCreateForm(false);
  };

  const handleLikeToggle = async (id, type) => {
    try {
      // In a real app, this would be an API call to toggle like status
      if (type === 'post') {
        setPosts(posts.map(post => 
          post.id === id ? { ...post, likes: post.userLiked ? post.likes - 1 : post.likes + 1, userLiked: !post.userLiked } : post
        ));
      } else {
        setAds(ads.map(ad => 
          ad.id === id ? { ...ad, likes: ad.userLiked ? ad.likes - 1 : ad.likes + 1, userLiked: !ad.userLiked } : ad
        ));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // Combine and sort posts and ads by date if on "all" tab
  const combinedContent = activeTab === "all" 
    ? [...posts, ...ads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : activeTab === "posts" ? posts : ads;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-violet-700 mb-2">PulseMarket</h1>
        <p className="text-gray-600">Connect with the hypertension community</p>
      </div>

      {user && (
        <div className="mb-6">
          {!showCreateForm ? (
            <button 
              onClick={() => setShowCreateForm(true)}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition duration-200"
            >
              Share something...
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-4 mb-4">
              <CreatePostForm 
                onPostCreated={handlePostCreated} 
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4">
          <button 
            className={`px-4 py-2 font-medium ${activeTab === 'all' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 hover:text-violet-500'}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`px-4 py-2 font-medium ${activeTab === 'posts' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 hover:text-violet-500'}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button 
            className={`px-4 py-2 font-medium ${activeTab === 'ads' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500 hover:text-violet-500'}`}
            onClick={() => setActiveTab('ads')}
          >
            Sponsored
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-700"></div>
        </div>
      ) : combinedContent.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No content found. Be the first to post!
        </div>
      ) : (
        <div className="space-y-4">
          {combinedContent.map(item => {
            if ('author' in item) {
              return (
                <Post 
                  key={`post-${item.id}`} 
                  post={item} 
                  onLikeToggle={() => handleLikeToggle(item.id, 'post')} 
                />
              );
            } else {
              return (
                <Ad 
                  key={`ad-${item.id}`} 
                  ad={item} 
                  onLikeToggle={() => handleLikeToggle(item.id, 'ad')} 
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default PulseMarket;