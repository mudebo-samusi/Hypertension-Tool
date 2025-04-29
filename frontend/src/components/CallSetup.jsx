
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X, Users, User, Phone, Video, ArrowRight, Check } from "lucide-react";

export default function CallSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [callType, setCallType] = useState(location.state?.callType || "voice");
  
  // Mock user data - in a real app this would come from an API
  const [users, setUsers] = useState([
    { id: 1, name: "Dr. Sarah Johnson", avatar: "SJ", status: "online", role: "Doctor" },
    { id: 2, name: "Nurse Williams", avatar: "NW", status: "online", role: "Nurse" },
    { id: 3, name: "Patient Support", avatar: "PS", status: "busy", role: "Support" },
    { id: 4, name: "Health Coach Mark", avatar: "HM", status: "away", role: "Coach" },
    { id: 5, name: "Pharmacy Team", avatar: "PT", status: "online", role: "Group" },
    { id: 6, name: "Emergency Response", avatar: "ER", status: "online", role: "Emergency" },
  ]);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const initiateCall = () => {
    if (selectedUsers.length === 0) return;
    
    const destination = callType === 'voice' ? '/voice-call' : '/video-call';
    
    navigate(destination, {
      state: {
        participants: selectedUsers,
        isGroupCall: selectedUsers.length > 1
      }
    });
  };

  const statusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-violet-700 transition"
          >
            <X size={20} />
          </button>
          <h1 className="text-xl font-semibold">
            New {callType === 'voice' ? 'Voice' : 'Video'} Call
          </h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Call Type Selector */}
      <div className="bg-white py-3 px-4 border-b flex justify-center">
        <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
          <button 
            onClick={() => setCallType('voice')} 
            className={`flex items-center px-5 py-2 ${callType === 'voice' ? 'bg-violet-100 text-violet-700' : 'bg-white text-gray-700'}`}
          >
            <Phone size={16} className="mr-2" />
            Voice
          </button>
          <button 
            onClick={() => setCallType('video')} 
            className={`flex items-center px-5 py-2 ${callType === 'video' ? 'bg-violet-100 text-violet-700' : 'bg-white text-gray-700'}`}
          >
            <Video size={16} className="mr-2" />
            Video
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border-b">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
      
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="bg-white p-4 border-b">
          <p className="text-sm text-gray-500 mb-2">Selected ({selectedUsers.length})</p>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <div key={user.id} className="flex items-center bg-violet-100 text-violet-700 rounded-full pl-2 pr-1 py-1">
                <span className="text-sm mr-2">{user.name.split(' ')[0]}</span>
                <button 
                  onClick={() => toggleUserSelection(user)} 
                  className="h-5 w-5 rounded-full bg-violet-200 flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length > 0 ? (
          <div className="divide-y">
            {filteredUsers.map(user => (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedUsers.find(u => u.id === user.id) ? 'bg-violet-50' : ''
                }`}
                onClick={() => toggleUserSelection(user)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-full ${user.role === 'Group' ? 'bg-blue-400' : 'bg-violet-400'} flex items-center justify-center text-white font-medium`}>
                      {user.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${statusColor(user.status)} border-2 border-white`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                </div>
                
                <div>
                  {selectedUsers.find(u => u.id === user.id) ? (
                    <div className="h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Search size={48} className="mb-2 opacity-50" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Start Call Button */}
      <div className="bg-white p-4 border-t">
        <button 
          onClick={initiateCall}
          disabled={selectedUsers.length === 0}
          className={`w-full py-3 rounded-lg flex items-center justify-center ${
            selectedUsers.length > 0 
              ? 'bg-violet-600 text-white hover:bg-violet-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          } transition-colors`}
        >
          {callType === 'voice' ? <Phone size={18} className="mr-2" /> : <Video size={18} className="mr-2" />}
          Start {selectedUsers.length > 1 ? 'Group ' : ''}
          {callType === 'voice' ? 'Voice' : 'Video'} Call
          <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );
}