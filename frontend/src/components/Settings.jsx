import React from "react";
import { useState } from "react";

const Settings = () => {
  const [email, setEmail] = useState("user@example.com");
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User Settings</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Email: </label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
      </div>

      <div className="mb-6">
        <label className="flex items-center space-x-2 text-gray-700">
          <input 
            type="checkbox" 
            checked={notifications} 
            onChange={() => setNotifications(!notifications)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
          />
          <span>Receive BP Alerts</span>
        </label>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Save Changes
      </button>
    </div>
  );
};

export default Settings;
