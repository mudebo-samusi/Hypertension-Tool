// App.js
import React from "react";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./components/Login";
import Register from "./components/Register";
import BPMonitor from "./components/BPMonitor";
import History from "./components/History";
import Profile from "./components/Profile";
import Reviews from "./components/Reviews";
import Settings from "./components/Settings";
import Patients from "./components/Patients";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import DoctorReviews from "./components/DoctorReviews";
import Footer from "./components/Footer";
import Dashboard from "./components/Dashboard";
import RequestPasswordReset from "./components/RequestPasswordReset";
import ResetPassword from "./components/ResetPassword";
import './App.css';
import { AuthProvider } from "./context/AuthContext";


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="container mt-5">
          <h1 className="text-center mb-4">Hypertension Diagnosis Tool</h1>
          <Navbar/>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/doctor-review" element={<DoctorReviews/>} />
            <Route path="/" element={<Home/>} />
            <Route path="/patients" element={<Patients/>} />
            <Route path="/reviews" element={<Reviews/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/monitor" element={<BPMonitor />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/request-password-reset" element={<RequestPasswordReset />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
          <Footer/>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;