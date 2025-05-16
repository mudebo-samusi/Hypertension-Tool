import React from 'react';
import { PaymentList } from './PaymentList';
import { PaymentAnalytics } from './PaymentAnalytics';
import { Link } from 'react-router-dom';
import { Plus, CreditCard } from 'lucide-react';

export const PaymentDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CreditCard className="mr-2 text-violet-600" />
          Payment Dashboard
        </h1>
        
        <Link
          to="/payments/new"
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Payment
        </Link>
      </div>
      
      <div className="mb-10">
        <PaymentAnalytics />
      </div>
      
      <div>
        <PaymentList />
      </div>
    </div>
  );
};
