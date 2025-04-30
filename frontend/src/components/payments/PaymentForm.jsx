// PaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { usePayment } from './PaymentContext';
import { 
  CreditCard, 
  Building, 
  User, 
  DollarSign, 
  Calendar, 
  Phone, 
  Globe, 
  ChevronsDown, 
  Shield, 
  AlertCircle 
} from 'lucide-react';

export const PaymentForm = () => {
  const { addPayment, loading } = usePayment();
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    providerId: '',
    providerName: '',
    amount: '',
    paymentMethod: 'credit_card',
    // Card details
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: '',
    // Mobile Money details
    mobileProvider: 'airtel',
    mobileNumber: '',
    // Bank transfer details
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    // Insurance details
    insuranceProvider: '',
    membershipNumber: '',
    // Currency
    currency: 'USD'
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPaymentDetails, setShowPaymentDetails] = useState(true);

  // Available currencies with symbols
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
    { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
    { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Handle card number input with formatting
  const handleCardNumberChange = (e) => {
    const formattedValue = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formattedValue }));
  };

  // Format expiry date
  const handleExpiryDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setFormData(prev => ({ ...prev, expiryDate: value }));
  };

  // Detect card type based on number
  const detectCardType = (number) => {
    const firstDigit = number.charAt(0);
    const firstTwoDigits = number.substring(0, 2);
    const firstFourDigits = number.substring(0, 4);
    
    if (number.startsWith('4')) {
      return 'Visa';
    } else if (['51', '52', '53', '54', '55'].includes(firstTwoDigits)) {
      return 'MasterCard';
    } else if (['34', '37'].includes(firstTwoDigits)) {
      return 'American Express';
    } else if (['60', '65'].includes(firstTwoDigits) || firstFourDigits === '6011') {
      return 'Discover';
    } else {
      return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Format data based on payment method
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        cardType: formData.paymentMethod.includes('card') ? detectCardType(formData.cardNumber.replace(/\s/g, '')) : '',
        timestamp: new Date().toISOString()
      };
      
      // Remove sensitive data if not needed
      if (formData.paymentMethod !== 'credit_card' && formData.paymentMethod !== 'debit_card') {
        delete paymentData.cardNumber;
        delete paymentData.cvv;
        delete paymentData.expiryDate;
      }
      
      await addPayment(paymentData);
      
      // Reset form and show success message
      setFormData({
        patientId: '',
        patientName: '',
        providerId: '',
        providerName: '',
        amount: '',
        paymentMethod: 'credit_card',
        cardNumber: '',
        cardHolderName: '',
        expiryDate: '',
        cvv: '',
        mobileProvider: 'airtel',
        mobileNumber: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        insuranceProvider: '',
        membershipNumber: '',
        currency: 'USD'
      });
      
      setMessage({ type: 'success', text: 'Payment processed successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to process payment' });
    }
  };

  // Render different payment detail fields based on selected payment method
  const renderPaymentMethodFields = () => {
    switch(formData.paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                name="cardNumber"
                placeholder="•••• •••• •••• ••••"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                maxLength="19"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {formData.cardNumber && (
                <div className="text-xs text-gray-500 mt-1">
                  {detectCardType(formData.cardNumber.replace(/\s/g, ''))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                name="cardHolderName"
                placeholder="Name as appears on card"
                value={formData.cardHolderName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  name="expiryDate"
                  placeholder="MM/YY"
                  value={formData.expiryDate}
                  onChange={handleExpiryDateChange}
                  maxLength="5"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="password"
                  name="cvv"
                  placeholder="•••"
                  value={formData.cvv}
                  onChange={handleChange}
                  maxLength="4"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>
        );
      case 'mobile_money':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Provider</label>
              <select
                name="mobileProvider"
                value={formData.mobileProvider}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="airtel">Airtel Money</option>
                <option value="mtn">MTN Mobile Money</option>
                <option value="vodafone">Vodafone Cash</option>
                <option value="orange">Orange Money</option>
                <option value="mpesa">M-Pesa</option>
                <option value="tigocash">Tigo Cash</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                name="mobileNumber"
                placeholder="e.g. +2567XXXXXXXX"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll receive a payment prompt on your mobile phone
              </p>
            </div>
          </div>
        );
      case 'bank_transfer':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="bankName"
                placeholder="Enter bank name"
                value={formData.bankName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                placeholder="Enter account number"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Routing/Swift/IBAN Number
              </label>
              <input
                type="text"
                name="routingNumber"
                placeholder="Enter routing number"
                value={formData.routingNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        );
      case 'insurance':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Provider</label>
              <input
                type="text"
                name="insuranceProvider"
                placeholder="Enter insurance provider"
                value={formData.insuranceProvider}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Membership/Policy Number</label>
              <input
                type="text"
                name="membershipNumber"
                placeholder="Enter policy number"
                value={formData.membershipNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        );
      case 'cash':
        return (
          <div className="p-3 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Cash payments will need to be registered at the reception desk.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
        <DollarSign className="mr-2 text-violet-500" />
        Process Payment
      </h2>
      
      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Patient Information
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="patientId"
              placeholder="Patient ID"
              value={formData.patientId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              type="text"
              name="patientName"
              placeholder="Patient Name"
              value={formData.patientName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <Building className="w-4 h-4 mr-1" />
            Provider Information
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="providerId"
              placeholder="Provider ID/Subscript..."
              value={formData.providerId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              type="text"
              name="providerName"
              placeholder="Provider eg PulsePal,..."
              value={formData.providerName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            Payment Details
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="flex">
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="absolute inset-y-0 left-0 w-16 pl-2 bg-gray-100 rounded-l-md border-r-0 border-gray-300 focus:outline-none focus:ring-0"
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="amount"
                  placeholder="Amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full pl-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
            <div>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <optgroup label="Cards">
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                </optgroup>
                <optgroup label="Mobile">
                  <option value="mobile_money">Mobile Money (Airtel/MTN/M-Pesa)</option>
                </optgroup>
                <optgroup label="Other Methods">
                  <option value="insurance">Insurance</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <button 
            type="button"
            onClick={() => setShowPaymentDetails(!showPaymentDetails)}
            className="flex items-center text-sm text-violet-600 mb-3"
          >
            <ChevronsDown className={`w-4 h-4 mr-1 transform ${showPaymentDetails ? 'rotate-180' : ''}`} />
            {showPaymentDetails ? 'Hide' : 'Show'} payment method details
          </button>
          
          {showPaymentDetails && (
            <div className="bg-gray-50 p-4 rounded-md">
              {renderPaymentMethodFields()}
            </div>
          )}
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:bg-violet-300"
          >
            {loading ? 'Processing...' : `Pay ${formData.amount ? `${currencies.find(c => c.code === formData.currency)?.symbol || ''}${formData.amount}` : ''}`}
            {!loading && (
              formData.paymentMethod === 'mobile_money' ? 
                <Phone className="ml-2 w-4 h-4" /> : 
                <CreditCard className="ml-2 w-4 h-4" />
            )}
          </button>
          
          <div className="mt-3 flex justify-center items-center text-xs text-gray-500">
            <Shield className="w-3 h-3 mr-1" />
            Secure payment processing
            <Globe className="w-3 h-3 mx-1" />
            Global payment support
          </div>
        </div>
      </form>
    </div>
  );
};