// Updated PaymentService.js
// Service class for handling payment operations
export class PaymentService {
  constructor(apiClient, currencyService = null) {
    this.apiClient = apiClient;
    this.currencyService = currencyService;
  }

  // Set the currency service if it wasn't provided in constructor
  setCurrencyService(currencyService) {
    this.currencyService = currencyService;
  }

  async processPayment(paymentData) {
    try {
      // Validate payment data before processing
      this.validatePaymentData(paymentData);
      
      // Process payment through the API client
      const response = await this.apiClient.post('/payments', paymentData);
      return response.data;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  validatePaymentData(paymentData) {
    const { amount, patientId, providerId, paymentMethod } = paymentData;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    
    if (!patientId) {
      throw new Error('Patient information is required');
    }
    
    if (!providerId) {
      throw new Error('Provider information is required');
    }
    
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    // Validate payment method specific fields
    switch(paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        if (!paymentData.cardNumber) {
          throw new Error('Card number is required');
        }
        if (!paymentData.cardHolderName) {
          throw new Error('Card holder name is required');
        }
        if (!paymentData.expiryDate) {
          throw new Error('Expiry date is required');
        }
        if (!paymentData.cvv) {
          throw new Error('CVV is required');
        }
        break;
      case 'mobile_money':
        if (!paymentData.mobileNumber) {
          throw new Error('Mobile number is required');
        }
        if (!paymentData.mobileProvider) {
          throw new Error('Mobile provider is required');
        }
        break;
      case 'bank_transfer':
        if (!paymentData.bankName) {
          throw new Error('Bank name is required');
        }
        if (!paymentData.accountNumber) {
          throw new Error('Account number is required');
        }
        break;
      case 'insurance':
        if (!paymentData.insuranceProvider) {
          throw new Error('Insurance provider is required');
        }
        if (!paymentData.membershipNumber) {
          throw new Error('Membership number is required');
        }
        break;
      case 'cash':
        // No additional validation needed for cash
        break;
      default:
        throw new Error('Invalid payment method');
    }
    
    return true;
  }

  async getPaymentHistory(patientId) {
    try {
      const response = await this.apiClient.get(`/patients/${patientId}/payments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }
  
  async getProviderPayments(providerId) {
    try {
      const response = await this.apiClient.get(`/providers/${providerId}/payments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching provider payments:', error);
      throw error;
    }
  }

  async processSubscriptionPayment(paymentData) {
      try {
          this.validatePaymentData(paymentData);
          
          // Validate subscription specific fields
          if (!paymentData.subscriptionDetails) {
              throw new Error('Subscription details are required');
          }
          
          if (!paymentData.subscriptionDetails.billing_cycle) {
              throw new Error('Billing cycle is required');
          }
          
          if (!paymentData.subscriptionDetails.plan_name) {
              throw new Error('Plan name is required');
          }
          
          // Apply currency conversion if needed and if currencyService is available
          const convertedPaymentData = await this.applyCurrencyConversion(paymentData);
          
          // Process subscription payment through the API client
          const response = await this.apiClient.post('/subscriptions/new', {
              payment: {
                  amount: parseFloat(convertedPaymentData.amount),
                  currency: convertedPaymentData.currency || 'USD',
                  payment_method: convertedPaymentData.paymentMethod, // Changed to snake_case
                  patient_id: convertedPaymentData.patientId, // Changed to snake_case
                  provider_id: convertedPaymentData.providerId // Changed to snake_case
              },
              subscription: {
                  plan_name: convertedPaymentData.subscriptionDetails.plan_name,
                  billing_cycle: convertedPaymentData.subscriptionDetails.billing_cycle,
                  price: parseFloat(convertedPaymentData.amount),
                  currency: convertedPaymentData.currency || 'USD',
                  auto_renew: convertedPaymentData.subscriptionDetails.auto_renew !== false,
                  // Include any other fields the backend expects
                  ...convertedPaymentData.subscriptionDetails
              }
          });
          return response.data;
      } catch (error) {
          console.error('Subscription payment processing error:', error);
          throw error;
      }
  }

  async getActiveSubscription() {
      try {
          const response = await this.apiClient.get('/subscriptions/active');
          return response.data;
      } catch (error) {
          console.error('Error fetching active subscription:', error);
          throw error;
      }
  }

  async cancelSubscription(subscriptionId) {
      try {
          const response = await this.apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
          return response.data;
      } catch (error) {
          console.error('Error cancelling subscription:', error);
          throw error;
      }
  }
  
  // Method to apply currency conversion to payment data
  async applyCurrencyConversion(paymentData) {
    // If no currency service or payment is already in USD, return unchanged
    if (!this.currencyService || paymentData.currency === 'USD' || !paymentData.currency) {
      return paymentData;
    }

    // Clone the payment data to avoid modifying the original
    const convertedData = { ...paymentData };
    
    try {
      // Check if exchange rates need to be refreshed
      if (this.currencyService.needsRefresh()) {
        await this.currencyService.updateExchangeRates();
      }
      
      // Get the original amount in USD if payment is in another currency
      if (paymentData.originalAmount && paymentData.originalCurrency === 'USD') {
        // We already have the original USD amount stored
        convertedData.usdAmount = paymentData.originalAmount;
      } else if (paymentData.currency !== 'USD') {
        // Convert the current amount to USD for record-keeping
        try {
          convertedData.usdAmount = this.currencyService.convertToUSD(
            parseFloat(paymentData.amount), 
            paymentData.currency
          );
        } catch (error) {
          console.error('Error converting to USD:', error);
          // If conversion fails, estimate the USD amount from hardcoded rates
          convertedData.usdAmount = parseFloat(paymentData.amount) / 
            this.currencyService.getExchangeRate(paymentData.currency);
        }
      } else {
        // It's already in USD
        convertedData.usdAmount = parseFloat(paymentData.amount);
      }

      // Store original values before conversion
      if (!paymentData.originalAmount) {
        convertedData.originalAmount = parseFloat(paymentData.amount);
        convertedData.originalCurrency = paymentData.currency || 'USD';
      }

      // Convert the amount from USD to target currency if needed
      if (paymentData.currency !== 'USD' && paymentData.usdAmount) {
        // We're converting from stored USD amount to target currency
        convertedData.amount = this.currencyService.convertFromUSD(
          paymentData.usdAmount,
          paymentData.currency
        );
      } else if (paymentData.currency !== 'USD') {
        // Set the converted amount
        convertedData.amount = this.currencyService.convertFromUSD(
          convertedData.usdAmount,
          paymentData.currency
        );
      }

      // Format the exchange rate information for receipt
      if (paymentData.currency !== 'USD') {
        const rate = this.currencyService.getExchangeRate(paymentData.currency);
        convertedData.exchangeRateInfo = {
          fromCurrency: 'USD',
          toCurrency: paymentData.currency,
          rate: rate,
          convertedAt: new Date().toISOString(),
          rateSource: 'ExchangeRate-API',
          lastUpdated: this.currencyService.getLastUpdated()?.toISOString()
        };
      }

      return convertedData;
    } catch (error) {
      console.error('Currency conversion error:', error);
      // If conversion fails, return original data
      return paymentData;
    }
  }
  
  // Convert an amount between two currencies
  async convertBetweenCurrencies(amount, fromCurrency, toCurrency) {
    try {
      if (!this.currencyService) {
        throw new Error('Currency service not available');
      }
      
      // Refresh rates if needed
      if (this.currencyService.needsRefresh()) {
        await this.currencyService.updateExchangeRates();
      }
      
      // If currencies are the same, no conversion needed
      if (fromCurrency === toCurrency) {
        return amount;
      }
      
      // Convert to USD first (if not already)
      let amountInUSD;
      if (fromCurrency === 'USD') {
        amountInUSD = amount;
      } else {
        amountInUSD = this.currencyService.convertToUSD(amount, fromCurrency);
      }
      
      // Then convert from USD to target currency (if not USD)
      if (toCurrency === 'USD') {
        return amountInUSD;
      } else {
        return this.currencyService.convertFromUSD(amountInUSD, toCurrency);
      }
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  }
  
  // Get all supported currencies
  getSupportedCurrencies() {
    if (!this.currencyService) {
      return [];
    }
    return this.currencyService.getSupportedCurrencies();
  }
  
  // Format amount with currency symbol
  formatAmountWithCurrency(amount, currencyCode) {
    if (!this.currencyService) {
      return `${amount} ${currencyCode}`;
    }
    return this.currencyService.formatAmountWithCurrency(amount, currencyCode);
  }

  // Add a more robust version of the createPayment method with fallback handling
  async createPayment(paymentData) {
      try {
          this.validatePaymentData(paymentData);
          
          // Apply currency conversion if needed
          const convertedPaymentData = await this.applyCurrencyConversion(paymentData);
          
          // Convert camelCase to snake_case for backend compatibility
          const formattedPaymentData = {
              ...paymentData,
              payment_method: paymentData.paymentMethod,
              amount: parseFloat(convertedPaymentData.amount),
              currency: convertedPaymentData.currency || 'USD',
              patient_id: convertedPaymentData.patientId,
              provider_id: convertedPaymentData.providerId,
              // Include payment method specific details
              payment_details: this.formatPaymentDetails(convertedPaymentData)
          };
          delete formattedPaymentData.paymentMethod;
          
          // Add exchange rate information if a conversion was performed
          if (convertedPaymentData.exchangeRateInfo) {
              formattedPaymentData.exchange_rate_info = convertedPaymentData.exchangeRateInfo;
          }
          
          // Add original amount in USD if available for accounting purposes
          if (convertedPaymentData.usdAmount) {
              formattedPaymentData.usd_equivalent = convertedPaymentData.usdAmount;
          }
          
          const response = await this.apiClient.createPayment(formattedPaymentData);
          
          // Ensure we have a valid response object, even if backend response is minimal
          return {
              id: response.id || new Date().getTime().toString(),
              amount: response.amount || formattedPaymentData.amount,
              currency: response.currency || formattedPaymentData.currency,
              payment_method: response.payment_method || formattedPaymentData.payment_method,
              patient_id: response.patient_id || formattedPaymentData.patient_id,
              provider_id: response.provider_id || formattedPaymentData.provider_id,
              status: response.status || 'completed',
              payment_date: response.payment_date || new Date().toISOString(),
              payment_details: response.payment_details || formattedPaymentData.payment_details,
              usd_equivalent: response.usd_equivalent || formattedPaymentData.usd_equivalent,
              exchange_rate_info: response.exchange_rate_info || formattedPaymentData.exchange_rate_info
          };
      } catch (error) {
          console.error('Payment creation error:', error);
          throw error;
      }
  }

  // Helper method to format payment details based on the payment method
  formatPaymentDetails(paymentData) {
      const details = {};
      switch(paymentData.paymentMethod) {
          case 'credit_card':
          case 'debit_card':
              details.card_type = paymentData.cardType || this.detectCardType(paymentData.cardNumber);
              details.last_four = paymentData.cardNumber.slice(-4);
              details.card_holder_name = paymentData.cardHolderName;
              // Don't include sensitive information like full card number or CVV
              break;
          case 'mobile_money':
              details.mobile_provider = paymentData.mobileProvider;
              details.mobile_number = this.maskPhoneNumber(paymentData.mobileNumber);
              break;
          case 'bank_transfer':
              details.bank_name = paymentData.bankName;
              details.account_number_last_four = paymentData.accountNumber.slice(-4);
              break;
          case 'insurance':
              details.insurance_provider = paymentData.insuranceProvider;
              details.membership_number = paymentData.membershipNumber;
              break;
      }
      return details;
  }

  // Helper to detect card type from card number
  detectCardType(cardNumber) {
      const number = cardNumber.replace(/\s+/g, '');
      if (number.startsWith('4')) {
          return 'Visa';
      } else if (/^5[1-5]/.test(number)) {
          return 'MasterCard';
      } else if (/^3[47]/.test(number)) {
          return 'American Express';
      } else if (/^(6011|65|64[4-9])/.test(number)) {
          return 'Discover';
      }
      return 'Unknown';
  }

  // Helper to mask phone number for privacy
  maskPhoneNumber(phoneNumber) {
      if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
      return `****${phoneNumber.slice(-4)}`;
  }

  // Add new method to get non-subscription payments only
  async getNonSubscriptionPayments() {
      try {
          const response = await this.apiClient.getPayments(false); // false = exclude subscriptions
          return Array.isArray(response) ? response : [];
      } catch (error) {
          console.error('Error fetching non-subscription payments:', error);
          throw error;
      }
  }

  async getPatientNonSubscriptionPayments(patientId) {
      try {
          const response = await this.apiClient.getPatientPayments(patientId, false); // false = exclude subscriptions
          return Array.isArray(response) ? response : [];
      } catch (error) {
          console.error('Error fetching patient non-subscription payments:', error);
          throw error;
      }
  }

  async getProviderNonSubscriptionPayments(providerId) {
      try {
          const response = await this.apiClient.getProviderPayments(providerId, false); // false = exclude subscriptions
          return Array.isArray(response) ? response : [];
      } catch (error) {
          console.error('Error fetching provider non-subscription payments:', error);
          throw error;
      }
  }

  // Method to create payment with user information from current session
  async createPaymentWithUserInfo(paymentData, currentUser) {
    try {
      // Enrich the payment data with user information
      const enrichedPaymentData = {
        ...paymentData,
        patientId: currentUser.id || '',
        patientName: currentUser.username || '',
        userId: currentUser.id,  // Add this for backend filtering
        // Generate a client-side ID if not provided
        id: paymentData.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      };
      
      this.validatePaymentData(enrichedPaymentData);
      
      // Apply currency conversion if needed
      const convertedPaymentData = await this.applyCurrencyConversion(enrichedPaymentData);
      
      // Format for backend
      const backendPaymentData = {
        amount: parseFloat(convertedPaymentData.amount),
        currency: convertedPaymentData.currency || 'USD',
        payment_method: convertedPaymentData.paymentMethod,
        patient_id: convertedPaymentData.patientId,
        provider_id: convertedPaymentData.providerId,
        patient_name: convertedPaymentData.patientName,
        provider_name: convertedPaymentData.providerName,
        payment_details: this.formatPaymentDetails(convertedPaymentData),
        // Include client ID for tracking
        client_id: enrichedPaymentData.id
      };
      
      // Add subscription flag if this is a subscription payment
      if (convertedPaymentData.isSubscription) {
        backendPaymentData.is_subscription_payment = true;
        
        // If this is a subscription payment, use the subscription API
        if (convertedPaymentData.subscriptionDetails) {
          return await this.processSubscriptionPayment({
            ...convertedPaymentData,
            client_id: enrichedPaymentData.id
          });
        }
      }
      
      // Add exchange rate information if available
      if (convertedPaymentData.exchangeRateInfo) {
        backendPaymentData.exchange_rate_info = convertedPaymentData.exchangeRateInfo;
      }
      
      // Add USD equivalent for accounting
      if (convertedPaymentData.usdAmount) {
        backendPaymentData.usd_equivalent = convertedPaymentData.usdAmount;
      }
      
      const response = await this.apiClient.createPayment(backendPaymentData);
      return response;
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  }
  
  // Method to fetch payments for current user only
  async getUserPayments() {
    try {
      const response = await this.apiClient.getUserPayments();
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw error;
    }
  }
  
  // Method to fetch non-subscription payments for current user only
  async getUserNonSubscriptionPayments() {
    try {
      const payments = await this.getUserPayments();
      return payments.filter(payment => !payment.is_subscription_payment);
    } catch (error) {
      console.error('Error fetching user non-subscription payments:', error);
      throw error;
    }
  }
}