import React, { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Heart, AlertTriangle, Utensils, TrendingUp, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import api from "../services/api";

// Simulated diet recommendations based on BP readings
const getDietRecommendations = (readings) => {
  if (!readings || readings.length === 0) return [];
  
  // Calculate average readings
  const recentReadings = readings.slice(-7);
  const avgSystolic = recentReadings.reduce((sum, r) => sum + r.systolic, 0) / recentReadings.length;
  const avgDiastolic = recentReadings.reduce((sum, r) => sum + r.diastolic, 0) / recentReadings.length;
  
  const recommendations = [];
  
  // High blood pressure recommendations
  if (avgSystolic > 140 || avgDiastolic > 90) {
    recommendations.push({
      type: "critical",
      title: "Reduce Sodium Intake",
      description: "Patient's blood pressure is elevated. Recommend a low-sodium diet with less than 1,500mg per day.",
      foods: ["Fresh fruits", "Vegetables", "Whole grains", "Low-fat dairy"]
    });
    recommendations.push({
      type: "warning",
      title: "Increase Potassium",
      description: "Potassium can help lower blood pressure. Consider foods rich in potassium.",
      foods: ["Bananas", "Potatoes", "Spinach", "Avocados"]
    });
  }
  
  // Moderate blood pressure recommendations
  else if (avgSystolic > 120 || avgDiastolic > 80) {
    recommendations.push({
      type: "warning",
      title: "Monitor Sodium",
      description: "Keep sodium intake below 2,300mg per day to prevent further increase in blood pressure.",
      foods: ["Herbs and spices", "Fresh meat instead of processed", "Homemade meals", "Unsalted nuts"]
    });
  }
  
  // Normal blood pressure maintenance
  else {
    recommendations.push({
      type: "healthy",
      title: "Maintain DASH Diet",
      description: "Continue with heart-healthy eating patterns to sustain good blood pressure.",
      foods: ["Lean proteins", "Whole grains", "Fruits and vegetables", "Low-fat dairy"]
    });
  }
  
  // Add heart rate specific recommendation
  const avgHeartRate = recentReadings.reduce((sum, r) => sum + r.heart_rate, 0) / recentReadings.length;
  if (avgHeartRate > 100) {
    recommendations.push({
      type: "warning",
      title: "Heart Rate Management",
      description: "Patient's heart rate is elevated. Consider foods that support heart health and avoid stimulants.",
      foods: ["Oatmeal", "Fatty fish", "Berries", "Dark chocolate (in moderation)"]
    });
  }
  
  return recommendations;
};

// Calculate BP statistics
const calculateStats = (readings) => {
  if (!readings || readings.length === 0) return null;
  
  // Get last 30 readings or all if less than 30
  const recentReadings = readings.slice(-30);
  
  const systolicValues = recentReadings.map(r => r.systolic);
  const diastolicValues = recentReadings.map(r => r.diastolic);
  const heartRateValues = recentReadings.map(r => r.heart_rate);
  
  // Calculate trends (last reading vs average of previous 7)
  const lastIndex = recentReadings.length - 1;
  const prevWeekAvgSys = recentReadings.slice(Math.max(0, lastIndex - 7), lastIndex)
    .reduce((sum, r) => sum + r.systolic, 0) / Math.min(7, lastIndex);
  const prevWeekAvgDia = recentReadings.slice(Math.max(0, lastIndex - 7), lastIndex)
    .reduce((sum, r) => sum + r.diastolic, 0) / Math.min(7, lastIndex);
  const prevWeekAvgHr = recentReadings.slice(Math.max(0, lastIndex - 7), lastIndex)
    .reduce((sum, r) => sum + r.heart_rate, 0) / Math.min(7, lastIndex);
  
  const lastReading = recentReadings[lastIndex];
  
  return {
    systolic: {
      min: Math.min(...systolicValues),
      max: Math.max(...systolicValues),
      avg: systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length,
      current: lastReading.systolic,
      trend: lastReading.systolic - prevWeekAvgSys
    },
    diastolic: {
      min: Math.min(...diastolicValues),
      max: Math.max(...diastolicValues),
      avg: diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length,
      current: lastReading.diastolic,
      trend: lastReading.diastolic - prevWeekAvgDia
    },
    heartRate: {
      min: Math.min(...heartRateValues),
      max: Math.max(...heartRateValues),
      avg: heartRateValues.reduce((a, b) => a + b, 0) / heartRateValues.length,
      current: lastReading.heart_rate,
      trend: lastReading.heart_rate - prevWeekAvgHr
    },
    readingsCount: readings.length,
    lastReadingTime: new Date(lastReading.timestamp),
    criticalCount: recentReadings.filter(r => r.systolic > 140 || r.diastolic > 90).length
  };
};

// Format data for time range analysis
const getTimeRangeData = (readings) => {
  if (!readings || readings.length === 0) return [];
  
  const timeRanges = [
    { name: "Morning (6-12)", readings: [] },
    { name: "Afternoon (12-18)", readings: [] },
    { name: "Evening (18-24)", readings: [] },
    { name: "Night (0-6)", readings: [] }
  ];
  
  readings.forEach(reading => {
    const hour = new Date(reading.timestamp).getHours();
    if (hour >= 6 && hour < 12) timeRanges[0].readings.push(reading);
    else if (hour >= 12 && hour < 18) timeRanges[1].readings.push(reading);
    else if (hour >= 18) timeRanges[2].readings.push(reading);
    else timeRanges[3].readings.push(reading);
  });
  
  return timeRanges.map(range => {
    if (range.readings.length === 0) {
      return {
        name: range.name,
        avgSystolic: 0,
        avgDiastolic: 0,
        avgHeartRate: 0,
        count: 0
      };
    }
    
    return {
      name: range.name,
      avgSystolic: range.readings.reduce((sum, r) => sum + r.systolic, 0) / range.readings.length,
      avgDiastolic: range.readings.reduce((sum, r) => sum + r.diastolic, 0) / range.readings.length,
      avgHeartRate: range.readings.reduce((sum, r) => sum + r.heart_rate, 0) / range.readings.length,
      count: range.readings.length
    };
  });
};

// Helper to format date for chart display
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const AnalyticsDashboard = () => {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");
  const [dietRecommendations, setDietRecommendations] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeRangeData, setTimeRangeData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.getReadings();
        const fetchedReadings = data.readings || [];
        
        setReadings(fetchedReadings);
        
        // Process the readings
        if (fetchedReadings.length > 0) {
          setStats(calculateStats(fetchedReadings));
          setDietRecommendations(getDietRecommendations(fetchedReadings));
          setTimeRangeData(getTimeRangeData(fetchedReadings));
        }
        
        setError("");
      } catch (err) {
        console.error('Error fetching readings:', err);
        const errorMessage = err.msg || err.message || "Failed to fetch readings.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format data for the line chart
  const chartData = readings.slice(-14).map(reading => ({
    date: formatDate(reading.timestamp),
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    heartRate: reading.heart_rate
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Hypertension Analytics Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <TrendingUp className="text-blue-500 mr-2" size={20} />
              <h3 className="text-lg font-semibold">Blood Pressure</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500">Systolic</p>
                <p className="text-2xl font-bold">{stats.systolic.current} 
                  <span className={`text-sm ml-2 ${stats.systolic.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {stats.systolic.trend > 0 ? 
                    <span className="flex items-center"><ArrowUp size={12} /> {stats.systolic.trend.toFixed(1)}</span> : 
                    <span className="flex items-center"><ArrowDown size={12} /> {Math.abs(stats.systolic.trend).toFixed(1)}</span>}
                  </span>
                </p>
                <p className="text-xs text-gray-500">Avg: {stats.systolic.avg.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Diastolic</p>
                <p className="text-2xl font-bold">{stats.diastolic.current}
                  <span className={`text-sm ml-2 ${stats.diastolic.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {stats.diastolic.trend > 0 ? 
                    <span className="flex items-center"><ArrowUp size={12} /> {stats.diastolic.trend.toFixed(1)}</span> : 
                    <span className="flex items-center"><ArrowDown size={12} /> {Math.abs(stats.diastolic.trend).toFixed(1)}</span>}
                  </span>
                </p>
                <p className="text-xs text-gray-500">Avg: {stats.diastolic.avg.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <Heart className="text-red-500 mr-2" size={20} />
              <h3 className="text-lg font-semibold">Heart Rate</h3>
            </div>
            <p className="text-2xl font-bold">{stats.heartRate.current} BPM
              <span className={`text-sm ml-2 ${stats.heartRate.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.heartRate.trend > 0 ? 
                <span className="flex items-center"><ArrowUp size={12} /> {stats.heartRate.trend.toFixed(1)}</span> : 
                <span className="flex items-center"><ArrowDown size={12} /> {Math.abs(stats.heartRate.trend).toFixed(1)}</span>}
              </span>
            </p>
            <p className="text-sm mt-1">Range: {stats.heartRate.min} - {stats.heartRate.max} BPM</p>
            <p className="text-xs text-gray-500">Avg: {stats.heartRate.avg.toFixed(1)} BPM</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <AlertTriangle className={`${stats.criticalCount > 0 ? 'text-amber-500' : 'text-green-500'} mr-2`} size={20} />
              <h3 className="text-lg font-semibold">Status Overview</h3>
            </div>
            <p className="text-sm">
              <span className="font-medium">Last reading:</span> {stats.lastReadingTime.toLocaleString()}
            </p>
            <p className="text-sm">
              <span className="font-medium">Critical readings:</span> {stats.criticalCount} in last 30 days
            </p>
            <p className="text-sm">
              <span className="font-medium">Total records:</span> {stats.readingsCount}
            </p>
          </div>
        </div>
      )}
      
      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Blood Pressure Trends (Last 14 readings)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="systolic" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="diastolic" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="heartRate" stroke="#ff7300" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center mt-2">
          <div className="flex items-center mx-2">
            <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
            <span className="text-xs">Systolic</span>
          </div>
          <div className="flex items-center mx-2">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            <span className="text-xs">Diastolic</span>
          </div>
          <div className="flex items-center mx-2">
            <div className="w-3 h-3 bg-orange-500 rounded mr-1"></div>
            <span className="text-xs">Heart Rate</span>
          </div>
        </div>
      </div>
      
      {/* Time Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Calendar className="text-indigo-500 mr-2" size={20} />
            <h3 className="text-lg font-semibold">Time-of-Day Analysis</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeRangeData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgSystolic" fill="#8884d8" />
                <Bar dataKey="avgDiastolic" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-2">
            <div className="flex items-center mx-2">
              <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
              <span className="text-xs">Avg Systolic</span>
            </div>
            <div className="flex items-center mx-2">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span className="text-xs">Avg Diastolic</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-4">
            <Activity className="text-teal-500 mr-2" size={20} />
            <h3 className="text-lg font-semibold">Reading Distributions</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {timeRangeData.map((range, index) => (
              <div key={index} className="text-center p-2 border rounded">
                <p className="text-sm font-medium">{range.name}</p>
                <p className="text-xs text-gray-500">{range.count} readings</p>
                <div className={`text-sm font-bold ${
                  range.avgSystolic > 140 || range.avgDiastolic > 90 
                    ? 'text-red-500' 
                    : range.avgSystolic > 120 || range.avgDiastolic > 80 
                      ? 'text-amber-500' 
                      : 'text-green-500'
                }`}>
                  {range.avgSystolic.toFixed(0)}/{range.avgDiastolic.toFixed(0)}
                </div>
                <p className="text-xs">{range.avgHeartRate.toFixed(0)} BPM</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* AI Diet Recommendations */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <Utensils className="text-green-600 mr-2" size={20} />
          <h3 className="text-lg font-semibold">AI Diet Recommendations</h3>
        </div>
        
        {dietRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dietRecommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  rec.type === 'critical' 
                    ? 'border-red-200 bg-red-50' 
                    : rec.type === 'warning' 
                      ? 'border-amber-200 bg-amber-50' 
                      : 'border-green-200 bg-green-50'
                }`}
              >
                <h4 className="font-bold text-lg mb-2">{rec.title}</h4>
                <p className="text-sm mb-3">{rec.description}</p>
                <div>
                  <p className="text-sm font-semibold mb-1">Recommended Foods:</p>
                  <div className="flex flex-wrap">
                    {rec.foods.map((food, i) => (
                      <span key={i} className="bg-white text-xs px-2 py-1 rounded-full mr-2 mb-2 shadow-sm">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No diet recommendations available. Please add more readings.</p>
        )}
      </div>
      
      {/* Risk Assessment */}
      {stats && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Blood Pressure Category</p>
              <div className={`text-lg font-bold ${
                stats.systolic.avg > 140 || stats.diastolic.avg > 90 
                  ? 'text-red-500' 
                  : stats.systolic.avg > 120 || stats.diastolic.avg > 80 
                    ? 'text-amber-500' 
                    : 'text-green-500'
              }`}>
                {stats.systolic.avg > 180 || stats.diastolic.avg > 120 
                  ? 'Hypertensive Crisis' 
                  : stats.systolic.avg >= 140 || stats.diastolic.avg >= 90 
                    ? 'Hypertension Stage 2' 
                    : stats.systolic.avg >= 130 || stats.diastolic.avg >= 80 
                      ? 'Hypertension Stage 1' 
                      : stats.systolic.avg >= 120 && stats.systolic.avg < 130 && stats.diastolic.avg < 80 
                        ? 'Elevated' 
                        : 'Normal'}
              </div>
            </div>
            
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Consistency Score</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(100, (readings.length / 30) * 100)}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm">{Math.min(100, (readings.length / 30) * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Based on reading frequency</p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Variability Index</p>
              {stats.systolic.max - stats.systolic.min > 30 || stats.diastolic.max - stats.diastolic.min > 20 ? (
                <p className="text-amber-500 font-bold">High Variability</p>
              ) : (
                <p className="text-green-500 font-bold">Normal Variability</p>
              )}
              <p className="text-xs text-gray-500">Systolic range: {stats.systolic.max - stats.systolic.min} mmHg</p>
              <p className="text-xs text-gray-500">Diastolic range: {stats.diastolic.max - stats.diastolic.min} mmHg</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;