import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import { CurrencyService } from '../../services/CurrencyService';

const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments]           = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [paymentProfile, setPaymentProfile] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  // Currency state
  const [currencyService]   = useState(() => new CurrencyService());
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [currencies, setCurrencies] = useState([]);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // ——————————————————————————————
  // Currency setup (unchanged)
  // ——————————————————————————————
  useEffect(() => {
    const initCurrency = async () => {
      setIsUpdatingRates(true);
      try {
        await currencyService.updateExchangeRates();
        setCurrencies(currencyService.getSupportedCurrencies());
      } finally {
        setIsUpdatingRates(false);
      }
    };
    initCurrency();
    const handle = setInterval(initCurrency, 60 * 60 * 1000);
    return () => clearInterval(handle);
  }, [currencyService]);

  const changeCurrency = useCallback(code => setSelectedCurrency(code), []);
  const formatAmountWithCurrency = useCallback(
    (amt, code = selectedCurrency) => currencyService.formatAmountWithCurrency(amt, code),
    [selectedCurrency, currencyService]
  );
  const convertAmount = useCallback(
    (amt, from = 'USD', to = selectedCurrency) => {
      if (from === to) return amt;
      if (from === 'USD') return currencyService.convertFromUSD(amt, to);
      if (to   === 'USD') return currencyService.convertToUSD(amt, from);
      const inUSD = currencyService.convertToUSD(amt, from);
      return currencyService.convertFromUSD(inUSD, to);
    },
    [selectedCurrency, currencyService]
  );
  const refreshExchangeRates = useCallback(async () => {
    setIsUpdatingRates(true);
    try {
      await currencyService.updateExchangeRates();
      return true;
    } catch {
      return false;
    } finally {
      setIsUpdatingRates(false);
    }
  }, [currencyService]);

  // ——————————————————————————————
  // Fetch payments list
  // ——————————————————————————————
  const fetchPaymentList = useCallback(async (includeSubscriptions = false) => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getPayments(includeSubscriptions);
      setPayments(list);
      return list;
    } catch (err) {
      setError(err.message || 'Failed to load payments');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ——————————————————————————————
  // Fetch analytics
  // ——————————————————————————————
  const fetchPaymentAnalytics = useCallback(async (includeSubscriptions = false) => {
    setLoading(true);
    setError(null);
    try {
      const analytics = await api.fetchPaymentAnalytics(includeSubscriptions);
      setAnalyticsData(analytics);
      return analytics;
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ——————————————————————————————
  // Fetch profile
  // ——————————————————————————————
  const fetchPaymentProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.getPaymentProfile();
      setPaymentProfile(profile);
      return profile;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ——————————————————————————————
  // Create a payment
  // ——————————————————————————————
  const createPayment = useCallback(async paymentData => {
    setLoading(true);
    setError(null);
    try {
      // (no usdAmount/originalCurrency hacks needed)
      const newPayment = await api.createPayment(paymentData);
      setPayments(prev => [newPayment, ...prev]);
      // refresh analytics so charts update
      fetchPaymentAnalytics();
      return newPayment;
    } catch (err) {
      setError(err.message || 'Failed to create payment');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentAnalytics]);

  // alias for backward compatibility
  const addPayment = createPayment;

  // ——————————————————————————————
  // One‐time init
  // ——————————————————————————————
  useEffect(() => {
    fetchPaymentProfile();
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
      addPayment,

      // currency
      currencies,
      selectedCurrency,
      changeCurrency,
      formatAmountWithCurrency,
      convertAmount,
      refreshExchangeRates,
      checkUserHasPayments: api.checkUserHasPayments,
      isUpdatingRates,
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayment must be inside PaymentProvider');
  return ctx;
};
