// PaymentRoutes.jsx
import { Routes, Route } from 'react-router-dom';
import { PaymentDashboard } from './PaymentDashboard';
import { PaymentProvider } from './PaymentContext';

export const PaymentRoutes = () => {
  return (
    <PaymentProvider>
      <Routes>
        <Route path="/payments" element={<PaymentDashboard />} />
      </Routes>
    </PaymentProvider>
  );
};