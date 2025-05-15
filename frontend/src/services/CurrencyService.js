// CurrencyService.js
export class CurrencyService {
    constructor() {
      // Supported currencies with their information
      this.currencies = [
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
  
      // Exchange rates relative to USD
      // These should ideally be fetched from an API
      this.exchangeRates = {
        'USD': 1.0,
        'EUR': 0.93,
        'GBP': 0.79,
        'JPY': 153.87,
        'ZAR': 18.36,
        'NGN': 1463.83,
        'KES': 131.41,
        'GHS': 15.46,
        'UGX': 3763.71,
        'RWF': 1296.61
      };
    }
  
    // Get all supported currencies
    getSupportedCurrencies() {
      return this.currencies;
    }
  
    // Get currency by code
    getCurrency(code) {
      return this.currencies.find(currency => currency.code === code);
    }
  
    // Get current exchange rate from USD to target currency
    getExchangeRate(targetCurrency) {
      const rate = this.exchangeRates[targetCurrency];
      if (!rate) {
        throw new Error(`Unsupported currency: ${targetCurrency}`);
      }
      return rate;
    }
  
    // Convert amount from USD to target currency
    convertFromUSD(amount, targetCurrency) {
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error('Amount must be a valid number');
      }
  
      const rate = this.getExchangeRate(targetCurrency);
      const convertedAmount = amount * rate;
      
      // Format based on currency (JPY doesn't use decimal places)
      if (targetCurrency === 'JPY') {
        return Math.round(convertedAmount);
      }
      
      // Round to 2 decimal places for most currencies
      return parseFloat(convertedAmount.toFixed(2));
    }
  
    // Convert amount from source currency to USD
    convertToUSD(amount, sourceCurrency) {
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error('Amount must be a valid number');
      }
  
      const rate = this.getExchangeRate(sourceCurrency);
      if (!rate) {
        throw new Error(`Unsupported currency: ${sourceCurrency}`);
      }
      
      const convertedAmount = amount / rate;
      return parseFloat(convertedAmount.toFixed(2));
    }
  
    // Format amount with currency symbol
    formatAmountWithCurrency(amount, currencyCode) {
      const currency = this.getCurrency(currencyCode);
      if (!currency) {
        throw new Error(`Unsupported currency: ${currencyCode}`);
      }
      
      let formattedAmount;
      
      // Format differently for different currencies
      switch (currencyCode) {
        case 'JPY':
          formattedAmount = Math.round(amount).toLocaleString();
          break;
        default:
          formattedAmount = parseFloat(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
      }
      
      return `${currency.symbol}${formattedAmount}`;
    }
  
    // Update exchange rates (would be called periodically or on demand)
    async updateExchangeRates() {
      try {
        // In a real implementation, you would fetch updated rates from an API
        // For example:
        // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        // const data = await response.json();
        // this.exchangeRates = data.rates;
        
        console.log('Exchange rates updated');
        return true;
      } catch (error) {
        console.error('Failed to update exchange rates:', error);
        return false;
      }
    }
  }