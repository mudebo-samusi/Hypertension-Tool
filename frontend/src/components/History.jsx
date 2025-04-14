import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import BPChart from "./BPChart";

const History = () => {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        if (!localStorage.getItem('access_token')) {
          navigate('/login');
          return;
        }
        
        // Add a debug log to check the token
        console.log("Token being used:", localStorage.getItem('access_token'));
        
        const data = await api.getReadings();
        setReadings(data.readings || []);
        setError("");
      } catch (err) {
        console.error('Error fetching readings:', err);
        const errorMessage = err.msg || err.message || "Failed to fetch readings.";
        setError(errorMessage);
        
        if (errorMessage.toLowerCase().includes('token') || 
            errorMessage.toLowerCase().includes('login') ||
            errorMessage.toLowerCase().includes('subject')) {
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      }
    };

    fetchReadings();
  }, [navigate]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Historical Readings</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <BPChart readings={readings} />
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Systolic BP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Diastolic BP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Heart Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {readings.map((reading, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(reading.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {reading.systolic}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {reading.diastolic}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {reading.heart_rate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;