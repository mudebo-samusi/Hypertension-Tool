import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, ArrowLeft } from "lucide-react";

export default function VideoCall() {
  const location = useLocation();
  const participants = location.state?.participants || [{ id: 0, name: "PulseChat Support", avatar: "CS" }];
  const isGroupCall = location.state?.isGroupCall || false;
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState("connecting"); // connecting, connected, ended
  const navigate = useNavigate();

  // Simulate connecting and then connected after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus("connected");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Timer effect for call duration
  useEffect(() => {
    let timer;
    if (callStatus === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  // Format duration to mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallStatus("ended");
    // Show "Call Ended" for a moment, then redirect
    setTimeout(() => {
      navigate(-1);
    }, 1500);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Additional logic to actually mute the audio stream would go here
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // Additional logic to actually turn off video would go here
  };

  const openChat = () => {
    navigate('/chat');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-2 hover:bg-gray-700 p-1 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-1">
            <h2 className="font-semibold">
              {isGroupCall ? 'Group Video Call' : 'Video Call'}
            </h2>
            <p className="text-xs text-gray-300">
              {callStatus === "connecting" ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                `Call duration: ${formatDuration(callDuration)}`
              )}
            </p>
          </div>
        </div>
        
        {isGroupCall && callStatus === "connected" && (
          <div className="bg-gray-700 py-1 px-3 rounded-full">
            <p className="text-xs flex items-center">
              <Users size={14} className="mr-1" />
              {participants.length} participants
            </p>
          </div>
        )}
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        {callStatus === "connecting" ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
            <div className="text-white text-center mb-4">
              <div className="h-20 w-20 rounded-full bg-gray-700 mx-auto flex items-center justify-center mb-4">
                <span className="text-2xl font-semibold">{isGroupCall ? "G" : participants[0].avatar}</span>
              </div>
              <p className="text-xl">{isGroupCall ? "Group Call" : participants[0].name}</p>
            </div>
            <div className="mt-4 flex space-x-3">
              <div className="h-3 w-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="h-3 w-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              <div className="h-3 w-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "600ms" }}></div>
            </div>
          </div>
        ) : callStatus === "ended" ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
            <div className="text-white text-center">
              <p className="text-xl">Call Ended</p>
            </div>
          </div>
        ) : isGroupCall ? (
          <div className="w-full h-full bg-gray-800 p-2 overflow-hidden">
            {/* Grid layout for group calls */}
            <div className={`grid ${participants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 h-full`}>
              {participants.map((user, index) => (
                <div key={user.id} className="relative bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                  {isVideoOff ? (
                    <div className="text-white text-center">
                      <div className="h-16 w-16 rounded-full bg-gray-600 mx-auto flex items-center justify-center mb-2">
                        <span className="text-xl font-semibold">{user.avatar}</span>
                      </div>
                      <p className="text-sm">{user.name.split(' ')[0]}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center relative">
                      <p className="text-white text-sm absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                        {user.name.split(' ')[0]}
                      </p>
                    </div>
                  )}
                  {index === 0 && !isVideoOff && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-xs text-white px-2 py-0.5 rounded">
                      Speaking
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Remote Video (full size) for 1-to-1 calls */}
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              {isVideoOff ? (
                <div className="text-white text-center">
                  <div className="h-32 w-32 rounded-full bg-gray-700 mx-auto flex items-center justify-center mb-4">
                    <span className="text-5xl font-semibold">{participants[0].avatar}</span>
                  </div>
                  <p className="text-xl">Video paused</p>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-gray-700 to-gray-900 flex items-center justify-center">
                  <p className="text-white text-lg">Remote video stream would appear here</p>
                </div>
              )}
            </div>

            {/* Local Video (picture-in-picture) */}
            <div className="absolute bottom-5 right-5 w-48 h-36 bg-gray-600 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
              {isVideoOff ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xl font-semibold text-white">You</span>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-violet-500 to-violet-700 flex items-center justify-center">
                  <p className="text-white text-sm">Your video stream</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-center space-x-6">
        <button 
          onClick={toggleMute} 
          className={`p-4 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={endCall} 
          className="p-5 rounded-full bg-red-600 text-white"
        >
          <PhoneOff size={28} />
        </button>
        
        <button 
          onClick={toggleVideo} 
          className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-600 text-white'}`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        <button 
          onClick={openChat} 
          className="p-4 rounded-full bg-gray-600 text-white"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
}