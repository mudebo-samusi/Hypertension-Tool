import React, { useState, useEffect, useContext, createContext } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import api from "../services/api";

// Colors
const COLORS = {
  primary: "#4f46e5", // indigo-600
  secondary: "#0ea5e9", // sky-500
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  gray: "#6b7280" // gray-500
};

// Dashboard Context
const DashboardContext = createContext();

// API Service Hooks

// Custom hook for fetching readings data
const useReadings = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReadings = async () => {
      try {
        setLoading(true);
        const data = await api.getReadings();
        setReadings(data.readings || []);
        setError("");
      } catch (err) {
        console.error('Error fetching readings:', err);
        setError(err.msg || err.message || "Failed to fetch readings");
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, []);

  return { readings, loading, error };
};

// Custom hook for fetching patients data
const usePatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        // Assuming the API endpoint exists
        const data = await api.getPatients();
        setPatients(data.patients || []);
        setError("");
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError(err.msg || err.message || "Failed to fetch patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return { patients, loading, error };
};

// Custom hook for fetching doctors data
const useDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        // Assuming the API endpoint exists
        const data = await api.getDoctors();
        setDoctors(data.doctors || []);
        setError("");
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError(err.msg || err.message || "Failed to fetch doctors");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  return { doctors, loading, error };
};

// Shared Components

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    {message}
  </div>
);

const Card = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
    {children}
  </div>
);

