import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  Activity, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Search,
  Clock,
  Heart,
  AlertTriangle,
  ArrowUpRight,
  Clipboard,
  CalendarClock
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import api from "../services/api";

// Sample data for charts
const healthScoreData = [
  { name: 'Jan', avgScore: 78 },
  { name: 'Feb', avgScore: 80 },
  { name: 'Mar', avgScore: 77 },
  { name: 'Apr', avgScore: 82 },
  { name: 'May', avgScore: 85 },
];

const appointmentDistributionData = [
  { name: 'Routine Checkup', value: 45 },
  { name: 'Follow-up', value: 25 },
  { name: 'Emergency', value: 10 },
  { name: 'Consultation', value: 20 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PulseDoc() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientStats, setPatientStats] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [patientsData, appointmentsData, alertsData] = await Promise.all([
          api.getPatients(),
          api.getAppointments(),
          api.getAlerts()
        ]);
        setPatients(patientsData.patients || []);
        setAppointments(appointmentsData.appointments || []);
        const now = new Date();
        const upcoming = appointmentsData.appointments.filter(apt => {
          const aptDate = new Date(apt.datetime);
          return aptDate > now && aptDate < new Date(now.getTime() + 48 * 60 * 60 * 1000);
        });
        setUpcomingAppointments(upcoming);
        setAlerts(alertsData.alerts || []);
        setError("");
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      const fetchPatientStats = async () => {
        try {
          const stats = await api.getPatientStats(selectedPatient.id);
          setPatientStats(stats);
        } catch (err) {
          console.error('Error fetching patient stats:', err);
        }
      };
      fetchPatientStats();
    }
  }, [selectedPatient]);

  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toString().includes(searchTerm)
  );

  const calculateHealthRisk = (patient) => {
    if (!patient.readings || patient.readings.length === 0) return "Low";
    const latest = patient.readings[patient.readings.length - 1];
    if (latest.systolic > 140 || latest.diastolic > 90) return "High";
    if (latest.systolic > 120 || latest.diastolic > 80) return "Medium";
    return "Low";
  };

  const handleScheduleAppointment = async (patientId, datetime, type) => {
    try {
      await api.scheduleAppointment({ patientId, datetime, type });
      const updated = await api.getAppointments();
      setAppointments(updated.appointments || []);
    } catch (err) {
      console.error('Error scheduling appointment:', err);
    }
  };

  const renderDashboard = () => (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example content for the dashboard */}
        <div className="p-4 bg-blue-100 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Health Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={healthScoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgScore" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="p-4 bg-green-100 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Appointment Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={appointmentDistributionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {appointmentDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPatientDetail = () => (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Patient Details</h2>
      {selectedPatient ? (
        <div>
          <p><strong>Name:</strong> {selectedPatient.name}</p>
          <p><strong>ID:</strong> {selectedPatient.id}</p>
          <p><strong>Health Risk:</strong> {calculateHealthRisk(selectedPatient)}</p>
          <button
            onClick={() => setSelectedPatient(null)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Back to Patients List
          </button>
        </div>
      ) : (
        <p>No patient selected.</p>
      )}
    </div>
  );

  const renderPatientList = () => (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Patients</h2>
      <input
        type="text"
        placeholder="Search patients..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />
      {filteredPatients.length ? (
        <ul className="space-y-3">
          {filteredPatients.map((patient) => (
            <li
              key={patient.id}
              className="p-3 border rounded-lg cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <p><strong>Name:</strong> {patient.name}</p>
              <p><strong>ID:</strong> {patient.id}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500">No patients found.</div>
      )}
    </div>
  );

  const renderAppointments = () => (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Appointments</h2>
      {appointments.length ? (
      <ul className="space-y-3">
          {appointments.map((appointment, idx) => (
            <li key={idx} className="p-3 border rounded-lg">
              <p><strong>Patient:</strong> {appointment.patientName}</p>
              <p><strong>Date:</strong> {new Date(appointment.datetime).toLocaleString()}</p>
              <p><strong>Type:</strong> {appointment.type}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500">No appointments available.</div>
      )}
    </div>
  );

  const renderTabs = () => (
    <div className="flex space-x-6 border-b mb-4">
      {[
        { name: 'Dashboard', key: 'dashboard', icon: Activity },
        { name: 'Patients', key: 'patients', icon: Users },
        { name: 'Appointments', key: 'appointments', icon: CalendarClock },
        { name: 'Alerts', key: 'alerts', icon: AlertTriangle },
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex items-center space-x-1 pb-2 ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          <tab.icon size={18} />
      {activeTab === 'patients' && (selectedPatient ? renderPatientDetail() : renderPatientList())}
        </button>
      ))}
      </div>
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">PulseDoc</h1>
        <div className="flex items-center space-x-4">
          <Bell size={20} />
          <Settings size={20} />
          <LogOut size={20} />
        </div>
      </header>

      {renderTabs()}

      {error && <div className="text-red-600 mb-4">{error}</div>}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'patients' && (selectedPatient ? renderPatientDetail() : renderPatientList())}
      {activeTab === 'appointments' && renderAppointments()}
      {activeTab === 'alerts' && (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Alerts</h2>
          {alerts.length ? (
            <ul className="space-y-3">
              {alerts.map((alert, idx) => (
                <li key={idx} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <AlertTriangle size={20} className="text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold">{alert.title}</p>
                    <p className="text-gray-500 text-sm">{alert.message}</p>
                    <p className="text-gray-400 text-xs mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No alerts at this time.</div>
          )}
        </div>
      )}
    </div>
  );
}
