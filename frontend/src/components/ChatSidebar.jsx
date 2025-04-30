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

// Sample data for users and chats
const SAMPLE_USERS = [
  { id: 1, name: "Dr. Smith", avatar: "DS", status: "online", role: "Cardiologist", lastSeen: "Just now" },
  { id: 2, name: "Dr. Johnson", avatar: "DJ", status: "online", role: "Neurologist", lastSeen: "2m ago" },
  { id: 3, name: "Dr. Williams", avatar: "DW", status: "online", role: "Pediatrician", lastSeen: "5m ago" },
  { id: 4, name: "Dr. Brown", avatar: "DB", status: "offline", role: "Dermatologist", lastSeen: "1h ago" },
  { id: 5, name: "Dr. Davis", avatar: "DD", status: "offline", role: "Oncologist", lastSeen: "3h ago" },
  { id: 6, name: "Dr. Miller", avatar: "DM", status: "offline", role: "Orthopedist", lastSeen: "5h ago" },
  { id: 7, name: "Dr. Wilson", avatar: "DW", status: "offline", role: "Psychiatrist", lastSeen: "1d ago" },
];

const SAMPLE_CHATS = [
  { 
    id: 1, 
    name: "Dr. Smith", 
    avatar: "DS", 
    lastMessage: "Patient John Doe needs review", 
    timestamp: "10:30 AM", 
    unread: 2,
    status: "online" 
  },
  { 
    id: 2, 
    name: "Dr. Johnson", 
    avatar: "DJ", 
    lastMessage: "Lab results for patient #4523", 
    timestamp: "9:45 AM", 
    unread: 0,
    status: "online" 
  },
  { 
    id: 3, 
    name: "Dr. Williams", 
    avatar: "DW", 
    lastMessage: "Can you cover my shift tomorrow?", 
    timestamp: "Yesterday", 
    unread: 0,
    status: "online" 
  },
  { 
    id: 4, 
    name: "Dr. Brown", 
    avatar: "DB", 
    lastMessage: "New treatment protocol document", 
    timestamp: "Yesterday", 
    unread: 0,
    status: "offline" 
  },
  { 
    id: 5, 
    name: "Dr. Davis", 
    avatar: "DD", 
    lastMessage: "Emergency meeting at 4pm", 
    timestamp: "Monday", 
    unread: 0,
    status: "offline" 
  },
  { 
    id: 6, 
    name: "Nurse Team", 
    avatar: "NT", 
    lastMessage: "Schedule changes for next week", 
    timestamp: "Sunday", 
    unread: 0,
    status: "offline" 
  },
  { 
    id: 7, 
    name: "Hospital Admin", 
    avatar: "HA", 
    lastMessage: "New guidelines for patient discharge", 
    timestamp: "12/15/2024", 
    unread: 0,
    status: "offline" 
  },
];

export default function ChatSidebar({ onChatSelect, selectedChatId, isMobile, onClose, onNewChat, onNewContact }) {
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChats, setFilteredChats] = useState(SAMPLE_CHATS);
  const [filteredUsers, setFilteredUsers] = useState(SAMPLE_USERS);

  // Filter chats and users based on search query
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      setFilteredChats(
        SAMPLE_CHATS.filter(chat => 
          chat.name.toLowerCase().includes(query) || 
          chat.lastMessage.toLowerCase().includes(query)
        )
      );
      
      setFilteredUsers(
        SAMPLE_USERS.filter(user => 
          user.name.toLowerCase().includes(query) || 
          user.role.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredChats(SAMPLE_CHATS);
      setFilteredUsers(SAMPLE_USERS);
    }
  }, [searchQuery]);

  const handleChatSelect = (chatId) => {
    if (onChatSelect) {
      onChatSelect(chatId);
      if (isMobile && onClose) {
        onClose();
      }
    }
  };

  const getActiveUsers = () => {
    return SAMPLE_USERS.filter(user => user.status === "online").length;
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
        {activeTab === "chats" && (
          <div className="divide-y divide-gray-200">
            {filteredChats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No chats found</div>
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
                        <div className="bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unread}
                        </div>
                      )}
                      {chat.unread === 0 && (
                        <CheckCheck size={16} className="text-gray-400" />
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
              <div className="p-4 text-center text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 flex items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    // Find or create chat with this user
                    const existingChat = SAMPLE_CHATS.find(c => c.name === user.name);
                    if (existingChat) {
                      handleChatSelect(existingChat.id);
                    } else {
                      // In a real app, you would create a new chat with this user
                      alert(`Starting new chat with ${user.name}`);
                    }
                  }}
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
                    <p className="text-sm text-gray-500 mt-1">{user.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
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