// Dashboard Provider Component
const DashboardProvider = ({ children }) => {
  const readingsData = useReadings();
  const patientsData = usePatients();
  const doctorsData = useDoctors();
  
  // Simulate organization data
  const [orgMetrics, setOrgMetrics] = useState({
    patientSatisfaction: 87,
    treatmentSuccessRate: 92,
    avgAppointmentWaitTime: 3.2, // days
    reAdmissionRate: 4.3, // percentage
    avgStayDuration: 5.1, // days
  });

  const value = {
    readings: readingsData.readings,
    readingsLoading: readingsData.loading,
    readingsError: readingsData.error,
    patients: patientsData.patients,
    patientsLoading: patientsData.loading,
    patientsError: patientsData.error,
    doctors: doctorsData.doctors,
    doctorsLoading: doctorsData.loading,
    doctorsError: doctorsData.error,
    orgMetrics
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use dashboard context
const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

// Chart Components

const BPChart = ({ readings }) => {
  // Format data for chart
  const data = readings.map(reading => ({
    timestamp: new Date(reading.timestamp).toLocaleDateString(),
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    heartRate: reading.heart_rate
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="systolic" stroke={COLORS.danger} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="diastolic" stroke={COLORS.primary} />
        <Line type="monotone" dataKey="heartRate" stroke={COLORS.secondary} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
};

const PatientMetricsChart = ({ patients }) => {
  // For demonstration, create age distribution data
  const ageGroups = {
    "0-18": 0,
    "19-35": 0,
    "36-50": 0,
    "51-65": 0,
    "65+": 0
  };
  
  // Simulate patient age data
  patients.forEach(patient => {
    const age = patient.age || Math.floor(Math.random() * 80);
    if (age <= 18) ageGroups["0-18"]++;
    else if (age <= 35) ageGroups["19-35"]++;
    else if (age <= 50) ageGroups["36-50"]++;
    else if (age <= 65) ageGroups["51-65"]++;
    else ageGroups["65+"]++;
  });
  
  const data = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

const DoctorPerformanceChart = ({ doctors }) => {
  // Create simulated performance data
  const data = doctors.map(doctor => {
    return {
      name: doctor.name || `Dr. ${doctor.lastName || 'Smith'}`,
      patientSatisfaction: Math.floor(70 + Math.random() * 30),
      treatmentSuccess: Math.floor(75 + Math.random() * 25),
      efficiency: Math.floor(60 + Math.random() * 40)
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="patientSatisfaction" fill={COLORS.primary} name="Patient Satisfaction" />
        <Bar dataKey="treatmentSuccess" fill={COLORS.success} name="Treatment Success" />
        <Bar dataKey="efficiency" fill={COLORS.secondary} name="Efficiency" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Dashboard Sections/Panels

const OverviewPanel = () => {
  const { readings, readingsLoading, readingsError, orgMetrics } = useDashboard();

  if (readingsLoading) return <LoadingSpinner />;
  if (readingsError) return <ErrorDisplay message={readingsError} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50">
          <div className="flex flex-col items-center">
            <p className="text-gray-600">Patient Satisfaction</p>
            <p className="text-3xl font-bold text-blue-600">{orgMetrics.patientSatisfaction}%</p>
          </div>
        </Card>
        <Card className="bg-green-50">
          <div className="flex flex-col items-center">
            <p className="text-gray-600">Treatment Success Rate</p>
            <p className="text-3xl font-bold text-green-600">{orgMetrics.treatmentSuccessRate}%</p>
          </div>
        </Card>
        <Card className="bg-purple-50">
          <div className="flex flex-col items-center">
            <p className="text-gray-600">Re-admission Rate</p>
            <p className="text-3xl font-bold text-purple-600">{orgMetrics.reAdmissionRate}%</p>
          </div>
        </Card>
      </div>
      
      <Card title="Blood Pressure Trends">
        <BPChart readings={readings} />
      </Card>
    </div>
  );
};

const PatientAnalysisPanel = () => {
  const { patients, patientsLoading, patientsError } = useDashboard();

  if (patientsLoading) return <LoadingSpinner />;
  if (patientsError) return <ErrorDisplay message={patientsError} />;

  // Simulate AI health analysis for a patient
  const getHealthRiskAssessment = (patient) => {
    const riskFactors = [];
    let riskLevel = "Low";
    
    // Simulation based on typical vitals and metrics
    if (patient.bpSystolic > 140 || patient.bpDiastolic > 90) {
      riskFactors.push("Hypertension");
      riskLevel = "Moderate";
    }
    
    if (patient.bmi > 30) {
      riskFactors.push("Obesity");
      riskLevel = riskLevel === "Moderate" ? "High" : "Moderate";
    }
    
    if (patient.cholesterol > 240) {
      riskFactors.push("High Cholesterol");
      riskLevel = "High";
    }
    
    if (patient.glucose > 126) {
      riskFactors.push("Diabetes Risk");
      riskLevel = "High";
    }
    
    if (riskFactors.length === 0) {
      riskFactors.push("No significant risk factors");
    }
    
    return { riskLevel, riskFactors };
  };

  // Create simulated health data for patients
  const patientsWithAnalysis = patients.map(patient => ({
    ...patient,
    bpSystolic: patient.bpSystolic || Math.floor(110 + Math.random() * 40),
    bpDiastolic: patient.bpDiastolic || Math.floor(70 + Math.random() * 30),
    bmi: patient.bmi || (20 + Math.random() * 15).toFixed(1),
    cholesterol: patient.cholesterol || Math.floor(150 + Math.random() * 100),
    glucose: patient.glucose || Math.floor(90 + Math.random() * 60),
    ...getHealthRiskAssessment(patient)
  }));

  return (
    <div className="space-y-6">
      <Card title="Patient Age Distribution">
        <PatientMetricsChart patients={patients} />
      </Card>
      
      <Card title="Patient Health Risk Analysis">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BMI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Factors</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patientsWithAnalysis.slice(0, 5).map((patient, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{patient.name || `Patient ${index + 1}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.bpSystolic}/{patient.bpDiastolic}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.bmi}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${patient.riskLevel === "Low" ? "bg-green-100 text-green-800" : 
                        patient.riskLevel === "Moderate" ? "bg-yellow-100 text-yellow-800" : 
                        "bg-red-100 text-red-800"}`}>
                      {patient.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.riskFactors.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const DoctorAssignmentPanel = () => {
  const { patients, patientsLoading, patientsError, doctors, doctorsLoading, doctorsError } = useDashboard();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  if (patientsLoading || doctorsLoading) return <LoadingSpinner />;
  if (patientsError) return <ErrorDisplay message={patientsError} />;
  if (doctorsError) return <ErrorDisplay message={doctorsError} />;

  // Simulated doctor specialties and patient conditions
  const specialties = ["Cardiology", "Neurology", "Orthopedics", "Internal Medicine", "Pediatrics"];
  
  const doctorsWithSpecialties = doctors.map((doctor, index) => ({
    ...doctor,
    id: doctor.id || index + 1,
    name: doctor.name || `Dr. ${doctor.lastName || 'Smith'}`,
    specialty: doctor.specialty || specialties[index % specialties.length],
    patientLoad: doctor.patientLoad || Math.floor(Math.random() * 20) + 5,
    availability: doctor.availability || ["Monday", "Wednesday", "Friday"]
  }));

  const patientsWithConditions = patients.map((patient, index) => ({
    ...patient,
    id: patient.id || index + 1,
    name: patient.name || `Patient ${index + 1}`,
    condition: patient.condition || specialties[Math.floor(Math.random() * specialties.length)],
    severity: patient.severity || Math.floor(Math.random() * 10) + 1
  }));

  // Calculate doctor-patient compatibility
  const getCompatibility = (doctor, patient) => {
    let score = 0;
    // Specialty matches patient condition
    if (doctor.specialty === patient.condition) {
      score += 5;
    }
    
    // Doctor with lower patient load gets higher score
    score += Math.max(0, 10 - doctor.patientLoad/2);
    
    return Math.min(Math.round(score), 10);
  };

  const handleAssign = () => {
    if (!selectedPatient || !selectedDoctor) return;
    
    // Simulated API call to assign doctor to patient
    setTimeout(() => {
      setAssignmentSuccess(true);
      setTimeout(() => setAssignmentSuccess(false), 3000);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {assignmentSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Successfully assigned Dr. {doctorsWithSpecialties.find(d => d.id === selectedDoctor)?.name} 
          to patient {patientsWithConditions.find(p => p.id === selectedPatient)?.name}!
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Select Patient">
          <div className="space-y-4">
            <select 
              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedPatient || ""}
              onChange={(e) => setSelectedPatient(parseInt(e.target.value))}
            >
              <option value="">-- Select Patient --</option>
              {patientsWithConditions.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} - {patient.condition} (Severity: {patient.severity})
                </option>
              ))}
            </select>
            
            {selectedPatient && (
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium">Patient Details</h4>
                <p>Condition: {patientsWithConditions.find(p => p.id === selectedPatient)?.condition}</p>
                <p>Severity: {patientsWithConditions.find(p => p.id === selectedPatient)?.severity}/10</p>
              </div>
            )}
          </div>
        </Card>
        
        <Card title="Assign Doctor">
          <div className="space-y-4">
            <select 
              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedDoctor || ""}
              onChange={(e) => setSelectedDoctor(parseInt(e.target.value))}
              disabled={!selectedPatient}
            >
              <option value="">-- Select Doctor --</option>
              {doctorsWithSpecialties.map(doctor => {
                const compatibility = selectedPatient ? 
                  getCompatibility(doctor, patientsWithConditions.find(p => p.id === selectedPatient)) : 0;
                
                return (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty} (Compatibility: {compatibility}/10)
                  </option>
                );
              })}
            </select>
            
            {selectedDoctor && (
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium">Doctor Details</h4>
                <p>Specialty: {doctorsWithSpecialties.find(d => d.id === selectedDoctor)?.specialty}</p>
                <p>Current Patient Load: {doctorsWithSpecialties.find(d => d.id === selectedDoctor)?.patientLoad}</p>
                <p>Availability: {doctorsWithSpecialties.find(d => d.id === selectedDoctor)?.availability.join(", ")}</p>
              </div>
            )}
            
            <button
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={!selectedPatient || !selectedDoctor}
              onClick={handleAssign}
            >
              Assign Doctor to Patient
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const PerformancePanel = () => {
  const { doctors, doctorsLoading, doctorsError, orgMetrics } = useDashboard();

  if (doctorsLoading) return <LoadingSpinner />;
  if (doctorsError) return <ErrorDisplay message={doctorsError} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50">
          <div className="flex flex-col items-center">
            <p className="text-gray-600">Avg. Appointment Wait</p>
            <p className="text-3xl font-bold text-blue-600">{orgMetrics.avgAppointmentWaitTime} days</p>
          </div>
        </Card>
        <Card className="bg-green-50">
          <div className="flex flex-col items-center">
            <p className="text-gray-600">Avg. Stay Duration</p>
            <p className="text-3xl font-bold text-green-600">{orgMetrics.avgStayDuration} days</p>
          </div>
        </Card>
      </div>
      
      <Card title="Doctor Performance Metrics">
        <DoctorPerformanceChart doctors={doctors} />
      </Card>
      
      <Card title="Organization Benchmark Comparison">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry Average</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Patient Satisfaction</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{orgMetrics.patientSatisfaction}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">82%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Above Average
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Treatment Success Rate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{orgMetrics.treatmentSuccessRate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">89%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Above Average
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Re-admission Rate</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{orgMetrics.reAdmissionRate}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">5.1%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Better
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Avg. Appointment Wait</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{orgMetrics.avgAppointmentWaitTime} days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4.7 days</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Better
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "patient-analysis", label: "Patient Analysis" },
    { id: "doctor-assignment", label: "Doctor Assignment" },
    { id: "performance", label: "Performance" }
  ];
  
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-2xl font-bold text-center text-indigo-600">PulseMedic</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold text-gray-900">Healthcare Dashboard</h1>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`
                      ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    `}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="py-6">
              {activeTab === "overview" && <OverviewPanel />}
              {activeTab === "patient-analysis" && <PatientAnalysisPanel />}
              {activeTab === "doctor-assignment" && <DoctorAssignmentPanel />}
              {activeTab === "performance" && <PerformancePanel />}
            </div>
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
};

export default Dashboard;