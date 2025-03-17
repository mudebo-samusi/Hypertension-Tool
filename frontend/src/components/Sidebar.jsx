import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div style={{ width: "250px", height: "100vh", background: "#333", color: "#fff", padding: "20px" }}>
      <h2>Dashboard</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li><Link to="/dashboard" style={{ color: "#fff", textDecoration: "none" }}>Home</Link></li>
        <li><Link to="/history" style={{ color: "#fff", textDecoration: "none" }}>History</Link></li>
        <li><Link to="/profile" style={{ color: "#fff", textDecoration: "none" }}>Profile</Link></li>
        <li><Link to="/settings" style={{ color: "#fff", textDecoration: "none" }}>Settings</Link></li>
        <li><Link to="/reviews" style={{ color: "#fff", textDecoration: "none" }}>Reviews</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;
