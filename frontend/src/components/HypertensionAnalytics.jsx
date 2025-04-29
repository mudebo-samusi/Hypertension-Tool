import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Analytics Services
const AnalyticsService = {
  // Process readings for trend charts
  prepareChartData: (readings) => {
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    return sortedReadings.map(reading => ({
      date: new Date(reading.timestamp).toLocaleDateString(),
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heart_rate: reading.heart_rate
    }));
  },
  
  // Calculate BP classification distribution
  prepareBPDistribution: (readings) => {
    const categories = {
      normal: 0,
      elevated: 0,
      stage1: 0,
      stage2: 0,
      crisis: 0
    };
    
    readings.forEach(reading => {
      const { systolic, diastolic } = reading;
      
      if (systolic > 180 || diastolic > 120) {
        categories.crisis++;
      } else if (systolic >= 140 || diastolic >= 90) {
        categories.stage2++;
      } else if (systolic >= 130 || diastolic >= 80) {
        categories.stage1++;
      } else if (systolic >= 120 && diastolic < 80) {
        categories.elevated++;
      } else {
        categories.normal++;
      }
    });
    
    return [
      { name: 'Normal', value: categories.normal, color: '#4CAF50' },
      { name: 'Elevated', value: categories.elevated, color: '#FFC107' },
      { name: 'Stage 1', value: categories.stage1, color: '#FF9800' },
      { name: 'Stage 2', value: categories.stage2, color: '#F44336' },
      { name: 'Crisis', value: categories.crisis, color: '#9C27B0' }
    ];
  },
  
  // Prepare time of day analysis
  prepareTimeOfDayAnalysis: (readings) => {
    const timePeriods = {
      morning: { count: 0, systolic: 0, diastolic: 0 },
      afternoon: { count: 0, systolic: 0, diastolic: 0 },
      evening: { count: 0, systolic: 0, diastolic: 0 },
      night: { count: 0, systolic: 0, diastolic: 0 }
    };
    
    readings.forEach(reading => {
      const hour = new Date(reading.timestamp).getHours();
      let period;
      
      if (hour >= 5 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17 && hour < 22) period = 'evening';
      else period = 'night';
      
      timePeriods[period].count++;
      timePeriods[period].systolic += reading.systolic;
      timePeriods[period].diastolic += reading.diastolic;
    });
    
    // Calculate averages
    Object.keys(timePeriods).forEach(period => {
      if (timePeriods[period].count > 0) {
        timePeriods[period].systolic = Math.round(timePeriods[period].systolic / timePeriods[period].count);
        timePeriods[period].diastolic = Math.round(timePeriods[period].diastolic / timePeriods[period].count);
      }
    });
    
    return [
      { name: 'Morning', systolic: timePeriods.morning.systolic, diastolic: timePeriods.morning.diastolic },
      { name: 'Afternoon', systolic: timePeriods.afternoon.systolic, diastolic: timePeriods.afternoon.diastolic },
      { name: 'Evening', systolic: timePeriods.evening.systolic, diastolic: timePeriods.evening.diastolic },
      { name: 'Night', systolic: timePeriods.night.systolic, diastolic: timePeriods.night.diastolic }
    ];
  },
  
  // Analyze data and generate AI insights
  generateInsights: (readings) => {
    if (!readings || readings.length === 0) {
      return {
        summary: "Not enough data to generate insights.",
        recommendations: ["Start recording your blood pressure regularly to receive personalized insights."],
        riskLevel: "unknown"
      };
    }
    
    // Extract values
    const systolicValues = readings.map(reading => reading.systolic);
    const diastolicValues = readings.map(reading => reading.diastolic);
    const heartRateValues = readings.map(reading => reading.heart_rate);
    
    // Calculate average values
    const avgSystolic = Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length);
    const avgDiastolic = Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length);
    const avgHeartRate = Math.round(heartRateValues.reduce((a, b) => a + b, 0) / heartRateValues.length);
    
    // Determine risk level based on average readings
    let riskLevel = "normal";
    let recommendations = [];
    let summary = "";
    
    if (avgSystolic >= 140 || avgDiastolic >= 90) {
      riskLevel = "high";
      summary = `Your average blood pressure (${avgSystolic}/${avgDiastolic} mmHg) indicates hypertension. This is above the normal range.`;
      recommendations = [
        "Consider consulting with your healthcare provider",
        "Reduce sodium intake to less than 2,300mg per day",
        "Aim for at least 150 minutes of moderate exercise per week",
        "Practice stress reduction techniques like meditation"
      ];
    } else if (avgSystolic >= 130 || avgDiastolic >= 80) {
      riskLevel = "elevated";
      summary = `Your average blood pressure (${avgSystolic}/${avgDiastolic} mmHg) is elevated. While not hypertensive, it's above the ideal range.`;
      recommendations = [
        "Monitor your blood pressure regularly",
        "Consider the DASH diet which is rich in fruits, vegetables, and low-fat dairy",
        "Limit alcohol consumption",
        "Maintain regular physical activity"
      ];
    } else {
      riskLevel = "normal";
      summary = `Your average blood pressure (${avgSystolic}/${avgDiastolic} mmHg) is within normal range. Great job maintaining healthy blood pressure!`;
      recommendations = [
        "Continue your current healthy lifestyle practices",
        "Maintain regular blood pressure monitoring",
        "Stay hydrated and maintain a balanced diet",
        "Aim for 7-8 hours of quality sleep"
      ];
    }
    
    // Trend analysis
    const recentReadings = readings.slice(-5);
    const recentSystolic = recentReadings.map(r => r.systolic);
    
    const isIncreasing = recentSystolic.every((val, i, arr) => i === 0 || val >= arr[i-1]);
    const isDecreasing = recentSystolic.every((val, i, arr) => i === 0 || val <= arr[i-1]);
    
    if (isIncreasing && recentReadings.length >= 3) {
      summary += " Your blood pressure shows an increasing trend over recent readings.";
      recommendations.unshift("Your blood pressure is trending upward - consider reviewing medication compliance and sodium intake");
    } else if (isDecreasing && recentReadings.length >= 3) {
      summary += " Your blood pressure shows a decreasing trend over recent readings.";
      recommendations.unshift("Your blood pressure is trending downward - your current management appears effective");
    }
    
    return {
      summary,
      recommendations,
      riskLevel,
      statistics: {
        avgSystolic,
        avgDiastolic,
        avgHeartRate,
        maxSystolic: Math.max(...systolicValues),
        minSystolic: Math.min(...systolicValues),
        maxDiastolic: Math.max(...diastolicValues),
        minDiastolic: Math.min(...diastolicValues),
        readingsCount: readings.length
      }
    };
  }
};

