import React, { useState, useEffect } from "react";
import { X, Search, UserPlus, Check } from "lucide-react";
import api from "../services/api";

export default function UserSelectionModal({ isOpen, onClose, onCreateChat, preselectedUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatName, setChatName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users from the backend
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use the correct endpoint for fetching users from the chat API
        const response = await api.get('/api/chat/users');
        // Filter out the current user
        const currentUser = api.getCurrentUser();
        const filteredUsers = response.filter(user => 
          user.id !== currentUser?.id
        );
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
    
    // Reset state when modal opens
    if (preselectedUser) {
      setSelectedUsers([preselectedUser.id]);
      setIsGroup(false);
      setChatName(preselectedUser.name || preselectedUser.username || "");
    } else {
      setSelectedUsers([]);
      setChatName("");
      setIsGroup(false);
    }
  }, [isOpen, preselectedUser]);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(search.toLowerCase()) ||
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      // For a direct chat with one user, use their name as the chat name
      let name = chatName.trim();
      if (selectedUsers.length === 1 && !isGroup && !name) {
        const user = users.find(u => u.id === selectedUsers[0]);
        name = user?.name || user?.username || "Chat";
      } else if (!name && isGroup) {
        name = "Group Chat";
      }
      
      await onCreateChat(name, selectedUsers, isGroup);
      onClose();
    } catch (error) {
      console.error("Error creating chat:", error);
      setError("Failed to create chat. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">New Chat</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b">
          {/* Toggle for group chat */}
          <div className="flex items-center mb-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isGroup}
                  onChange={() => setIsGroup(!isGroup)}
                />
                <div className={`block w-10 h-6 rounded-full ${isGroup ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isGroup ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <div className="ml-3 text-gray-700 font-medium">
                Group Chat
              </div>
            </label>
          </div>
          
          {/* Chat name input (only for group chats) */}
          {isGroup && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Enter a name for your group"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
              />
            </div>
          )}
          
          {/* User search input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Display error if any */}
          {error && (
            <div className="mt-2 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
        
        {/* User list */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <li
                  key={user.id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-violet-400 flex items-center justify-center mr-3">
                        <span className="text-white font-medium">
                          {(user.name || user.username || "U").substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{user.name || user.username}</h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div>
                      {selectedUsers.includes(user.id) ? (
                        <div className="h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            disabled={selectedUsers.length === 0}
            className={`px-4 py-2 rounded-md flex items-center ${
              selectedUsers.length === 0 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            <UserPlus size={18} className="mr-2" />
            Create Chat
          </button>
        </div>
      </div>
    </div>
  );
}