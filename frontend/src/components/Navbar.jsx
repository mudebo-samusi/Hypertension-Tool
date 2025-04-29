import React, { useState, useRef, useEffect } from "react";
import { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import logo2 from "../assets/logo2.png";
import api from "../services/api";
import { FaChevronDown } from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    await api.logout();
    if (logout) logout();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const mainLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "History", path: "/history" },
    { name: "Chat", path: "/chat" }
  ];
  
  const dropdownLinks = [
    { name: "Profile", path: "/profile" },
    { name: "Recommendations", path: "/recommendations" },
    { name: "PulseMarket", path: "/pulse-market" },
    { name: "Subscriptions", path: "/subscriptions" }
  ];

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
                {/* Main navigation links */}
                {mainLinks.map((link) => (
                  <Link 
                    key={link.path} 
                    className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl px-3 h-8 text-center flex items-center" 
                    to={link.path}
                  >
                    {link.name}
                  </Link>
                ))}
                
                {/* Dropdown Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={toggleDropdown}
                    className="text-gray-600 hover:text-gray-100 font-semibold hover:bg-violet-600 text-lg rounded-xl px-3 h-8 text-center flex items-center"
                  >
                    More <FaChevronDown className="ml-1 h-3 w-3" />
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      {dropdownLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-violet-600 hover:text-white"
                          onClick={() => setDropdownOpen(false)}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                
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
              {/* Main links in mobile view */}
              {mainLinks.map((link) => (
                <Link 
                  key={link.path}
                  className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" 
                  to={link.path} 
                  onClick={toggleMenu}
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Dropdown links directly in mobile menu */}
              {dropdownLinks.map((link) => (
                <Link 
                  key={link.path}
                  className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md" 
                  to={link.path} 
                  onClick={toggleMenu}
                >
                  {link.name}
                </Link>
              ))}
              
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
