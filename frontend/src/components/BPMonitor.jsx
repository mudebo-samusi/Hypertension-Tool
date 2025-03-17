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
    <div>
      <h2>BP Monitor</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="systolic" className="form-label">
            Systolic BP
          </label>
          <input
            type="number"
            className="form-control"
            id="systolic"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="diastolic" className="form-label">
            Diastolic BP
          </label>
          <input
            type="number"
            className="form-control"
            id="diastolic"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="heartRate" className="form-label">
            Heart Rate
          </label>
          <input
            type="number"
            className="form-control"
            id="heartRate"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
      {result && (
        <div className="mt-4">
          <h3>Result</h3>
          <p><strong>Category:</strong> {result.category}</p>
          <p><strong>Recommendation:</strong> {result.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default BPMonitor;