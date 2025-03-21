import React from "react";
import Sidebar from "./Sidebar.jsx";
import BPMonitor from "./BPMonitor.jsx";
import History from "./History.jsx";

const Dashboard = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-5">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <BPMonitor />
        <History />
      </div>
    </div>
  );
};

export default Dashboard;
