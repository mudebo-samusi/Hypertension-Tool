// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import BPChart from "./components/BPChart";
import Chat from "./components/Chat";
import VoiceCall from "./components/VoiceCall";
import VideoCall from "./components/VideoCall";
import CallSetup from "./components/CallSetup";
import PulseMarket from "./components/pulsemarket/PulseMarket";

function App() {
  return (
    <Router>
      <AuthProvider>
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
          <Route path="/charts" element={<BPChart />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/request-password-reset" element={<RequestPasswordReset />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/call-setup" element={<CallSetup />} />
          <Route path="/voice-call" element={<VoiceCall />} />
          <Route path="/video-call" element={<VideoCall />} />
          <Route path="/pulse-market" element={<PulseMarket />} />
        </Routes>
        <Footer/>
      </AuthProvider>
    </Router>
  );
}

export default App;