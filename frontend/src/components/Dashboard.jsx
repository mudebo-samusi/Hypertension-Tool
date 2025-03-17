import React from "react";
import Sidebar from "./Sidebar.jsx";
import BPMonitor from "./BPMonitor.jsx";
import History from "./History.jsx";

const Dashboard = () => {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "20px" }}>
        <h1>Dashboard</h1>
        <BPMonitor />
        <History />
      </div>
    </div>
  );
};

export default Dashboard;
