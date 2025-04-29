import React, { useState } from "react";
import { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import logo2 from "../assets/logo2.png";
import api from "../services/api";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await api.logout();
    if (logout) logout();
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Link className="text-xl font-semibold text-violet-500" to="/">
            <img src={logo2} alt="Logo" className="rounded-full w-18 h-22 mb-1" ></img>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex space-x-4">
            {!user ? (
              <>
                <Link className="text-gray-100 font-semibold rounded-2xl flex md:items-center h-10 w-18 bg-violet-600 hover:text-gray-100 hover:bg-violet-600" to="/login">
                  <div className="mx-auto">Login</div>
                </Link>
                <Link className="text-gray-100 font-semibold rounded-2xl h-10 w-22 flex md:items-center bg-violet-600 hover:bg-violet-600 hover:text-gray-100" to="/register">
                  <div className="mx-auto">Register</div>
                </Link>
              </>
            ) : (
              <>
              
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-20 h-8 text-center" to="/profile">Profile</Link>
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-20 h-8 text-center" to="/history">History</Link>
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-26 h-8 text-center" to="/dashboard">Dashboard</Link>
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-42 h-8 text-center" to="/recommendations">Recommendations</Link>
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-20 h-8 text-center" to="/chat">Chat</Link>
                <Link className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl w-32 h-8 text-center" to="/pulse-market">PulseMarket</Link>
                
                <hr></hr>
                <button 
                  className="bg-violet-600 hover:bg-violet-600 text-white hover:text-white px-4 py-2 h-10 rounded-xl" 
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} pb-4`}>
          {!user ? (
            <div className="flex flex-col space-y-2">
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/login" onClick={toggleMenu}>Login</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/register" onClick={toggleMenu}>Register</Link>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/profile" onClick={toggleMenu}>Profile</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/history" onClick={toggleMenu}>History</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/dashboard" onClick={toggleMenu}>Dashboard</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/recommendations" onClick={toggleMenu}>Recommendations</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/chat" onClick={toggleMenu}>Chat</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/pulse-market" onClick={toggleMenu}>PulseMarket</Link>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-left"
                onClick={async () => {
                  toggleMenu();
                  await handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
