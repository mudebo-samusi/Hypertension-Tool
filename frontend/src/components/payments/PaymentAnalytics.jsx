// PaymentAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { usePayment } from './PaymentContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, CreditCard, Users, Calendar } from 'lucide-react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const PaymentAnalytics = () => {
  const { analyticsData, loading, fetchPaymentAnalytics, paymentProfile } = usePayment();
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [includeSubscriptions, setIncludeSubscriptions] = useState(false);
  const navigate = useNavigate();

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    // First check if user has any payments before setting up polling
    const checkUserPayments = async () => {
      const hasPayments = await api.checkUserHasPayments();

      // Only initiate polling if we don't know or user has payments
      if (hasPayments !== false) {
        // Fetch analytics initially
        fetchPaymentAnalytics(includeSubscriptions);

        // Set up automatic refresh with reduced frequency
        const intervalId = setInterval(() => {
          fetchPaymentAnalytics(includeSubscriptions);
        }, 180000); // 3 minutes

        return () => clearInterval(intervalId);
      } else {
        // User has no payments, just fetch once without polling
        fetchPaymentAnalytics(includeSubscriptions);
      }
    };

    checkUserPayments();
  }, [fetchPaymentAnalytics, includeSubscriptions]);

  // Render an alternate view if no data is available
  const renderNoPaymentsView = () => (
    <div className="p-10 text-center bg-gray-50 rounded-lg mt-4">
      <h3 className="text-xl font-medium text-gray-700 mb-3">No Payment Data Available</h3>
      <p className="text-gray-500 mb-5">
        You donot have any payment data to analyze. Payment analytics will be available after you have processed payments.
      </p>
      <button
        onClick={() => navigate('/payments/new')}
        className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition"
      >
        Create Your First Payment
      </button>
    </div>
  );

  const renderAnalytics = () => {
    if (!analyticsData) {
      return renderNoPaymentsView();
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-violet-50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-700">Total Revenue</h3>
              <DollarSign className="h-6 w-6 text-violet-500" />
            </div>
            <p className="text-2xl font-bold mt-2">${analyticsData.total_revenue.toFixed(2)}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-700">Avg. Transaction</h3>
              <CreditCard className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">${analyticsData.avg_transaction_value.toFixed(2)}</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-700">Total Transactions</h3>
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{analyticsData.total_transactions}</p>
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
                  data={timeFrame === 'monthly' ? analyticsData.monthly_revenue : analyticsData.weekly_revenue}
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
                    data={analyticsData.payment_method_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analyticsData.payment_method_distribution.map((entry, index) => (
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
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          <TrendingUp className="mr-2 text-violet-500" />
          Payment Analytics
        </h2>

        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="include-subscriptions"
              checked={includeSubscriptions}
              onChange={(e) => setIncludeSubscriptions(e.target.checked)}
              className="mr-2 h-4 w-4 text-violet-600 rounded focus:ring-violet-500"
            />
            <label htmlFor="include-subscriptions" className="text-sm text-gray-700">
              Include Subscriptions
            </label>
          </div>
        </div>
      </div>

      {/* Profile summary section if available */}
      {paymentProfile && (
        <div className="mb-6 p-4 bg-violet-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700">Payment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Transactions</div>
              <div className="text-xl font-semibold">{paymentProfile.payment_stats.total_payments}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xl font-semibold text-green-600">{paymentProfile.payment_stats.completed_payments}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-xl font-semibold text-yellow-600">{paymentProfile.payment_stats.pending_payments}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Subscription Payments</div>
              <div className="text-xl font-semibold text-violet-600">{paymentProfile.payment_stats.subscription_payments}</div>
            </div>
          </div>
          {paymentProfile.active_subscription && (
            <div className="mt-3 pt-3 border-t border-violet-200">
              <div className="text-sm text-violet-700">
                Active subscription: {paymentProfile.active_subscription.plan} ({paymentProfile.active_subscription.billing_cycle})
                {paymentProfile.active_subscription.end_date &&
                  ` - Expires: ${new Date(paymentProfile.active_subscription.end_date).toLocaleDateString()}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show summary cards or no-data view */}
      {loading ? (
        <div className="text-center py-6">Loading payment analytics...</div>
      ) : analyticsData && analyticsData.has_payments ? (
        renderAnalytics()
      ) : (
        renderNoPaymentsView()
      )}
    </div>
  );
};
