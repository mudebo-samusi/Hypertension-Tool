import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import BPChart from "./BPChart";

const History = () => {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReadings = async () => {
      const accessToken = localStorage.getItem("access_token");
      try {
        const response = await axios.get("http://127.0.0.1:5000/get-readings", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setReadings(response.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch readings.");
      }
    };

    fetchReadings();
  }, []);

  return (
    <div>
      <h2>Historical Readings</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <BPChart readings={readings} />
      <table className="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Systolic BP</th>
            <th>Diastolic BP</th>
            <th>Heart Rate</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading, index) => (
            <tr key={index}>
              <td>{new Date(reading.timestamp).toLocaleString()}</td>
              <td>{reading.systolic}</td>
              <td>{reading.diastolic}</td>
              <td>{reading.heart_rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default History;