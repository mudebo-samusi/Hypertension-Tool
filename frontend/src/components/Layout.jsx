import React, { useContext } from "react";
import AuthContext from "../context/AuthContext";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Main content area */}
      <div 
        className={`transition-all duration-300 ${
          user 
            ? 'ml-52 min-h-screen' // Authenticated: leave space for vertical sidebar
            : 'pt-16 min-h-screen' // Not authenticated: leave space for horizontal navbar
        }`}
      >
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;