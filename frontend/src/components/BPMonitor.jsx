import React from "react";
import { useState, useEffect } from "react";
import api from "../services/api";
import { io } from "socket.io-client";

const BPMonitor = () => {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);
  const [isLive, setIsLive] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Connect to the Socket.IO server
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket"]
    });

    // Listen for real-time BP readings from MQTT
    newSocket.on("new_bp_reading", (data) => {
      console.log("Received BP reading from MQTT:", data);
      if (isLive) {
        setSystolic(data.systolic);
        setDiastolic(data.diastolic);
        setHeartRate(data.heart_rate);
      }
    });

    // Listen for prediction results from MQTT
    newSocket.on("prediction_result", (data) => {
      console.log("Received prediction result from MQTT:", data);
      if (isLive) {
        setResult(data);
      }
    });

    // Connection events
    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    setSocket(newSocket);

    // Clean up the socket connection when component unmounts
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Toggle live monitoring
  const toggleLiveMonitoring = () => {
    setIsLive(!isLive);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">BP Monitor</h2>
      <div className="mb-4 flex items-center">
        <button 
          onClick={toggleLiveMonitoring} 
          className={`mr-2 py-2 px-4 rounded-md focus:outline-none focus:ring-2 
            ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
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
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="systolic" className="block text-sm font-medium text-gray-700 mb-1">
            Systolic BP
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="systolic"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            readOnly
          />
        </div>
        <div>
          <label htmlFor="diastolic" className="block text-sm font-medium text-gray-700 mb-1">
            Diastolic BP
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="diastolic"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            readOnly
          />
        </div>
        <div>
          <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 mb-1">
            Heart Rate
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="heartRate"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            readOnly
          />
        </div>
      </div>
      {result && (
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
  );
};

export default BPMonitor;