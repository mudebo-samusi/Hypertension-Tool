// PaymentRoutes.jsx
import { Routes, Route } from 'react-router-dom';
import { PaymentDashboard } from './PaymentDashboard';
import { PaymentList } from './PaymentList';
import { PaymentAnalytics } from './PaymentAnalytics';
import { PaymentForm } from './PaymentForm';
import { PaymentProvider } from './PaymentContext';

export const PaymentRoutes = () => {
  return (
    <PaymentProvider>
      <Routes>
        <Route path="/" element={<PaymentDashboard />} />
        <Route path="/list" element={<PaymentList />} />
        <Route path="/analytics" element={<PaymentAnalytics />} />
        <Route path="/new" element={<PaymentForm />} />
      </Routes>
    </PaymentProvider>
  );
};