// PaymentDashboard.jsx
import React, { useState } from 'react';
import { PaymentForm } from './PaymentForm';
import { PaymentList } from './PaymentList';
import { PaymentAnalytics } from './PaymentAnalytics';
import { CreditCard, FileText, TrendingUp } from 'lucide-react';

export const PaymentDashboard = () => {
  const [activeTab, setActiveTab] = useState('make-payment');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Healthcare Payment System</h1>
      
      <div className="mb-6 border-b border-gray-200">
        <div className="flex flex-wrap -mb-px">
          <button
            className={`inline-flex items-center mr-4 py-2 px-4 text-sm font-medium 
                      ${activeTab === 'make-payment' 
                        ? 'text-violet-600 border-b-2 border-violet-600' 
                        : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
            onClick={() => handleTabClick('make-payment')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Make Payment
          </button>
          <button
            className={`inline-flex items-center mr-4 py-2 px-4 text-sm font-medium 
                      ${activeTab === 'payment-history' 
                        ? 'text-violet-600 border-b-2 border-violet-600' 
                        : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
            onClick={() => handleTabClick('payment-history')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Payment History
          </button>
          <button
            className={`inline-flex items-center mr-4 py-2 px-4 text-sm font-medium 
                      ${activeTab === 'analytics' 
                        ? 'text-violet-600 border-b-2 border-violet-600' 
                        : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
            onClick={() => handleTabClick('analytics')}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </button>
        </div>
      </div>
      
      <div className="tab-content mt-6">
        {activeTab === 'make-payment' && <PaymentForm />}
        {activeTab === 'payment-history' && <PaymentList />}
        {activeTab === 'analytics' && <PaymentAnalytics />}
      </div>
    </div>
  );
};
