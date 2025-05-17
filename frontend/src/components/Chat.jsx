import React, { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, Mic, Paperclip, Image, X, Menu, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import UserSelectionModal from "./UserSelectionModal";
import api from "../services/api";
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

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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
  const [currentUser, setCurrentUser] = useState(null);
  const previousSelectedChatIdRef = useRef(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState(null);
  const messageContainerRef = useRef(null);
  const lastTypingUpdateRef = useRef(0);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to load chat history
  const loadChatHistory = async () => {
    if (!selectedChatId || !hasMoreMessages || loadingHistory) return;

    setLoadingHistory(true);
    try {
      const options = { limit: 20 };
      if (oldestMessageId) options.before = oldestMessageId;

      const messagesData = await api.getChatMessages(selectedChatId, options);
      if (Array.isArray(messagesData) && messagesData.length > 0) {
        const transformedMessages = messagesData.map(message => ({
          id: message.id,
          text: message.content,
          sender: message.sender.id === currentUser?.id ? "user" : "bot",
          timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(prev => [...transformedMessages, ...prev]);
        setOldestMessageId(messagesData[0].id);
        setHasMoreMessages(messagesData.length === 20);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle scroll to load more history
  const handleScroll = () => {
    if (messageContainerRef.current.scrollTop < 50 && hasMoreMessages && !loadingHistory) {
      loadChatHistory();
    }
  };

  // Initialize socket, fetch chat rooms and current user
  useEffect(() => {
    const initChat = async () => {
      const socket = initializeSocket();
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
        initializeSocket();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Effect for handling room selection, fetching messages, and joining/leaving rooms
  useEffect(() => {
    const manageRoomConnectionAndMessages = async () => {
      if (previousSelectedChatIdRef.current && previousSelectedChatIdRef.current !== selectedChatId) {
        leaveRoom(previousSelectedChatIdRef.current);
        console.log(`Left room ${previousSelectedChatIdRef.current}`);
      }

      if (!selectedChatId) {
        setMessages([]);
        setCurrentRoom(null);
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
        
        console.log(`Fetching messages for room ${selectedChatId}`);
        const messagesData = await api.getChatMessages(selectedChatId); 
        
        if (isMounted) {
          if (Array.isArray(messagesData)) {
            const transformedMessages = messagesData.map(message => ({
              id: message.id,
              text: message.content,
              sender: message.sender.id === currentUser?.id ? "user" : "bot",
              timestamp: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(transformedMessages);
            console.log(`Loaded ${transformedMessages.length} messages for room ${selectedChatId}`);
            if (messagesData.length > 0) {
              setOldestMessageId(messagesData[0].id);
              setHasMoreMessages(messagesData.length === 20);
            }
          } else {
            console.error("Received non-array messagesData from api.getChatMessages:", messagesData);
            setMessages([{
              id: 'error-data-format',
              text: "Error: Invalid message data format received.",
              sender: "system",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
          }
        }
      } catch (error) {
        console.error(`Error setting up chat for room ${selectedChatId}:`, error);
        if (isMounted) {
          setMessages([{
            id: 'error-setup-chat',
            text: `Failed to load messages. ${error.message || 'Please try again.'}`.trim(),
            sender: "system",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } finally {
        if (isMounted) {
          previousSelectedChatIdRef.current = selectedChatId;
        }
      }
    };

    manageRoomConnectionAndMessages();
  }, [selectedChatId, chatRooms, currentUser]);

  // Socket event listeners
  useEffect(() => {
    if (!selectedChatId || !currentUser) return;

    const messageHandler = (data) => {
      if (data.room === selectedChatId) {
        setMessages(prev => [...prev, {
          id: data.id,
          text: data.content,
          sender: data.sender.id === currentUser.id ? "user" : "bot",
          timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };
    
    const typingHandler = (data) => {
      if (data.room === selectedChatId) {
        if (data.isTyping && data.userId !== currentUser.id) {
          setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);
        } else {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
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

  const sendMessage = () => {
    if (!input.trim() || !selectedChatId || !currentUser) return;
    
    const messageText = input.trim();
    
    const tempId = `temp_${Date.now()}`;
    const timestamp = new Date();
    const newMessage = {
      id: tempId,
      text: messageText,
      sender: "user",
      timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serverTimestamp: timestamp.toISOString(),
      pending: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(selectedChatId, false);
    
    socketSendMessage(selectedChatId, messageText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (selectedChatId) {
      const now = Date.now();
      if (value.trim().length > 0 && now - lastTypingUpdateRef.current > 2500) {
        sendTyping(selectedChatId, true);
        lastTypingUpdateRef.current = now;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (value.trim().length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(selectedChatId, false);
          typingTimeoutRef.current = null;
          lastTypingUpdateRef.current = 0;
        }, 3000);
      } else {
        sendTyping(selectedChatId, false);
        lastTypingUpdateRef.current = 0;
      }
    }
  };

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

  const handleNewChat = () => {
    setShowUserModal(true);
  };
  
  const createNewChat = async (name, userIds, isGroup) => {
    try {
      const newRoom = await api.createChatRoom(name, userIds, isGroup);
      setChatRooms(prev => [...prev, newRoom]);
      setSelectedChatId(newRoom.id);
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
              <div className="h-10 w-10 rounded-full bg-violet-400 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold">
                  {currentRoom.name ? currentRoom.name.substring(0, 2).toUpperCase() : "CH"}
                </span>
              </div>
              <div className="ml-3 min-w-0">
                <h2 className="font-semibold truncate">{currentRoom.name || "Chat"}</h2>
                <p className="text-xs text-violet-200 truncate">
                  {currentRoom.is_group ? `${currentRoom.users?.length || ''} members` : (isTyping ? "typing..." : "Online")}
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

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50" ref={messageContainerRef}>
        {hasMoreMessages && (
          <div className="text-center text-gray-500 my-4">
            <button
              onClick={loadChatHistory}
              disabled={loadingHistory}
              className="text-sm text-violet-600 hover:underline"
            >
              {loadingHistory ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}
        {messages.length === 0 && selectedChatId && (
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
            {msg.sender === "bot" && (
              <div className="h-8 w-8 rounded-full bg-violet-400 flex-shrink-0 flex items-center justify-center mr-2 self-end">
                <span className="text-xs font-semibold text-white">
                  {currentRoom && !currentRoom.is_group ? (currentRoom.name?.substring(0,2).toUpperCase() || 'P') : 'CS'}
                </span>
              </div>
            )}
            <div className={`max-w-xs md:max-w-md lg:max-w-lg ${msg.sender === "system" ? "w-full text-center" : msg.sender === "user" ? "" : ""}`}>
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
            {msg.sender === "user" && (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center ml-2 self-end">
                <span className="text-xs font-semibold text-gray-600">
                    {currentUser?.username?.substring(0,2).toUpperCase() || "ME"}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && typingUsers.length > 0 && (
          <div className="flex mb-4 justify-start">
            <div className="h-8 w-8 rounded-full bg-violet-400 flex-shrink-0 flex items-center justify-center mr-2 self-end">
              <span className="text-xs font-semibold text-white">
                TY
              </span>
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-200 rounded-bl-none shadow-sm">
              <div className="flex space-x-1 items-center">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                <span className="text-xs text-gray-500 ml-2">typing...</span>
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
          <textarea
            className="flex-1 bg-transparent border-none resize-none outline-none text-sm leading-tight py-2"
            placeholder="Type your message..."
            rows="1"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
            onFocus={() => setTimeout(scrollToBottom, 100)}
            onInput={(e) => {
              const el = e.target;
              el.style.height = 'auto';
              const maxHeight = 80;
              el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
            }}
            style={{ maxHeight: '80px' }}
          />
          <button className="text-gray-500 hover:text-violet-600 mx-1 p-2 self-center">
            <Mic size={20} />
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !selectedChatId}
            className={`ml-2 p-2 rounded-full self-center ${
              input.trim() && selectedChatId
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
        onClose={() => setShowUserModal(false)} 
        onCreateChat={createNewChat}
      />
    </div>
  );
}