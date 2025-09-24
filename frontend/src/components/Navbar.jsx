import React, { useState, useRef, useEffect } from "react";
import { useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import logo2 from "../assets/logo2.png";
import api from "../services/api";
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaTachometerAlt, 
  FaHistory, 
  FaComments, 
  FaUser, 
  FaThumbsUp, 
  FaShoppingCart, 
  FaCalendarAlt, 
  FaHeartbeat, 
  FaUsers, 
  FaFileAlt, 
  FaUserMd, 
  FaCreditCard, 
  FaChartLine, 
  FaRobot, 
  FaBell, 
  FaSignOutAlt, 
  FaEllipsisV 
} from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Mock notification count
  const dropdownRef = useRef(null);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    setDropdownOpen(false); // Close dropdown when toggling sidebar
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
    { name: "Dashboard", path: "/dashboard", icon: FaTachometerAlt },
    { name: "History", path: "/history", icon: FaHistory },
    { name: "Chat", path: "/chat", icon: FaComments }
  ];
  
  const dropdownLinks = [
    { name: "Profile", path: "/profile", icon: FaUser },
    { name: "Recommendations", path: "/recommendations", icon: FaThumbsUp },
    { name: "PulseMarket", path: "/pulse-market", icon: FaShoppingCart },
    { name: "Subscriptions", path: "/subscriptions", icon: FaCalendarAlt },
    { name: "PulseCare", path: "/PulseCare", icon: FaHeartbeat },
    { name: "PulseConnect", path: "/PulseConnect", icon: FaUsers },
    { name: "PulseDoc", path: "/PulseDoc", icon: FaFileAlt },
    { name: "PulseMedic", path: "/PulseMedic", icon: FaUserMd },
    { name: "Make Payments", path: "/payments/new", icon: FaCreditCard },
    { name: "PulsePay Analytics", path: "/payments", icon: FaChartLine },
    { name: "PulseAI Analytics", path: "/AI-analytics", icon: FaRobot },
  ];

  if (!user) {
    return (
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg border-b border-gray-200 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <Link to="/" className="flex items-center">
              <img src={logo2} alt="Logo" className="rounded-full w-10 h-10" />
              <span className="ml-3 text-xl font-semibold text-violet-600">PulsePal</span>
            </Link>
            
            <div className="flex space-x-4">
              <Link 
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                to="/login"
              >
                Login
              </Link>
              <Link 
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                to="/register"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <div className={`fixed top-0 left-0 h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300 z-50 ${isExpanded ? 'w-52' : 'w-16'}`}>
      <div className="flex flex-col h-full">
        {/* Header with logo and toggle button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Link to="/" className={`flex items-center ${!isExpanded && 'justify-center w-full'}`}>
            <img src={logo2} alt="Logo" className="rounded-full w-8 h-8" />
            {isExpanded && (
              <span className="ml-3 text-xl font-semibold text-violet-600">PulsePal</span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600 hover:text-violet-600 transition-colors"
          >
            {isExpanded ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        {/* Notifications */}
        <div className="p-2 border-b border-gray-200">
          <div className={`flex items-center p-2 rounded-lg hover:bg-violet-50 cursor-pointer group ${!isExpanded && 'justify-center'}`}>
            <div className="relative">
              <FaBell className="text-gray-600 group-hover:text-violet-600 transition-colors" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </div>
            {isExpanded && (
              <span className="ml-3 text-gray-700 group-hover:text-violet-600 transition-colors">
                Notifications
              </span>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 py-4">
          {/* Main Links */}
          <div className="space-y-1 px-2">
            {mainLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link 
                  key={link.path}
                  to={link.path}
                  className={`flex items-center p-3 rounded-lg hover:bg-violet-50 text-gray-700 hover:text-violet-600 transition-colors group ${!isExpanded && 'justify-center'}`}
                >
                  <IconComponent className="text-lg" />
                  {isExpanded && (
                    <span className="ml-3 font-medium">{link.name}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Dropdown Section */}
          <div className="mt-6 px-2" ref={dropdownRef}>
            <button 
              onClick={toggleDropdown}
              className={`flex items-center w-full p-3 rounded-lg hover:bg-violet-50 text-gray-700 hover:text-violet-600 transition-colors ${!isExpanded && 'justify-center'}`}
            >
              <FaEllipsisV className="text-lg" />
              {isExpanded && (
                <>
                  <span className="ml-3 font-medium flex-1 text-left">More</span>
                  <FaChevronRight className={`transition-transform ${dropdownOpen ? 'rotate-90' : ''}`} />
                </>
              )}
            </button>
            
            {/* Dropdown Items */}
            {dropdownOpen && isExpanded && (
              <div className="mt-2 space-y-1 pl-4 border-l-2 border-violet-100">
                {dropdownLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center p-2 rounded-md hover:bg-violet-50 text-gray-600 hover:text-violet-600 transition-colors text-sm"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconComponent className="text-sm" />
                      <span className="ml-3">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className={`flex items-center w-full p-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors ${!isExpanded && 'justify-center'}`}
          >
            <FaSignOutAlt className="text-lg" />
            {isExpanded && (
              <span className="ml-3 font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;