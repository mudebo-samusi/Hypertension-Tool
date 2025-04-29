// PaymentContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Context to manage payment state throughout the application
export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch payments from API
  const fetchPayments = async () => {
    setLoading(true);
    try {
      // In a real app, this would call an API
      const response = await mockFetchPayments();
      setPayments(response);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new payment
  const addPayment = async (paymentData) => {
    setLoading(true);
    try {
      // In a real app, this would call an API
      const newPayment = await mockAddPayment(paymentData);
      setPayments(prev => [...prev, newPayment]);
      return newPayment;
    } catch (err) {
      setError('Failed to process payment');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mock API functions
  const mockFetchPayments = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'p1',
            patientId: 'pat1',
            patientName: 'John Doe',
            providerId: 'doc1',
            providerName: 'Dr. Smith',
            amount: 150.00,
            date: '2025-04-25',
            status: 'completed',
            paymentMethod: 'credit_card'
          },
          {
            id: 'p2',
            patientId: 'pat2',
            patientName: 'Jane Smith',
            providerId: 'org1',
            providerName: 'General Hospital',
            amount: 500.00,
            date: '2025-04-20',
            status: 'pending',
            paymentMethod: 'insurance'
          }
        ]);
      }, 500);
    });
  };

  const mockAddPayment = (paymentData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPayment = {
          id: `p${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          ...paymentData
        };
        resolve(newPayment);
      }, 500);
    });
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <PaymentContext.Provider
      value={{
        payments,
        loading,
        error,
        fetchPayments,
        addPayment
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => useContext(PaymentContext);