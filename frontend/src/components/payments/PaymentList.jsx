// PaymentList.jsx
import React, { useState, useEffect } from 'react';
import { usePayment } from './PaymentContext';
import { FileText, Search, Check, Clock, X, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PaymentList = () => {
  const { payments, loading, fetchPaymentList, checkUserHasPayments } = usePayment();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const navigate = useNavigate();
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    // First check if user has any payments before setting up polling
    const checkUserPayments = async () => {
      const hasPayments = await checkUserHasPayments();
      
      // Only initiate polling if we don't know or user has payments
      if (hasPayments !== false) {
        // Fetch payments initially
        fetchPaymentList(showSubscriptions);
        
        // Set up automatic refresh with reduced frequency
        const intervalId = setInterval(() => {
          fetchPaymentList(showSubscriptions);
        }, 120000); // 2 minutes
        
        return () => clearInterval(intervalId);
      } else {
        // User has no payments, just fetch once without polling
        fetchPaymentList(showSubscriptions);
      }
    };
    
    checkUserPayments();
  }, [checkUserHasPayments, fetchPaymentList, showSubscriptions]);
  
  const filteredPayments = Array.isArray(payments) ? payments.filter(payment => {
    // Guard against missing payment or properties
    if (!payment) return false;
    
    const patientName = payment.patientName || '';
    const providerName = payment.providerName || '';
    const status = payment.status || '';
    
    const matchesSearch = 
      patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      providerName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    
    // Only show subscriptions if explicitly enabled
    const matchesSubscriptionFilter = showSubscriptions || !payment.is_subscription_payment;
    
    return matchesSearch && matchesStatus && matchesSubscriptionFilter;
  }) : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
        <FileText className="mr-2 text-violet-500" />
        Payment History
      </h2>
      
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient or provider name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        
        <div className="relative w-full md:w-1/4">
          <Filter className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div className="relative w-full md:w-1/4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-subscriptions"
              checked={showSubscriptions}
              onChange={(e) => setShowSubscriptions(e.target.checked)}
              className="mr-2 h-4 w-4 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="show-subscriptions" className="text-sm text-gray-700">
              Include Subscriptions
            </label>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-4">Loading payments...</div>
      ) : filteredPayments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.patientName}</div>
                    <div className="text-sm text-gray-500">{payment.patientId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{payment.providerName}</div>
                    <div className="text-sm text-gray-500">{payment.providerId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${typeof payment.amount === 'number' ? payment.amount.toFixed(2) : '0.00'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{payment.date || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 text-sm text-gray-900 capitalize">{payment.status || 'unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'unknown'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Payment Records Found</h3>
          <p className="text-gray-500 mb-4">You don't have any payment records in the system yet.</p>
          <button 
            onClick={() => navigate('/payments/new')} 
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition"
          >
            Create New Payment
          </button>
        </div>
      )}
    </div>
  );
};