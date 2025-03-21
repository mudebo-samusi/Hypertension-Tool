import React from "react";
import { useEffect, useState } from "react";
import api from "../services/api";

const Patients = () => {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    api.get("/patients")  // Fetch patients from backend
      .then(res => setPatients(res.data))
      .catch(err => console.error("Error fetching patients:", err));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Patient List</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {patients.map(patient => (
          <div 
            key={patient.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="text-lg font-semibold text-gray-700">{patient.name}</div>
            <div className="text-sm text-gray-600">BP Status: {patient.bpStatus}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Patients;
