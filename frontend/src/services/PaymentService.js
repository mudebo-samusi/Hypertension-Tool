// PaymentService.js
// Service class for handling payment operations
export class PaymentService {
    constructor(apiClient) {
      this.apiClient = apiClient;
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
  }
  