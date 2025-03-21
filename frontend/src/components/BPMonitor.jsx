import React from "react";
import { useState } from "react";
import axios from "axios";

const BPMonitor = () => {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const accessToken = localStorage.getItem("access_token");
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/predict",
        { systolic, diastolic, heart_rate: heartRate },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setResult(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred.");
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
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Result</h3>
          <p className="mb-2"><span className="font-medium">Category:</span> {result.category}</p>
          <p className="mb-2"><span className="font-medium">Recommendation:</span> {result.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default BPMonitor;