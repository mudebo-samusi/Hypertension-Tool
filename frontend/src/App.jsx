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
import HypertensionAnalytics from "./components/HypertensionAnalytics";
import VoiceCall from "./components/VoiceCall";
import VideoCall from "./components/VideoCall";
import CallSetup from "./components/CallSetup";
import PulseMarket from "./components/pulsemarket/PulseMarket";
import Subscriptions from "./components/Subscriptions";
import { PaymentProvider } from "./components/payments/PaymentContext";
import { PaymentDashboard } from './components/payments/PaymentDashboard';
import { PaymentForm } from './components/payments/PaymentForm';
import { PaymentList } from './components/payments/PaymentList';
import { PaymentAnalytics } from './components/payments/PaymentAnalytics';
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import OrgDashboard from "./components/OrgDashboard";
import PulseConnect from "./components/PulseConnect";
import PulseDoc from "./components/PulseDoc";

function App() {
  return (
    <Router>
      <AuthProvider>
      <PaymentProvider>
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
          <Route path="/subscriptions" element={<Subscriptions />} />
           {/* Payment System Routes */}
          <Route path="/payments" element={<PaymentDashboard />} />
          <Route path="/payments/new" element={<PaymentForm />} />
          <Route path="/payments/history" element={<PaymentList />} />
          <Route path="/payments/analytics" element={<PaymentAnalytics />} />
          <Route path="/AI-analytics" element={<HypertensionAnalytics />} />
          <Route path="/PulseCare" element={<AnalyticsDashboard />} />
          <Route path="/PulseMedic" element={<OrgDashboard />} />
          <Route path="/PulseConnect" element={<PulseConnect />} />
          <Route path="/PulseDoc" element={<PulseDoc />} />
        </Routes>
        <Footer/>
        </PaymentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;