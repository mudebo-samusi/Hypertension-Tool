import React from "react";
import { useState } from "react";
import api from "../services/api";

const BPMonitor = () => {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Create the reading data object
      const readingData = {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heart_rate: Number(heartRate)
      };

      // Make both API calls using our api service
      const [predictionResponse] = await Promise.all([
        api.post("/predict", readingData)
      ]);

      setResult(predictionResponse);
      setError("");
    } catch (err) {
      console.error("Error submitting data:", err);
      setError(err.msg || err.message || "An error occurred.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">BP Monitor</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="systolic" className="block text-sm font-medium text-gray-700 mb-1">
            Systolic BP
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="systolic"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="diastolic" className="block text-sm font-medium text-gray-700 mb-1">
            Diastolic BP
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="diastolic"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 mb-1">
            Heart Rate
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="heartRate"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="w-24 bg-blue-400 text-gray-300 py-2 px-4 rounded-md hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Submit
        </button>
      </form>
      {result && (
        <div className="mt-8 p-4 bg-white shadow rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Prediction Results</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Prediction:</span> {result.prediction}</p>
            <p><span className="font-medium">Risk Level:</span> 
              <span className={`ml-2 px-2 py-1 rounded ${
                result.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                result.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {result.risk_level}
              </span>
            </p>
            <p><span className="font-medium">Confidence:</span> {(result.probability * 100).toFixed(2)}%</p>
            <div className="mt-4">
              <p className="font-medium">Recommendation:</p>
              <p className="mt-1 p-3 bg-blue-50 text-blue-800 rounded">{result.recommendation}</p>
            </div>
            <div className="mt-4">
              <p className="font-medium">Category:</p>
              <p className="mt-1 p-3 bg-violet-50 text-green-500 rounded">{result.bp_category}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BPMonitor;