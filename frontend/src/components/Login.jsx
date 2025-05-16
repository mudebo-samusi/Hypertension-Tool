import React, { useState, useContext, useEffect } from "react";
import AuthContext from "../context/AuthContext";
import { useLocation } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    // Check if user was redirected due to session expiration
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("expired") === "true") {
      setError("Your session has expired. Please log in again.");
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);
    
    try {
      console.log("Submitting login form with username:", username);
      
      if (!username.trim() || !password.trim()) {
        setError("Username and password are required");
        setLoading(false);
        return;
      }
      
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      // Display specific error message
      if (err.message.includes('inactive')) {
        setError("Your account is inactive. Please contact support to activate your account.");
      } else if (err.message.includes('not found')) {
        setError("User not found. Please check your username.");
      } else if (err.message.includes('password')) {
        setError("Invalid password. Please try again.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Login</h2>
      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-2 px-4 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;