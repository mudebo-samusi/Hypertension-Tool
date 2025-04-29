import React, { useState, useEffect } from "react";
import { Mic, MicOff, PhoneOff, Volume2, Volume, ArrowLeft, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function VoiceCall() {
  const location = useLocation();
  const participants = location.state?.participants || [{ id: 0, name: "PulseChat Support", avatar: "CS" }];
  const isGroupCall = location.state?.isGroupCall || false;
  
  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const navigate = useNavigate();

  // Handle call timer
  useEffect(() => {
    let timer;
    if (callStatus === "connected") {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Format call duration as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Simulate connecting and then connected after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus("connected");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const endCall = () => {
    setCallStatus("ended");
    // Show "Call Ended" for a moment, then redirect
    setTimeout(() => {
      navigate(-1);
    }, 1500);
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    // In a real app, handle actual audio muting
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
    // In a real app, handle speaker mode
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Call header */}
      <div className="bg-violet-600 text-white p-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-2 hover:bg-violet-700 p-1 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">
              {isGroupCall ? 'Group Call' : 'Voice Call'}
            </h1>
            <p className={`text-sm ${callStatus === "connecting" ? "animate-pulse" : ""}`}>
              {callStatus === "connecting" && "Connecting..."}
              {callStatus === "connected" && (isGroupCall ? `${participants.length} participants` : "Connected")}
              {callStatus === "ended" && "Call Ended"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Caller information */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isGroupCall ? (
          <div className="flex flex-wrap justify-center gap-4 mb-6 max-w-md">
            {participants.map(user => (
              <div key={user.id} className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-violet-400 flex items-center justify-center mb-2 shadow-lg relative">
                  <span className="text-xl font-bold text-white">{user.avatar}</span>
                  {user.status === "speaking" && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 px-2 py-0.5 rounded-full">
                      <div className="flex space-x-1">
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></div>
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse delay-75"></div>
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="h-24 w-24 rounded-full bg-violet-400 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">{participants[0].avatar}</span>
            </div>
            <h2 className="text-2xl font-semibold">{participants[0].name}</h2>
          </>
        )}
        
        {callStatus === "connected" && (
          <div className="mt-2 text-gray-500">
            {formatTime(callDuration)}
          </div>
        )}
        
        {callStatus === "connecting" && (
          <div className="mt-6 flex space-x-3">
            <div className="h-3 w-3 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="h-3 w-3 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            <div className="h-3 w-3 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "600ms" }}></div>
          </div>
        )}

        {isGroupCall && callStatus === "connected" && (
          <div className="mt-4 bg-violet-50 p-3 rounded-lg text-center">
            <p className="text-sm text-violet-700 flex items-center justify-center">
              <Users size={16} className="mr-2" />
              Group Call ({participants.length} participants)
            </p>
          </div>
        )}
      </div>
      
      {/* Call controls */}
      <div className="bg-white p-6 rounded-t-3xl shadow-lg">
        <div className="flex justify-center space-x-8">
          <button 
            onClick={toggleMute}
            className={`rounded-full p-4 ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'} transition-colors`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <button 
            onClick={endCall}
            className="rounded-full p-4 bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <PhoneOff size={24} />
          </button>
          
          <button 
            onClick={toggleSpeaker}
            className={`rounded-full p-4 ${isSpeakerOn ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-700'} transition-colors`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <Volume size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}