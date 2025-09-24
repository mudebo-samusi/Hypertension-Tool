import React, { useState, useEffect } from "react";
import useSocket from "../hooks/useSocket"; 
import { initializeSocket, reconnect } from "../services/socket";
import NotificationCenter, { WebhookNotificationProvider } from "./NotificationCenter";
import WebhookNotificationCenter from "./WebhookNotificationCenter";

const BPMonitor = () => {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [result, setResult] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize monitor socket when the component loads
  useEffect(() => {
    // Initialize the monitor socket separately 
    const initMonitorSocket = async () => {
      try {
        await initializeSocket('monitor');
        console.log('Monitor socket initialized successfully');
      } catch (error) {
        console.error('Failed to initialize monitor socket:', error);
      }
    };
    
    initMonitorSocket();
  }, []);

  // Use custom hook for socket connection with additional debug logging
  const { connectionStatus, error } = useSocket({
    isLive: true, // Always maintain socket connection for real-time updates
    onBPReading: (data) => {
      console.log("BP Reading received from socket:", data);
      // Always store the data when received
      if (data.systolic) setSystolic(data.systolic);
      if (data.diastolic) setDiastolic(data.diastolic);
      if (data.heart_rate) setHeartRate(data.heart_rate);
      
      console.log("BP data updated - Live monitoring:", isLive);
    },
    onPrediction: (data) => {
      console.log("Prediction received from socket:", data);
      // Always store the prediction when received
      setResult(data);
      
      console.log("Prediction updated - Live monitoring:", isLive);
    },
    onError: () => {
      console.error("Socket connection error occurred");
      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setResult(null);
    }
  });

  const toggleLiveMonitoring = async () => {
    const newLiveStatus = !isLive;
    setIsLive(newLiveStatus);
    
    // If turning on live monitoring, ensure socket is connected
    if (newLiveStatus && connectionStatus !== 'connected') {
      try {
        await reconnect('monitor');
      } catch (error) {
        console.error('Failed to reconnect monitor socket:', error);
      }
    }
    
    // Clear data when stopping live monitoring
    if (!newLiveStatus) {
      console.log("Clearing BP data as live monitoring stopped");
      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setResult(null);
    }
  };

  // Function to get the appropriate status indicator color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <WebhookNotificationProvider bpMonitorUrl="http://localhost:5001">
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BP Monitor Panel */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">BP Monitor</h2>
            
            {/* Connection Status Indicator */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <span className={`h-3 w-3 ${getStatusColor()} rounded-full mr-2`}></span>
                  <span className="text-sm text-gray-600">
                    Server: {connectionStatus === 'connected' ? 'Connected' : 
                            connectionStatus === 'disconnected' ? 'Disconnected' : 'Error'}
                  </span>
                </div>

                <button 
                  onClick={toggleLiveMonitoring} 
                  className={`mr-2 py-2 px-4 rounded-md focus:outline-none focus:ring-2 
                    ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  disabled={connectionStatus !== 'connected'}
                >
                  {isLive ? 'Stop Live Monitoring' : 'Start Live Monitoring'}
                </button>
                {isLive && (
                  <span className="flex items-center">
                    <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
                    <span className="text-sm text-gray-600">Receiving live data</span>
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="py-2 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  🔔 Notifications
                </button> */}
                <WebhookNotificationCenter />
              </div>
            </div>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Systolic BP
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {(isLive && systolic !== "") ? `${systolic} mmHg` : "--"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diastolic BP
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {(isLive && diastolic !== "") ? `${diastolic} mmHg` : "--"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {(isLive && heartRate !== "") ? `${heartRate} bpm` : "--"}
                </div>
              </div>
            </div>
            
            {(isLive && result) && (
              <div className="mt-8 p-4 bg-white shadow rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Prediction Results</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Prediction:</span> {result.prediction}</p>
                  <p><span className="font-medium">Risk Level:</span> 
                    <span className={`ml-2 px-2 py-1 rounded ${
                      result.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                      result.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {result.risk_level}
                    </span>
                  </p>
                  <p><span className="font-medium">Confidence:</span> {(result.probability * 100).toFixed(2)}%</p>
                  <div className="mt-4">
                    <p className="font-medium">Recommendation:</p>
                    <p className="mt-1 p-3 bg-blue-50 text-blue-800 rounded">{result.recommendation}</p>
                  </div>
                  <div className="mt-4">
                    <p className="font-medium">Category:</p>
                    <p className="mt-1 p-3 bg-violet-50 text-green-500 rounded">{result.bp_category}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Notification Panel */}
          <div className="lg:col-span-1">
            {showNotifications && (
              <NotificationCenter className="sticky top-6" />
            )}
          </div>
        </div>
      </div>
    </WebhookNotificationProvider>
  );
};

export default BPMonitor;