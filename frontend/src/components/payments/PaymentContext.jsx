// Updated PaymentContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PaymentService } from '../../services/PaymentService';
import { CurrencyService } from '../../services/CurrencyService';
import api from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

// Context to manage payment state throughout the application
export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize services
  const currencyService = new CurrencyService();
  const paymentService = new PaymentService(api, currencyService);

  // Load supported currencies
  useEffect(() => {
    const loadCurrencies = () => {
      try {
        const supportedCurrencies = currencyService.getSupportedCurrencies();
        setCurrencies(supportedCurrencies);
      } catch (err) {
        console.error('Error loading currencies:', err);
      }
    };
    
    loadCurrencies();
  }, []);

  // Fetch payments from API
  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Only fetch if authenticated
      if (!api.isAuthenticated()) {
        setPayments([]);
        return;
      }

      // Use the new getNonSubscriptionPayments method of PaymentService
      const response = await paymentService.getNonSubscriptionPayments();
      
      // Ensure we have an array and format data for our components
      const formattedPayments = Array.isArray(response) ? response.map(payment => ({
        id: payment.id || Math.random().toString(36).substr(2, 9),
        patientName: payment.patient_name || 'Unknown Patient',
        patientId: payment.patient_id || 'N/A',
        providerName: payment.provider_name || 'Unknown Provider',
        providerId: payment.provider_id || 'N/A',
        amount: parseFloat(payment.amount) || 0,
        status: payment.status || 'pending',
        paymentMethod: payment.payment_method || 'unknown',
        date: payment.payment_date || new Date().toISOString().split('T')[0],
        currency: payment.currency || 'USD',
        // Store USD equivalent if available
        usdAmount: payment.usd_equivalent || null,
        exchangeRateInfo: payment.exchange_rate_info || null
      })) : [];
      
      setPayments(formattedPayments);
      setError(null);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to fetch payments');
      setPayments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Add a new payment with currency conversion
  const addPayment = async (paymentData) => {
    setLoading(true);
    try {
      // ensure we have a logged‑in user
      const user = api.getCurrentUser();
      if (!user) {
        // Store payment data before redirecting
        localStorage.setItem('pendingPayment', JSON.stringify(paymentData));
        setError('Please log in to complete your payment');
        navigate('/login', { 
          state: { 
            returnUrl: window.location.pathname,
            paymentPending: true 
          } 
        });
        return null; // Return null to indicate auth required
      }

      // always enrich with current user info
      const enrichedPaymentData = {
        ...paymentData,
        patientId: user.id || '',
        patientName: user.name || user.username || ''
      };
      
      // Apply selected currency if not already specified
      if (!enrichedPaymentData.currency) {
        enrichedPaymentData.currency = selectedCurrency;
      }

      let response;
      if (paymentData.isSubscription) {
        // Process subscription payment
        // Ensure subscription data has required fields
        if (!enrichedPaymentData.subscriptionDetails) {
          enrichedPaymentData.subscriptionDetails = {};
        }
        
        // Ensure billing_cycle is present (default to monthly if not specified)
        if (!enrichedPaymentData.subscriptionDetails.billing_cycle) {
          enrichedPaymentData.subscriptionDetails.billing_cycle = 'monthly';
        }
        
        // Ensure plan_name is present
        if (!enrichedPaymentData.subscriptionDetails.plan_name) {
          enrichedPaymentData.subscriptionDetails.plan_name = 
            enrichedPaymentData.subscriptionDetails.plan_name || 
            `${enrichedPaymentData.subscriptionDetails.billing_cycle} plan`;
        }
        
        // Set default auto-renew to true if not specified
        if (enrichedPaymentData.subscriptionDetails.auto_renew === undefined) {
          enrichedPaymentData.subscriptionDetails.auto_renew = true;
        }
        
        // Currency conversion will be handled by the service
        response = await paymentService.processSubscriptionPayment(enrichedPaymentData);
      } else {
        // Process regular payment with all payment methods and currency conversion
        response = await paymentService.createPayment(enrichedPaymentData);
      }

      // Ensure response is an object with basic required fields
      const validResponse = response && typeof response === 'object' ? response : {
        id: Math.random().toString(36).substr(2, 9),
        amount: enrichedPaymentData.amount,
        status: 'completed',
        currency: enrichedPaymentData.currency || 'USD'
      };

      // Format the new payment response to match our component expectations
      const formattedPayment = {
        id: validResponse.id || Math.random().toString(36).substr(2, 9),
        patientName: enrichedPaymentData.patientName,
        patientId: enrichedPaymentData.patientId,
        providerName: enrichedPaymentData.providerName,
        providerId: enrichedPaymentData.providerId,
        amount: parseFloat(validResponse.amount || enrichedPaymentData.amount),
        status: validResponse.status || 'completed',
        paymentMethod: enrichedPaymentData.paymentMethod,
        date: validResponse.payment_date || new Date().toISOString().split('T')[0],
        currency: validResponse.currency || enrichedPaymentData.currency || 'USD',
        paymentDetails: validResponse.payment_details || {},
        // Store exchange rate info if available
        usdAmount: validResponse.usd_equivalent || null,
        exchangeRateInfo: validResponse.exchange_rate_info || null
      };

      setPayments(prev => [...prev, formattedPayment]);
      return validResponse;
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(`Failed to process payment: ${err.message || 'Unknown error'}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process any pending payment after login
  const processPendingPayment = async () => {
    const pendingPaymentData = localStorage.getItem('pendingPayment');
    
    if (pendingPaymentData && api.isAuthenticated()) {
      try {
        const paymentData = JSON.parse(pendingPaymentData);
        localStorage.removeItem('pendingPayment');
        
        // Process the pending payment
        const result = await addPayment(paymentData);
        
        // Navigate to home page after success, but clear the state first
        if (result) {
          // Clear the paymentPending state to avoid navigation loops
          navigate('/', { 
            replace: true,
            state: {} // Clear previous state
          });
          return true;
        }
      } catch (err) {
        console.error('Failed to process pending payment:', err);
        setError('Failed to complete your pending payment');
      }
    }
    return false;
  };

  // Change the selected currency
  const changeCurrency = (currencyCode) => {
    // Validate that the currency is supported
    const isSupported = currencies.some(currency => currency.code === currencyCode);
    if (isSupported) {
      setSelectedCurrency(currencyCode);
      return true;
    } else {
      setError(`Currency ${currencyCode} is not supported`);
      return false;
    }
  };

  // Convert an amount to the currently selected currency
  const convertAmount = (amount, fromCurrency = 'USD') => {
    try {
      if (fromCurrency === selectedCurrency) {
        return amount;
      }
      
      // First convert to USD if not already
      let amountInUSD = amount;
      if (fromCurrency !== 'USD') {
        amountInUSD = currencyService.convertToUSD(amount, fromCurrency);
      }
      
      // Then convert from USD to selected currency
      if (selectedCurrency !== 'USD') {
        return currencyService.convertFromUSD(amountInUSD, selectedCurrency);
      }
      
      return amountInUSD;
    } catch (err) {
      console.error('Currency conversion error:', err);
      return amount; // Return original amount on error
    }
  };

  // Format an amount with the currency symbol
  const formatAmountWithCurrency = (amount, currencyCode = selectedCurrency) => {
    try {
      return currencyService.formatAmountWithCurrency(amount, currencyCode);
    } catch (err) {
      console.error('Currency formatting error:', err);
      return `${amount} ${currencyCode}`; // Fallback formatting
    }
  };

  // Check for pending payments when component mounts or location changes
  useEffect(() => {
    const loginRedirect = location.state?.paymentPending;
    if (loginRedirect) {
      processPendingPayment();
    }
  }, [location.state?.paymentPending]); // Only depend on the specific flag

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
        addPayment,
        processPendingPayment,
        currencies,
        selectedCurrency,
        changeCurrency,
        convertAmount,
        formatAmountWithCurrency
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => useContext(PaymentContext);