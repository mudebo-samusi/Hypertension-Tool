import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Phone, Video, Mic, Paperclip, Image, X, Menu, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import UserSelectionModal from "./UserSelectionModal";
import api from "../services/api";
import messageCache from "../services/MessageCacheService";
import { 
  initializeSocket, 
  joinRoom, 
  leaveRoom, 
  sendMessage as socketSendMessage, 
  onNewMessage, 
  onStatus, 
  sendTyping, 
  onTyping, 
  disconnect,
  getSocket
} from "../services/socket";
import { useTyping } from '../context/TypingContext';
import { useSocket } from '../context/SocketContext';

const ChatInput = ({ onSend, disabled }) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);
  const MAX_HEIGHT = 80;

  const handleChange = e => {
    setInput(e.target.value);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = newHeight + "px";
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [input]);

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input);
        setInput("");
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={input}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Type your message..."
      rows={1}
      className="flex-1 bg-transparent resize-none outline-none text-sm leading-tight py-2"
      style={{
        maxHeight: MAX_HEIGHT + "px",
        overflowY: "hidden"
      }}
      spellCheck="false"
    />
  );
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const initialLoadRef = useRef({}); // Track initial loads to prevent duplicate requests
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const endOfMessagesRef = useRef(null);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const navigate = useNavigate();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentRoom, setCurrentRoom] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [preselectedUser, setPreselectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const previousSelectedChatIdRef = useRef(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const oldestMessageIdRef = useRef(null);
  const messageContainerRef = useRef(null);
  const lastTypingUpdateRef = useRef(0);
  const lastTypingEventRef = useRef(0);
  const typingStateRef = useRef(false);
  const TYPING_THROTTLE = 3000; // Only send typing status every 3 seconds

  const { startTyping, stopTyping, isTyping: isUserTyping } = useTyping();
  const { isTypingBlocked } = useSocket();

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Enhanced function to handle cache misses with better state management
  const loadChatHistory = useCallback(async (isInitialLoad = false) => {
    if (!selectedChatId) return;
    
    // Check if we already have an ongoing request of this type
    if (messageCache.isLoading(selectedChatId, isInitialLoad ? 'initial' : 'older')) {
      console.log(`Already loading ${isInitialLoad ? 'initial' : 'older'} messages for room ${selectedChatId}`);
      return;
    }
    
    // Check if we should try to load more
    if (!isInitialLoad && !messageCache.hasMoreOlderMessages(selectedChatId)) {
      console.log("No more older messages to load");
      setHasMoreMessages(false);
      return;
    }
    
    // Set loading state for this specific request type
    messageCache.setLoading(selectedChatId, isInitialLoad ? 'initial' : 'older', true);
    setLoadingHistory(true);
    
    try {
      const params = { limit: 20 };
      if (oldestMessageIdRef.current && !isInitialLoad) {
        params.before = oldestMessageIdRef.current;
      }

      const messagesData = await api.get(`/api/chat/rooms/${selectedChatId}/messages`, { params });
      
      if (Array.isArray(messagesData) && messagesData.length > 0) {
        const transformedMessages = messagesData.map(message => ({
          id: message.id,
          text: message.content,
          sender: message.sender.id === currentUser?.id ? "user" : "bot",
          senderInfo: message.sender,
          timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          serverTimestamp: message.timestamp,
        }));
        
        // Update cache and state based on whether this is initial load or pagination
        if (isInitialLoad) {
          setMessages(transformedMessages);
          messageCache.updateMessages(selectedChatId, transformedMessages, 'replace');
          if (messagesData.length > 0) {
            oldestMessageIdRef.current = messagesData[0].id;
          }
        } else {
          setMessages(prev => {
            const updatedMessages = [...transformedMessages, ...prev];
            messageCache.updateMessages(selectedChatId, updatedMessages, 'replace');
            return updatedMessages;
          });
          if (messagesData.length > 0) {
            oldestMessageIdRef.current = messagesData[0].id;
          }
        }
        
        // Update pagination state
        const hasMore = messagesData.length === params.limit;
        messageCache.setHasMoreOlderMessages(selectedChatId, hasMore);
        setHasMoreMessages(hasMore);
      } else {
        if (isInitialLoad) {
          // No messages in this chat yet
          setMessages([]);
          messageCache.updateMessages(selectedChatId, [], 'replace');
        }
        messageCache.setHasMoreOlderMessages(selectedChatId, false);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      messageCache.setHasMoreOlderMessages(selectedChatId, false);
      setHasMoreMessages(false);
      
      if (isInitialLoad) {
        const errorMessage = {
          id: 'error-loading-messages',
          text: `Failed to load messages. ${error.message || 'Please try again.'}`.trim(),
          sender: "system",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([errorMessage]);
        // Don't cache error messages
      }
    } finally {
      messageCache.setLoading(selectedChatId, isInitialLoad ? 'initial' : 'older', false);
      setLoadingHistory(false);
    }
  }, [selectedChatId, currentUser]);

  const updateTypingStatus = useCallback((isTyping) => {
    const now = Date.now();
    if (
      selectedChatId &&
      (isTyping !== typingStateRef.current || 
       now - lastTypingEventRef.current >= TYPING_THROTTLE)
    ) {
      sendTyping(selectedChatId, isTyping);
      lastTypingEventRef.current = now;
      typingStateRef.current = isTyping;
    }
  }, [selectedChatId]);

  const handleScroll = useCallback(() => {
    if (messageContainerRef.current && 
        messageContainerRef.current.scrollTop < 50 && 
        !messageCache.isLoading(selectedChatId) && 
        messageCache.hasMoreOlderMessages(selectedChatId)) {
      loadChatHistory(false);
    }
  }, [selectedChatId, loadChatHistory]);

  useEffect(() => {
    const initChat = async () => {
      const socket = initializeSocket('chat');
      if (!socket) {
        console.error("Failed to initialize socket");
      } else {
        socket.on('connect', () => console.log("Socket re-connected successfully in Chat.jsx"));
        socket.on('disconnect', (reason) => console.log("Socket disconnected in Chat.jsx:", reason));
      }
      
      const user = api.getCurrentUser();
      setCurrentUser(user);
      
      try {
        const rooms = await api.listChatRooms();
        setChatRooms(rooms);
      } catch (error) {
        console.error("Error fetching chat rooms:", error);
      }
    };

    initChat();

    const handleStorageChange = (event) => {
      if (event.key === 'access_token') {
        console.log("Access token changed, re-initializing socket");
        initializeSocket('chat');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const refreshChatRooms = async () => {
    try {
      const rooms = await api.listChatRooms();
      setChatRooms(rooms);
    } catch (error) {
      console.error("Error refreshing chat rooms:", error);
    }
  };

  useEffect(() => {
    const manageRoomConnectionAndMessages = async () => {
      if (previousSelectedChatIdRef.current && previousSelectedChatIdRef.current !== selectedChatId) {
        leaveRoom(previousSelectedChatIdRef.current);
        console.log(`Left room ${previousSelectedChatIdRef.current}`);
      }

      if (!selectedChatId) {
        setMessages([]);
        setCurrentRoom(null);
        oldestMessageIdRef.current = null;
        setHasMoreMessages(true);
        previousSelectedChatIdRef.current = null;
        return;
      }

      let isMounted = true;

      try {
        const newRoomDetails = chatRooms.find(r => r.id === selectedChatId);
        if (isMounted) {
          setCurrentRoom(newRoomDetails || null);
        }

        const socket = getSocket();
        if (!socket || !socket.connected) {
          console.log("Socket not connected, attempting to initialize/reconnect for joining room.");
          await initializeSocket(); 
        }
        joinRoom(selectedChatId);
        console.log(`Joined room ${selectedChatId}`);
        
        // Check if this is the first time loading this chat
        const initialLoadDone = messageCache.hasInitialLoad(selectedChatId);
        
        // Use MessageCacheService to get cached messages
        const cachedMessages = messageCache.getMessages(selectedChatId);
        
        if (cachedMessages) {
          console.log(`Using cached messages for room ${selectedChatId}`);
          setMessages(cachedMessages);
          oldestMessageIdRef.current = messageCache.getRoomMetadata(selectedChatId).oldestMessageId;
          setHasMoreMessages(messageCache.hasMoreOlderMessages(selectedChatId));
          
          // Even with a valid cache, check for newer messages in background
          if (!messageCache.isLoading(selectedChatId, 'newer')) {
            messageCache.setLoading(selectedChatId, 'newer', true);
            api.get(`/api/chat/rooms/${selectedChatId}/messages`, { params: { limit: 5 } })
              .then(newestMessages => {
                if (isMounted && Array.isArray(newestMessages) && newestMessages.length > 0 &&
                    messageCache.hasNewerMessages(selectedChatId, newestMessages)) {
                  console.log("Cache is outdated, refreshing messages");
                  loadChatHistory(true); // Reload with fresh data
                }
                if (isMounted) messageCache.setLoading(selectedChatId, 'newer', false);
              })
              .catch(err => {
                console.error("Error checking for new messages:", err);
                if (isMounted) messageCache.setLoading(selectedChatId, 'newer', false);
              });
          }
        } else {
          // Cache miss or invalid cache
          console.log(`Cache miss or invalid for room ${selectedChatId}, loading from server`);
          setMessages([]);
          oldestMessageIdRef.current = null;
          setHasMoreMessages(true);
          await loadChatHistory(true);
        }
        
      } catch (error) {
        console.error(`Error setting up chat for room ${selectedChatId}:`, error);
        if (isMounted) {
          const errorMessage = {
            id: 'error-setup-chat',
            text: `Failed to load messages. ${error.message || 'Please try again.'}`.trim(),
            sender: "system",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setMessages([errorMessage]);
          // Don't cache error messages
        }
      } finally {
        if (isMounted) {
          previousSelectedChatIdRef.current = selectedChatId;
        }
      }
    };

    manageRoomConnectionAndMessages();
  }, [selectedChatId, chatRooms, currentUser, loadChatHistory]);

  useEffect(() => {
    if (!selectedChatId || !currentUser) return;

    const messageHandler = (data) => {
      if (data.room === selectedChatId) {
        const newMessage = {
          id: data.id,
          text: data.content,
          sender: data.sender.id === currentUser.id ? "user" : "bot",
          senderInfo: data.sender,
          timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          serverTimestamp: data.timestamp,
        };
        
        setMessages(prev => {
          const updatedMessages = [...prev, newMessage];
          // Update cache when receiving new message
          messageCache.updateMessages(selectedChatId, updatedMessages, 'replace');
          return updatedMessages;
        });
      }
    };
    
    const typingHandler = (data) => {
      if (data.room === selectedChatId) {
        const { userId, username, isTyping } = data;
        if (isTyping && userId !== currentUser.id) {
          setTypingUsers(prev => {
            if (prev.find(u => u.userId === userId)) return prev;
            return [...prev, { userId, username }];
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }
      }
    };
    
    const statusHandler = (data) => {
      console.log("Status update:", data.msg);
    };
    
    onNewMessage(messageHandler);
    const cleanupTyping = onTyping(typingHandler);
    onStatus(statusHandler);
    
    return () => {
      onNewMessage(() => {}); 
      cleanupTyping();
      onStatus(() => {});
    };
  }, [selectedChatId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    setIsTyping(typingUsers.length > 0);
  }, [typingUsers]);

  useEffect(() => {
    if (messages.length > 0 && selectedChatId && currentUser) {
      const lastMessage = messages[messages.length - 1];
      const roomToUpdate = chatRooms.find(r => r.id === selectedChatId);

      if (roomToUpdate && (roomToUpdate.lastMessage?.content !== lastMessage.text || !roomToUpdate.lastMessage?.timestamp)) {
        const updatedRooms = chatRooms.map(room => {
          if (room.id === selectedChatId) {
            return {
              ...room,
              lastMessage: {
                content: lastMessage.text,
                timestamp: lastMessage.serverTimestamp || new Date().toISOString() 
              },
            };
          }
          return room;
        });
        
        const sortedRooms = [...updatedRooms].sort((a, b) => {
          const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return bTime - aTime;
        });
        setChatRooms(sortedRooms);
      }
    }
  }, [messages, selectedChatId, currentUser, chatRooms]);

  const sendMessage = useCallback((messageText) => {
    if (!messageText?.trim() || !selectedChatId || !currentUser) return;
    
    const tempId = `temp_${Date.now()}`;
    const timestamp = new Date();
    const newMessage = {
      id: tempId,
      text: messageText.trim(),
      sender: "user",
      timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serverTimestamp: timestamp.toISOString(),
      pending: true
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      // Update cache when sending new message
      messageCache.updateMessages(selectedChatId, updatedMessages, 'replace');
      return updatedMessages;
    });
    
    stopTyping();
    updateTypingStatus(false);
    
    socketSendMessage(selectedChatId, messageText.trim());
  }, [selectedChatId, currentUser, stopTyping, updateTypingStatus]);

  const initiateCall = (type) => {
    navigate('/call-setup', { 
      state: { callType: type }
    });
    setShowCallOptions(false);
  };

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleNewChat = (user = null) => {
    setPreselectedUser(user || null);
    setShowUserModal(true);
  };

  const refreshChatCache = useCallback((roomId = null) => {
    if (roomId) {
      // Invalidate specific room cache
      messageCache.invalidateCache(roomId);
      if (roomId === selectedChatId) {
        loadChatHistory(true);
      }
    } else {
      // Invalidate all caches
      messageCache.invalidateCache();
      if (selectedChatId) {
        loadChatHistory(true);
      }
    }
  }, [selectedChatId, loadChatHistory]);

  const createNewChat = async (name, userIds, isGroup) => {
    try {
      const newRoomData = await api.createChatRoom(name, userIds, isGroup);
      const currentUserId = currentUser?.id;
      let displayName = newRoomData.name;
      let displayAvatar = newRoomData.avatar || (newRoomData.name ? newRoomData.name.substring(0, 2).toUpperCase() : 'CH');
      
      if (!newRoomData.is_group && newRoomData.participants && newRoomData.participants.length === 2) {
        const otherParticipant = newRoomData.participants.find(p => p.id !== currentUserId);
        if (otherParticipant) {
          displayName = otherParticipant.username;
          displayAvatar = api.getUserAvatarUrl(otherParticipant);
        }
      }

      const processedNewRoom = {
        ...newRoomData,
        name: displayName,
        avatar: displayAvatar,
        isAvatarUrl: typeof displayAvatar === 'string' && displayAvatar.startsWith('http'),
        lastMessage: newRoomData.lastMessage?.content || "No messages yet",
        timestamp: newRoomData.lastMessage?.timestamp 
          ? new Date(newRoomData.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (newRoomData.updated_at ? new Date(newRoomData.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"),
      };

      setChatRooms(prev => [processedNewRoom, ...prev.filter(r => r.id !== newRoomData.id)]);
      setSelectedChatId(newRoomData.id);
      setShowUserModal(false);
      setPreselectedUser(null);
      
      // Make sure we don't use any stale cache for the new chat
      refreshChatCache(newRoomData.id);
      
      await refreshChatRooms();
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const ChatContent = () => (
    <div className="flex flex-col h-full">
      <div className="bg-violet-600 text-white px-4 py-3 flex items-center max-w-full justify-between rounded-tr-xl">
        {isMobile && (
          <button
            onClick={() => setShowSidebar(true)}
            className="text-white p-2 rounded-full hover:bg-violet-700 transition"
          >
            <Menu size={24} />
          </button>
        )}
        <div className="flex items-center min-w-0">
          {currentRoom && (
            <>
              <div className="relative h-10 w-10 rounded-full bg-violet-400 flex items-center justify-center flex-shrink-0 mr-3">
                {currentRoom.isAvatarUrl ? (
                  <img src={currentRoom.avatar} alt={currentRoom.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">
                    {typeof currentRoom.avatar === 'string' ? currentRoom.avatar : (currentRoom.name ? currentRoom.name.substring(0, 2).toUpperCase() : "CH")}
                  </span>
                )}
                {!currentRoom.is_group && currentRoom.participants?.find(p => p.id !== currentUser?.id)?.is_online && (
                   <div className="absolute bottom-0 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-violet-600"></div>
                )}
              </div>
              <div className="ml-3 min-w-0">
                <h2 className="font-semibold truncate">{currentRoom.name || "Chat"}</h2>
                <p className="text-xs text-violet-200 truncate">
                  {currentRoom.is_group 
                    ? `${currentRoom.participants?.length || 0} members` 
                    : (typingUsers.length > 0 
                        ? `${typingUsers.map(u => u.username).join(', ')} is typing...` 
                        : (currentRoom.participants?.find(p => p.id !== currentUser?.id)?.is_online ? "Online" : "Offline")
                      )
                  }
                </p>
              </div>
            </>
          )}
          {!currentRoom && !isMobile && (
             <div className="ml-3">
                <h2 className="font-semibold">Select a Chat</h2>
             </div>
          )}
        </div>
        <div className="flex items-center">
          <div className="relative">
            <button 
              onClick={() => setShowCallOptions(!showCallOptions)}
              className="text-white p-2 rounded-full hover:bg-violet-700 transition"
            >
              <Phone size={20} />
            </button>
            {showCallOptions && (
              <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg z-20 w-46 overflow-hidden">
                <button 
                  onClick={() => initiateCall('voice')} 
                  className="flex items-center px-4 py-2 text-gray-900 hover:bg-violet-600 hover:text-white w-full"
                >
                  <Phone size={16} className="mr-2" />
                  <span>Voice Call</span>
                </button>
                <button 
                  onClick={() => initiateCall('video')} 
                  className="flex items-center px-4 py-2 text-gray-900 hover:bg-violet-600 hover:text-white w-full"
                >
                  <Video size={16} className="mr-2" />
                  <span>Video Call</span>
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/call-setup', { state: { callType: 'video' } })}
            className="text-white p-2 rounded-full hover:bg-violet-700 transition ml-1"
          >
            <Video size={20} />
          </button>
          {currentUser && (
            <div className="ml-2 flex items-center cursor-pointer relative group">
              <div className="h-10 w-10 rounded-full bg-violet-800 flex items-center justify-center overflow-hidden">
                {currentUser.profile_image ? (
                  <img 
                    src={api.getFullImageUrl(currentUser.profile_image)} 
                    alt={currentUser.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg z-20 w-48 overflow-hidden hidden group-hover:block">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                  <p className="text-xs text-gray-500">{currentUser.email}</p>
                </div>
                <button 
                  onClick={() => navigate('/profile')} 
                  className="flex items-center px-4 py-2 text-gray-900 hover:bg-violet-600 hover:text-white w-full text-left"
                >
                  <User size={16} className="mr-2" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50" ref={messageContainerRef} onScroll={handleScroll}>
        {messageCache.hasMoreOlderMessages(selectedChatId) && !messageCache.isLoading(selectedChatId, 'older') && messages.length > 0 && (
          <div className="text-center text-gray-500 my-4">
            <button
              onClick={() => loadChatHistory(false)}
              className="text-sm text-violet-600 hover:underline"
            >
              Load older messages
            </button>
          </div>
        )}
        {messageCache.isLoading(selectedChatId, 'older') && (
          <div className="text-center text-gray-500 my-4">Loading older messages...</div>
        )}
        {messageCache.isLoading(selectedChatId, 'initial') && messages.length === 0 && (
          <div className="text-center text-gray-500 my-4">Loading messages...</div>
        )}
        {messages.length === 0 && selectedChatId && !messageCache.isLoading(selectedChatId) && (
          <div className="text-center text-gray-500 my-8">
            No messages in this chat yet. Say hello!
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex mb-4 ${
              msg.sender === "user" 
                ? "justify-end" 
                : msg.sender === "system" 
                  ? "justify-center" 
                  : "justify-start"
            }`}
          >
            {msg.sender === "bot" && msg.senderInfo && (
              <div className="relative h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 mr-2 self-end">
                {msg.senderInfo.avatar ? (
                  <img src={api.getFullImageUrl(msg.senderInfo.avatar)} alt={msg.senderInfo.username} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-gray-700">
                    {msg.senderInfo.username ? msg.senderInfo.username.substring(0,2).toUpperCase() : '??'}
                  </span>
                )}
              </div>
            )}
            <div className={`max-w-xs md:max-w-md lg:max-w-lg ${msg.sender === "system" ? "w-full text-center" : ""}`}>
              {msg.sender === "bot" && currentRoom?.is_group && msg.senderInfo && (
                <div className="text-xs text-gray-500 mb-0.5 ml-1">{msg.senderInfo.username}</div>
              )}
              <div 
                className={`px-3 py-2 rounded-lg shadow-sm ${
                  msg.sender === "user" 
                    ? "bg-violet-600 text-white rounded-br-none" 
                    : msg.sender === "system"
                      ? "bg-yellow-100 text-yellow-800 border border-yellow-200 text-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${
                msg.sender === "system" ? "text-center" : msg.sender === "user" ? "text-right pr-1" : "text-left pl-1"
              }`}>
                {msg.timestamp} {msg.pending && msg.sender === "user" ? "(sending...)" : ""}
              </div>
            </div>
            {msg.sender === "user" && currentUser && (
              <div className="relative h-8 w-8 rounded-full bg-violet-300 flex-shrink-0 flex items-center justify-center ml-2 self-end">
                 {currentUser.profile_image ? (
                  <img src={api.getFullImageUrl(currentUser.profile_image)} alt={currentUser.username} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-violet-700">
                    {currentUser.username ? currentUser.username.substring(0,2).toUpperCase() : "ME"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        
        {typingUsers.length > 0 && (
          <div className="flex mb-4 justify-start">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center mr-2 self-end">
              <span className="text-xs font-semibold text-gray-700">TY</span>
            </div>
            <div className="bg-white text-gray-800 px-3 py-2 rounded-lg border border-gray-200 rounded-bl-none shadow-sm">
              <div className="flex items-center">
                <div className="flex space-x-1 items-center mr-2">
                  <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                  <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                </div>
                <span className="text-xs text-gray-500">
                  {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={endOfMessagesRef} />
      </div>
      
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex items-end bg-gray-100 rounded-lg px-3 py-2">
          <button className="text-gray-500 hover:text-violet-600 mr-2 p-2 self-center">
            <Paperclip size={20} />
          </button>
          <ChatInput 
            onSend={sendMessage}
            disabled={!selectedChatId}
          />
          <button className="text-gray-500 hover:text-violet-600 mx-1 p-2 self-center">
            <Mic size={20} />
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!selectedChatId}
            className={`ml-2 p-2 rounded-full self-center ${
              selectedChatId
                ? "bg-violet-600 text-white hover:bg-violet-700" 
                : "bg-gray-300 text-gray-400 cursor-not-allowed"
            } transition-colors`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const container = messageContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      // Handle cleanup and cache invalidation on unmount
      console.log("Chat component unmounting, cleaning up resources");
      disconnect();
    };
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
      <div className="flex h-full w-full max-w-screen-lg bg-white shadow-xl rounded-lg overflow-hidden">
        <div className={`${(!isMobile || showSidebar) ? 'block' : 'hidden'} ${isMobile ? 'fixed inset-0 z-50 bg-white w-full' : 'w-80 md:w-96'} h-full border-r border-gray-200`}>
          <ChatSidebar
            onChatSelect={handleChatSelect}
            selectedChatId={selectedChatId}
            isMobile={isMobile}
            onClose={() => setShowSidebar(false)}
            onNewChat={handleNewChat}
            onNewContact={async () => {
              await refreshChatRooms();
            }}
            chatRooms={chatRooms}
          />
        </div>

        <div className={`${isMobile && showSidebar ? 'hidden' : 'flex'} flex-1 flex-col h-full`}>
          {selectedChatId || !isMobile ? (
            <ChatContent />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
      
      <UserSelectionModal 
        isOpen={showUserModal} 
        onClose={() => { setShowUserModal(false); setPreselectedUser(null); }} 
        onCreateChat={createNewChat}
        preselectedUser={preselectedUser}
      />
    </div>
  );
}