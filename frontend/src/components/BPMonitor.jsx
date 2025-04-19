import React, { useState } from "react";
import useSocket from "../hooks/useSocket"; // <-- new hook

const BPMonitor = () => {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [result, setResult] = useState(null);
  const [isLive, setIsLive] = useState(false);

  // Use custom hook for socket connection
  const { connectionStatus, error } = useSocket({
    isLive,
    onBPReading: (data) => {
      if (data.systolic) setSystolic(data.systolic);
      if (data.diastolic) setDiastolic(data.diastolic);
      if (data.heart_rate) setHeartRate(data.heart_rate);
    },
    onPrediction: (data) => setResult(data),
    onError: () => {
      setSystolic("");
      setDiastolic("");
      setHeartRate("");
      setResult(null);
    }
  });

  const toggleLiveMonitoring = () => {
    setIsLive((prev) => !prev);
    if (isLive) {
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
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">BP Monitor</h2>
      
      {/* Connection Status Indicator */}
      <div className="mb-4 flex items-center">
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
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Systolic BP
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            {systolic !== "" ? systolic : "--"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Diastolic BP
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            {diastolic !== "" ? diastolic : "--"}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heart Rate
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            {heartRate !== "" ? heartRate : "--"}
          </div>
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