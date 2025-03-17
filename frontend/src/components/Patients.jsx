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
    <div>
      <h2>Patient List</h2>
      <ul>
        {patients.map(patient => (
          <li key={patient.id}>{patient.name} - {patient.bpStatus}</li>
        ))}
      </ul>
    </div>
  );
};

export default Patients;
