import React, { useState } from "react";
import { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import logo2 from "../assets/logo2.png"

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link className="text-xl font-semibold text-violet-500" to="/">
            <img src={logo2} alt="Logo" className="rounded-full w-18 h-18 mb-1" ></img>
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
                <Link className="text-gray-600 hover:text-gray-900" to="/login">Login</Link>
                <Link className="text-gray-600 hover:text-gray-900" to="/register">Register</Link>
              </>
            ) : (
              <>
                <Link className="text-gray-600 hover:text-gray-900" to="/profile">Profile</Link>
                <Link className="text-gray-600 hover:text-gray-900" to="/history">History</Link>
                <Link className="text-gray-600 hover:text-gray-900" to="/dashboard">Dashboard</Link>
                <Link className="text-gray-600 hover:text-gray-900" to="/recommendations">Recommendations</Link>
                <button 
                  className="bg-violet-400 hover:bg-violet-600 text-white px-4 py-2 rounded-full" 
                  onClick={logout}
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
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/charts" onClick={toggleMenu}>BP Charts</Link>
              <Link className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" to="/recommendations" onClick={toggleMenu}>Recommendations</Link>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-left"
                onClick={() => {
                  toggleMenu();
                  logout();
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
