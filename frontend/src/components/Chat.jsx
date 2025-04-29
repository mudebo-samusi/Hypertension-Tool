import React, { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, Mic, Paperclip, Image, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: 2, text: "I'm looking for information about your services.", sender: "user", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: 3, text: "We offer a wide range of services including web development, design, and consulting. What specifically are you interested in?", sender: "bot", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef(null);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: input,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setInput("");
      
      // Show typing indicator
      setIsTyping(true);
      
      // Simulate receiving a reply
      setTimeout(() => {
        setIsTyping(false);
        const replyMessage = {
          id: messages.length + 2,
          text: "Thanks for your message. Our team will get back to you shortly.",
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, replyMessage]);
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const initiateCall = (type) => {
    navigate('/call-setup', { 
      state: { callType: type }
    });
    setShowCallOptions(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-violet-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-violet-400 flex items-center justify-center">
            <span className="text-lg font-semibold">User</span>
          </div>
          <div className="ml-3">
            <h2 className="font-semibold">PulseChat</h2>
            <p className="text-xs text-violet-200">Online now</p>
          </div>
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
              <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg z-10 overflow-hidden">
                <button 
                  onClick={() => initiateCall('voice')} 
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-violet-100 w-full"
                >
                  <Phone size={16} className="mr-2" />
                  <span>Voice Call</span>
                </button>
                <button 
                  onClick={() => initiateCall('video')} 
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-violet-100 w-full"
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
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="h-8 w-8 rounded-full bg-violet-400 flex-shrink-0 flex items-center justify-center mr-2">
                <span className="text-xs font-semibold text-white">CS</span>
              </div>
            )}
            <div className={`max-w-xs md:max-w-md ${msg.sender === "user" ? "order-1" : "order-2"}`}>
              <div 
                className={`px-4 py-2 rounded-lg ${
                  msg.sender === "user" 
                    ? "bg-violet-600 text-white rounded-br-none" 
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                {msg.timestamp}
              </div>
            </div>
            {msg.sender === "user" && (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center ml-2">
                <span className="text-xs font-semibold text-gray-600">You</span>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex mb-4 justify-start">
            <div className="h-8 w-8 rounded-full bg-violet-400 flex-shrink-0 flex items-center justify-center mr-2">
              <span className="text-xs font-semibold text-white">CS</span>
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-200 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "600ms" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={endOfMessagesRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
          <button className="text-gray-500 hover:text-violet-600 mr-2">
            <Paperclip size={20} />
          </button>
          <textarea
            className="flex-1 bg-transparent border-none resize-none outline-none max-h-20 text-sm"
            placeholder="Type your message..."
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="text-gray-500 hover:text-violet-600 mx-1">
            <Mic size={20} />
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`ml-2 p-2 rounded-full ${
              input.trim() 
                ? "bg-violet-600 text-white hover:bg-violet-700" 
                : "bg-gray-300 text-gray-400"
            } transition-colors`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}