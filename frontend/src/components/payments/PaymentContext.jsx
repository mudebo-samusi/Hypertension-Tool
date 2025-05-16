import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import { CurrencyService } from '../../services/CurrencyService';

// Create a context
const PaymentContext = createContext();

// Create a provider component
export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [paymentProfile, setPaymentProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Currency-related state
  const [currencyService] = useState(() => new CurrencyService());
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState([]);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // Initialize currency service and fetch initial rates
  useEffect(() => {
    const initCurrencyService = async () => {
      try {
        setIsUpdatingRates(true);
        await currencyService.updateExchangeRates();
        setCurrencies(currencyService.getSupportedCurrencies());
      } catch (error) {
        console.error("Error initializing currency service:", error);
      } finally {
        setIsUpdatingRates(false);
      }
    };
    
    initCurrencyService();
    
    // Set up periodic refresh of exchange rates (every hour)
    const refreshInterval = setInterval(async () => {
      try {
        setIsUpdatingRates(true);
        await currencyService.updateExchangeRates();
      } catch (error) {
        console.error("Error refreshing exchange rates:", error);
      } finally {
        setIsUpdatingRates(false);
      }
    }, 60 * 60 * 1000); // Refresh every hour
    
    return () => clearInterval(refreshInterval);
  }, [currencyService]);

  // Function to change the selected currency
  const changeCurrency = useCallback((currencyCode) => {
    setSelectedCurrency(currencyCode);
  }, []);

  // Function to format amount with currency symbol
  const formatAmountWithCurrency = useCallback((amount, currencyCode = selectedCurrency) => {
    return currencyService.formatAmountWithCurrency(amount, currencyCode);
  }, [selectedCurrency, currencyService]);

  // Function to convert amount between currencies
  const convertAmount = useCallback((amount, fromCurrency = 'USD', toCurrency = selectedCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    try {
      if (fromCurrency === 'USD') {
        return currencyService.convertFromUSD(amount, toCurrency);
      } else if (toCurrency === 'USD') {
        return currencyService.convertToUSD(amount, fromCurrency);
      } else {
        // Convert from source to USD, then USD to target
        const amountInUSD = currencyService.convertToUSD(amount, fromCurrency);
        return currencyService.convertFromUSD(amountInUSD, toCurrency);
      }
    } catch (error) {
      console.error("Error converting amount:", error);
      return amount; // Return original amount if conversion fails
    }
  }, [selectedCurrency, currencyService]);

  // Manually refresh exchange rates
  const refreshExchangeRates = useCallback(async () => {
    try {
      setIsUpdatingRates(true);
      await currencyService.updateExchangeRates();
      return true;
    } catch (error) {
      console.error("Error refreshing exchange rates:", error);
      return false;
    } finally {
      setIsUpdatingRates(false);
    }
  }, [currencyService]);

  // Fetch payments list using dedicated endpoint
  const fetchPaymentList = useCallback(async (includeSubscriptions = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const paymentList = await api.getPaymentList(includeSubscriptions);
      setPayments(paymentList);
      
      return paymentList;
    } catch (error) {
      console.error("Error fetching payment list:", error);
      setError(error.message || "Failed to load payments");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch analytics data using dedicated endpoint
  const fetchPaymentAnalytics = useCallback(async (includeSubscriptions = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const analytics = await api.getPaymentAnalytics(includeSubscriptions);
      setAnalyticsData(analytics);
      
      return analytics;
    } catch (error) {
      console.error("Error fetching payment analytics:", error);
      setError(error.message || "Failed to load analytics");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payment profile
  const fetchPaymentProfile = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await api.getPaymentProfile();
      setPaymentProfile(profile);
      return profile;
    } catch (error) {
      console.error("Error fetching payment profile:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a payment with enhanced currency support
  const createPayment = useCallback(async (paymentData) => {
    try {
      setLoading(true);
      
      // Apply currency conversion if needed
      if (paymentData.currency !== 'USD') {
        // Store original amount and currency
        paymentData.originalCurrency = paymentData.currency;
        paymentData.originalAmount = paymentData.amount;
        
        // Calculate USD equivalent for backend
        paymentData.usdAmount = convertAmount(
          parseFloat(paymentData.amount),
          paymentData.currency,
          'USD'
        );
      }
      
      const newPayment = await api.createPayment(paymentData);
      
      // Update payments list with new payment
      setPayments(prevPayments => [newPayment, ...prevPayments]);
      
      // Refresh analytics after creating a payment
      fetchPaymentAnalytics();
      
      return newPayment;
    } catch (error) {
      console.error("Error creating payment:", error);
      setError(error.message || "Failed to create payment");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentAnalytics, convertAmount]);

  // Add an alias for createPayment as addPayment for backward compatibility
  const addPayment = useCallback((paymentData) => {
    return createPayment(paymentData);
  }, [createPayment]);

  // Initialize by fetching profile
  const initialize = useCallback(async () => {
    await fetchPaymentProfile();
  }, [fetchPaymentProfile]);

  return (
    <PaymentContext.Provider value={{
      payments,
      analyticsData,
      paymentProfile,
      loading,
      error,
      fetchPaymentList,
      fetchPaymentAnalytics,
      fetchPaymentProfile,
      createPayment,
      addPayment, // Add this to the context
      initialize,
      // Currency-related functionality
      currencies,
      selectedCurrency,
      changeCurrency,
      formatAmountWithCurrency,
      convertAmount,
      refreshExchangeRates,
      isUpdatingRates
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

// Custom hook for using the payment context
export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};