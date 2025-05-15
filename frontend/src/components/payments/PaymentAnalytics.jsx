// PaymentAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { usePayment } from './PaymentContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, CreditCard, Users, Calendar } from 'lucide-react';

export const PaymentAnalytics = () => {
  const { payments = [] } = usePayment();
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    avgTransactionValue: 0,
    paymentMethodDistribution: [],
    revenueByPeriod: []
  });
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    // Check if payments is an array and not empty
    if (Array.isArray(payments) && payments.length > 0) {
      calculateAnalytics();
    } else {
      // Reset analytics data if there are no payments
      setAnalyticsData({
        totalRevenue: 0,
        avgTransactionValue: 0,
        paymentMethodDistribution: [],
        revenueByPeriod: timeFrame === 'monthly' ? 
          [{ period: 'No Data', revenue: 0 }] : 
          [{ period: 'Week 1', revenue: 0 }, { period: 'Week 2', revenue: 0 }, 
           { period: 'Week 3', revenue: 0 }, { period: 'Week 4', revenue: 0 }]
      });
    }
  }, [payments, timeFrame]);

  const calculateAnalytics = () => {
    // Ensure payments is an array before processing
    if (!Array.isArray(payments)) {
      console.error('Payments is not an array:', payments);
      return;
    }

    // Total revenue - safely filter and reduce
    const validPayments = payments.filter(p => p && p.status === 'completed');
    const totalRevenue = validPayments.reduce((sum, payment) => 
      sum + (typeof payment.amount === 'number' ? payment.amount : 0), 0);
    
    // Average transaction value with safety check
    const avgTransactionValue = validPayments.length > 0 ? 
      totalRevenue / validPayments.length : 0;
    
    // Payment method distribution with safety checks
    const paymentMethodCounts = payments.reduce((acc, payment) => {
      if (payment && payment.paymentMethod) {
        const method = payment.paymentMethod;
        acc[method] = (acc[method] || 0) + 1;
      }
      return acc;
    }, {});
    
    const paymentMethodDistribution = Object.keys(paymentMethodCounts).map(method => ({
      name: method.replace('_', ' '),
      value: paymentMethodCounts[method]
    }));
    
    // Revenue by period with safety checks
    let revenueByPeriod = [];
    
    if (timeFrame === 'monthly') {
      const monthlyRevenue = validPayments.reduce((acc, payment) => {
        if (payment && payment.date) {
          const month = payment.date.substring(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + (typeof payment.amount === 'number' ? payment.amount : 0);
        }
        return acc;
      }, {});
      
      revenueByPeriod = Object.keys(monthlyRevenue).map(month => ({
        period: month,
        revenue: monthlyRevenue[month]
      }));
      
      // If no data, provide a placeholder
      if (revenueByPeriod.length === 0) {
        revenueByPeriod = [{ period: 'No Data', revenue: 0 }];
      }
    } else {
      // Weekly calculation or placeholder data
      revenueByPeriod = [
        { period: 'Week 1', revenue: 0 },
        { period: 'Week 2', revenue: 0 },
        { period: 'Week 3', revenue: 0 },
        { period: 'Week 4', revenue: 0 }
      ];
      
      // Try to populate with real data if available
      validPayments.forEach(payment => {
        if (payment && payment.date) {
          const date = new Date(payment.date);
          const weekOfMonth = Math.ceil(date.getDate() / 7);
          if (weekOfMonth >= 1 && weekOfMonth <= 4) {
            revenueByPeriod[weekOfMonth-1].revenue += 
              (typeof payment.amount === 'number' ? payment.amount : 0);
          }
        }
      });
    }
    
    setAnalyticsData({
      totalRevenue,
      avgTransactionValue,
      paymentMethodDistribution,
      revenueByPeriod
    });
  };

  // Safe count for total transactions
  const totalTransactions = Array.isArray(payments) ? payments.length : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <TrendingUp className="mr-2 text-violet-500" />
          Payment Analytics
        </h2>
        
        <div className="mt-4 md:mt-0">
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-violet-50 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Total Revenue</h3>
            <DollarSign className="h-6 w-6 text-violet-500" />
          </div>
          <p className="text-2xl font-bold mt-2">${analyticsData.totalRevenue.toFixed(2)}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Avg. Transaction</h3>
            <CreditCard className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">${analyticsData.avgTransactionValue.toFixed(2)}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Total Transactions</h3>
            <Users className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalTransactions}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-600" />
            Revenue by {timeFrame === 'monthly' ? 'Month' : 'Week'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.revenueByPeriod}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Bar dataKey="revenue" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-gray-600" />
            Payment Methods
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.paymentMethodDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.paymentMethodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} transactions`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
