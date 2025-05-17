import React, { useState, useEffect } from "react";
import { 
  Search, 
  MessageSquare, 
  Users, 
  Phone, 
  Settings, 
  Bell, 
  ChevronLeft, 
  MoreVertical, 
  Filter, 
  Plus, 
  CheckCheck, 
  Circle,
  X
} from "lucide-react";
import api from "../services/api";

export default function ChatSidebar({ onChatSelect, selectedChatId, isMobile, onClose, onNewChat, onNewContact, chatRooms = [] }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [localChatRooms, setLocalChatRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch chat rooms and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch chat rooms if not provided as prop
        if (chatRooms.length === 0) {
          const roomsData = await api.listChatRooms();
          processRoomsData(roomsData);
        } else {
          processRoomsData(chatRooms);
        }
        
        // Fetch users from the chat API endpoint
        try {
          const usersData = await api.get('/api/chat/users');
          setUsers(usersData.map(user => ({
            id: user.id,
            name: user.name || user.username,
            avatar: user.name ? user.name.substring(0, 2).toUpperCase() : 'U',
            status: user.isOnline ? "online" : "offline",
            role: user.role || "User",
            lastSeen: user.lastSeen || "Unknown",
            email: user.email
          })));
        } catch (error) {
          console.error("Error fetching users:", error);
          setError("Could not load users list");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Could not load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process incoming chat rooms data
  const processRoomsData = (roomsData) => {
    const processed = roomsData.map(room => ({
      id: room.id,
      name: room.name || `Chat ${room.id}`,
      avatar: room.name ? room.name.substring(0, 2).toUpperCase() : 'CH',
      lastMessage: room.lastMessage?.content || "No messages yet",
      timestamp: room.lastMessage?.timestamp 
        ? formatTimestamp(new Date(room.lastMessage.timestamp))
        : "New",
      unread: room.unreadCount || 0,
      status: room.isActive ? "online" : "offline"
    }));

    // Sort by most recent message
    const sortedRooms = [...processed].sort((a, b) => {
      if (a.timestamp === "New") return 1;
      if (b.timestamp === "New") return -1;
      
      // Try to parse the timestamp if not a Date object
      const aDate = a.timestamp instanceof Date ? a.timestamp : new Date();
      const bDate = b.timestamp instanceof Date ? b.timestamp : new Date();
      
      return bDate - aDate;
    });
    
    setLocalChatRooms(sortedRooms);
  };

  // Update local chat rooms when the prop changes
  useEffect(() => {
    if (chatRooms && chatRooms.length > 0) {
      processRoomsData(chatRooms);
    }
  }, [chatRooms]);

  // Filter chats and users based on search query
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      setFilteredChats(
        localChatRooms.filter(chat => 
          chat.name.toLowerCase().includes(query) || 
          chat.lastMessage.toLowerCase().includes(query)
        )
      );
      
      setFilteredUsers(
        users.filter(user => 
          user.name.toLowerCase().includes(query) || 
          (user.email && user.email.toLowerCase().includes(query)) ||
          (user.role && user.role.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredChats(localChatRooms);
      setFilteredUsers(users);
    }
  }, [searchQuery, localChatRooms, users]);

  // Helper function to format timestamps
  const formatTimestamp = (date) => {
    if (!date || isNaN(date.getTime())) return "Unknown";
    
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
    }
  };

  // Handle creating a new chat with a user from the users tab
  const handleUserChatSelection = (user) => {
    // Try to find an existing direct chat with this user
    const existingChat = localChatRooms.find(chat => 
      chat.name === user.name || 
      chat.name === user.username
    );
    
    if (existingChat) {
      handleChatSelect(existingChat.id);
    } else {
      // Create a new chat with this user
      onNewChat && onNewChat();
      // Pre-select this user in the modal
      // This would require modifying the UserSelectionModal component
      // to accept a preselectedUser prop
    }
  };

  const handleChatSelect = (chatId) => {
    if (onChatSelect) {
      onChatSelect(chatId);
      if (isMobile && onClose) {
        onClose();
      }
    }
  };

  const getActiveUsers = () => {
    return users.filter(user => user.status === "online").length;
  };

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${isMobile ? "w-full" : "w-96"}`}>
      {/* Header with tabs */}
      <div className="bg-violet-600 text-white px-4 py-3 flex items-center justify-between h-16">
        {isMobile && (
          <button 
            className="mr-2 text-white hover:bg-violet-700 p-1 rounded-full" 
            onClick={onClose}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h2 className="font-semibold text-xl">PulseChat</h2>
        <div className="flex items-center space-x-2">
          <button className="text-white hover:bg-violet-700 p-1 rounded-full">
            <Bell size={20} />
          </button>
          <button className="text-white hover:bg-violet-700 p-1 rounded-full">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-gray-100 pl-10 pr-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Search messages or users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setSearchQuery("")}
            >
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm flex items-center justify-center ${
            activeTab === "chats"
              ? "text-violet-600 border-b-2 border-violet-600"
              : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("chats")}
        >
          <MessageSquare size={18} className="mr-2" />
          Chats
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm flex items-center justify-center ${
            activeTab === "users"
              ? "text-violet-600 border-b-2 border-violet-600"
              : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={18} className="mr-2" />
          Users <span className="ml-1 bg-violet-100 text-violet-600 rounded-full text-xs px-2 py-0.5">{getActiveUsers()}</span>
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full mb-2"></div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-violet-600 hover:underline"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            {activeTab === "chats" && (
              <div className="divide-y divide-gray-200">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? "No chats match your search" : "No chats found"}
                    <button 
                      className="block mx-auto mt-2 text-violet-600 hover:underline"
                      onClick={onNewChat}
                    >
                      Start a new chat
                    </button>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 flex items-center hover:bg-gray-50 cursor-pointer ${
                        selectedChatId === chat.id ? "bg-violet-50" : ""
                      }`}
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-violet-400 flex items-center justify-center mr-3">
                          <span className="text-white font-medium">{chat.avatar}</span>
                        </div>
                        {chat.status === "online" && (
                          <div className="absolute bottom-0 right-2 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900 truncate">
                            {chat.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {chat.timestamp}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-500 truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unread > 0 && (
                            <div className="bg-violet-600 text-white rounded-full h-5 min-w-5 px-1.5 text-xs flex items-center justify-center">
                              {chat.unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === "users" && (
              <div className="divide-y divide-gray-200">
                <div className="p-2 bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center">
                    <Filter size={16} className="text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">Filter</span>
                  </div>
                  <div className="flex items-center">
                    <Circle size={8} className="text-green-500 mr-1" />
                    <span className="text-sm text-gray-600">Online: {getActiveUsers()}</span>
                  </div>
                </div>
                
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? "No users match your search" : "No users found"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserChatSelection(user)}
                    >
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-violet-400 flex items-center justify-center mr-3">
                          <span className="text-white font-medium">{user.avatar}</span>
                        </div>
                        {user.status === "online" && (
                          <div className="absolute bottom-0 right-2 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <span className="text-xs text-gray-500">{user.lastSeen}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {user.email || user.role || "User"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button 
          className="bg-violet-600 text-white rounded-full w-full py-2 font-medium flex items-center justify-center hover:bg-violet-700 transition"
          onClick={() => {
            if (activeTab === "chats") {
              onNewChat && onNewChat();
            } else {
              onNewContact && onNewContact();
            }
          }}
        >
          <Plus size={18} className="mr-2" />
          {activeTab === "chats" ? "New Chat" : "New Contact"}
        </button>
      </div>
    </div>
  );
}