// Chart Components
const BPTrendChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">Blood Pressure Trend</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="systolic" stroke="#8884d8" name="Systolic" />
          <Line type="monotone" dataKey="diastolic" stroke="#82ca9d" name="Diastolic" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const HeartRateChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">Heart Rate Trend</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="heart_rate" stroke="#ff7300" name="Heart Rate" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const BPDistributionChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">BP Classification Distribution</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const TimeOfDayChart = ({ data }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold mb-4">Time of Day Analysis</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="systolic" fill="#8884d8" name="Systolic" />
          <Bar dataKey="diastolic" fill="#82ca9d" name="Diastolic" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Risk Card Component
const RiskCard = ({ insights }) => {
  if (!insights) return null;
  
  const riskColors = {
    normal: 'bg-green-100 border-green-500 text-green-800',
    elevated: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    high: 'bg-red-100 border-red-500 text-red-800',
    unknown: 'bg-gray-100 border-gray-500 text-gray-800'
  };
  
  const cardClass = riskColors[insights.riskLevel] || riskColors.unknown;
  
  return (
    <div className={`p-4 rounded-lg border-l-4 ${cardClass} mb-6`}>
      <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
      <p className="mb-4">{insights.summary}</p>
      
      <h4 className="font-medium mb-2">Recommendations:</h4>
      <ul className="list-disc pl-5 space-y-1">
        {insights.recommendations.map((rec, index) => (
          <li key={index}>{rec}</li>
        ))}
      </ul>
      
      {insights.statistics && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Statistics Summary:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Average Systolic: <span className="font-semibold">{insights.statistics.avgSystolic} mmHg</span></div>
            <div>Average Diastolic: <span className="font-semibold">{insights.statistics.avgDiastolic} mmHg</span></div>
            <div>Average Heart Rate: <span className="font-semibold">{insights.statistics.avgHeartRate} bpm</span></div>
            <div>Total Readings: <span className="font-semibold">{insights.statistics.readingsCount}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const HypertensionAnalytics = () => {
  const [readings, setReadings] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch blood pressure readings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.getReadings();
        setReadings(data.readings || []);
        
        // After fetching readings, generate AI insights
        if (data.readings && data.readings.length > 0) {
          // In a real application, this would be:
          // const aiInsights = await api.getAIInsights(data.readings);
          // For now, we'll simulate the AI response:
          const aiInsights = AnalyticsService.generateInsights(data.readings);
          setInsights(aiInsights);
        } else {
          setInsights(AnalyticsService.generateInsights([]));
        }
        
        setError("");
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage = err.msg || err.message || "Failed to fetch data.";
        setError(errorMessage);
        
        if (err.authError) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Prepare chart data
  const chartData = readings.length > 0 ? AnalyticsService.prepareChartData(readings) : [];
  const bpDistribution = readings.length > 0 ? AnalyticsService.prepareBPDistribution(readings) : [];
  const timeOfDayData = readings.length > 0 ? AnalyticsService.prepareTimeOfDayAnalysis(readings) : [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">BP Analytics Dashboard</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* AI Insights Section */}
          <div className="mb-8">
            <RiskCard insights={insights} />
          </div>
          
          {/* Main Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BPTrendChart data={chartData} />
            <HeartRateChart data={chartData} />
            <BPDistributionChart data={bpDistribution} />
            <TimeOfDayChart data={timeOfDayData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default HypertensionAnalytics;