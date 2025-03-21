import React from "react";
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const BPChart = ({ readings }) => {
  const timestamps = readings.map((reading) =>
    new Date(reading.timestamp).toLocaleDateString()
  );
  const systolicData = readings.map((reading) => reading.systolic);
  const diastolicData = readings.map((reading) => reading.diastolic);

  const data = {
    labels: timestamps,
    datasets: [
      {
        label: "Systolic BP",
        data: systolicData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
      },
      {
        label: "Diastolic BP",
        data: diastolicData,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,  // Add this to allow custom sizing
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Blood Pressure Trends",
      },
    },
  };

  return (
    <div className="w-full h-[400px] p-4 bg-white rounded-lg shadow-md">
      <Line data={data} options={options} />
    </div>
  );
};
BPChart.propTypes = {
  readings: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      systolic: PropTypes.number.isRequired,
      diastolic: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default BPChart;