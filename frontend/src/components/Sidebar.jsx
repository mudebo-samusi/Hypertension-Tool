import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-5">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <ul className="space-y-4">
        <li><Link to="/dashboard" className="text-white hover:text-gray-300 transition-colors duration-200">Home</Link></li>
        <li><Link to="/history" className="text-white hover:text-gray-300 transition-colors duration-200">History</Link></li>
        <li><Link to="/profile" className="text-white hover:text-gray-300 transition-colors duration-200">Profile</Link></li>
        <li><Link to="/settings" className="text-white hover:text-gray-300 transition-colors duration-200">Settings</Link></li>
        <li><Link to="/reviews" className="text-white hover:text-gray-300 transition-colors duration-200">Reviews</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
