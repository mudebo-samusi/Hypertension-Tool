import React from 'react';
import {useState, useEffect } from 'react';
import { Search, User, Users, Hospital, Heart, Filter, X, Plus, Phone, Mail, MapPin, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Data models
const mockDoctors = [
  { 
    id: 1, 
    name: 'Dr. Sarah Johnson', 
    specialty: 'Cardiologist',
    rating: 4.9,
    patientCount: 342,
    experience: '15 years',
    organization: { id: 1, name: 'Central Heart Hospital' },
    availability: 'Available today',
    image: '/api/placeholder/200/200',
    contact: { phone: '(555) 123-4567', email: 'sarah.johnson@example.com' },
    address: '123 Medical Center Dr, Boston, MA'
  },
  { 
    id: 2, 
    name: 'Dr. Michael Chen', 
    specialty: 'Hypertension Specialist',
    rating: 4.8,
    patientCount: 278,
    experience: '12 years',
    organization: { id: 2, name: 'Wellness Medical Center' },
    availability: 'Next available: Tomorrow',
    image: '/api/placeholder/200/200',
    contact: { phone: '(555) 234-5678', email: 'michael.chen@example.com' },
    address: '456 Health Blvd, Boston, MA'
  },
  { 
    id: 3, 
    name: 'Dr. Patricia Rodriguez', 
    specialty: 'Internal Medicine',
    rating: 4.7,
    patientCount: 195,
    experience: '8 years',
    organization: { id: 1, name: 'Central Heart Hospital' },
    availability: 'Available today',
    image: '/api/placeholder/200/200',
    contact: { phone: '(555) 345-6789', email: 'patricia.rodriguez@example.com' },
    address: '123 Medical Center Dr, Boston, MA'
  },
];

const mockOrganizations = [
  { 
    id: 1, 
    name: 'Central Heart Hospital', 
    type: 'Hospital',
    doctorCount: 45,
    rating: 4.8,
    specialties: ['Cardiology', 'Hypertension Management', 'Internal Medicine'],
    image: '/api/placeholder/200/200',
    contact: { phone: '(555) 987-6543', email: 'info@centralheart.example.com' },
    address: '123 Medical Center Dr, Boston, MA',
    features: ['24/7 Emergency Care', 'Remote Monitoring', 'Specialized Hypertension Clinic']
  },
  { 
    id: 2, 
    name: 'Wellness Medical Center', 
    type: 'Clinic',
    doctorCount: 18,
    rating: 4.7,
    specialties: ['Family Medicine', 'Hypertension Management', 'Preventive Care'],
    image: '/api/placeholder/200/200',
    contact: { phone: '(555) 876-5432', email: 'contact@wellness.example.com' },
    address: '456 Health Blvd, Boston, MA',
    features: ['Telehealth Services', 'Weekend Appointments', 'Holistic Approach']
  }
];

// Utility functions
const filterResults = (query, filters, items, type) => {
  if (!query && (!filters || Object.keys(filters).length === 0)) return items;
  
  return items.filter(item => {
    // Search query matching
    const matchesQuery = !query || 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (type === 'doctor' && item.specialty.toLowerCase().includes(query.toLowerCase())) ||
      (type === 'organization' && item.type.toLowerCase().includes(query.toLowerCase()));
    
    // Filter matching
    let matchesFilters = true;
    if (filters) {
      if (type === 'doctor' && filters.specialty && item.specialty !== filters.specialty) {
        matchesFilters = false;
      }
      if (type === 'doctor' && filters.organization && item.organization.id !== filters.organization) {
        matchesFilters = false;
      }
      if (type === 'organization' && filters.orgType && item.type !== filters.orgType) {
        matchesFilters = false;
      }
      if (filters.availability === 'today' && item.availability !== 'Available today') {
        matchesFilters = false;
      }
    }
    
    return matchesQuery && matchesFilters;
  });
};

// UI Components
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative w-full">
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
      <Search className="h-5 w-5 text-gray-400" />
    </div>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
    />
  </div>
);

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition
      ${active 
        ? 'bg-violet-600 text-white' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
    }
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const FilterTag = ({ label, onRemove }) => (
  <div className="flex items-center bg-violet-100 text-violet-800 rounded-full px-3 py-1 text-sm">
    <span>{label}</span>
    <button onClick={onRemove} className="ml-1">
      <X size={14} />
    </button>
  </div>
);

const DoctorCard = ({ doctor }) => (
  <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
    <div className="flex items-start">
      <img 
        src={doctor.image} 
        alt={doctor.name} 
        className="w-16 h-16 rounded-full object-cover mr-4"
      />
      <div className="flex-1">
        <h3 className="font-medium text-lg">{doctor.name}</h3>
        <p className="text-gray-600">{doctor.specialty}</p>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <span className="flex items-center">
            <Hospital size={14} className="mr-1" />
            {doctor.organization.name}
          </span>
          <span className="mx-2">•</span>
          <span className="flex items-center">
            <Heart size={14} className="mr-1 text-red-500" />
            {doctor.patientCount} patients
          </span>
        </div>
      </div>
    </div>
    
    <div className="mt-3 flex justify-between items-center">
      <div className="flex items-center">
        {doctor.availability.includes('Available') ? (
          <span className="flex items-center text-green-600 text-sm">
            <CheckCircle size={14} className="mr-1" />
            {doctor.availability}
          </span>
        ) : (
          <span className="flex items-center text-amber-600 text-sm">
            <Clock size={14} className="mr-1" />
            {doctor.availability}
          </span>
        )}
      </div>
      <button className="bg-violet-600 text-white px-4 py-1 rounded-lg hover:bg-violet-700 transition">
        Connect
      </button>
    </div>
  </div>
);

const OrganizationCard = ({ organization }) => (
  <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
    <div className="flex items-start">
      <img 
        src={organization.image} 
        alt={organization.name} 
        className="w-16 h-16 rounded-full object-cover mr-4"
      />
      <div className="flex-1">
        <h3 className="font-medium text-lg">{organization.name}</h3>
        <p className="text-gray-600">{organization.type}</p>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <span className="flex items-center">
            <Users size={14} className="mr-1" />
            {organization.doctorCount} doctors
          </span>
          <span className="mx-2">•</span>
          <span className="flex items-center">
            <Heart size={14} className="mr-1 text-red-500" />
            {organization.rating} rating
          </span>
        </div>
      </div>
    </div>
    
    <div className="mt-3">
      <div className="text-sm text-gray-700 flex flex-wrap gap-1">
        {organization.specialties.slice(0, 2).map((specialty, idx) => (
          <span key={idx} className="bg-gray-100 rounded-full px-2 py-0.5">{specialty}</span>
        ))}
        {organization.specialties.length > 2 && (
          <span className="bg-gray-100 rounded-full px-2 py-0.5">+{organization.specialties.length - 2} more</span>
        )}
      </div>
    </div>
    
    <div className="mt-3 flex justify-end">
      <button className="bg-violet-600 text-white px-4 py-1 rounded-lg hover:bg-violet-700 transition">
        View Details
      </button>
    </div>
  </div>
);

const FilterPanel = ({ activeFilters, onApplyFilter, onClearFilters }) => {
  const [specialty, setSpecialty] = useState(activeFilters.specialty || '');
  const [organization, setOrganization] = useState(activeFilters.organization || '');
  const [orgType, setOrgType] = useState(activeFilters.orgType || '');
  const [availability, setAvailability] = useState(activeFilters.availability || '');
  
  const specialties = ['Cardiologist', 'Hypertension Specialist', 'Internal Medicine'];
  const organizations = mockOrganizations.map(org => ({ id: org.id, name: org.name }));
  const orgTypes = ['Hospital', 'Clinic'];
  
  const handleApplyFilters = () => {
    const filters = {};
    if (specialty) filters.specialty = specialty;
    if (organization) filters.organization = parseInt(organization);
    if (orgType) filters.orgType = orgType;
    if (availability) filters.availability = availability;
    
    onApplyFilter(filters);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Filters</h3>
        <button 
          onClick={onClearFilters}
          className="text-violet-600 text-sm hover:underline"
        >
          Clear all
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Specialty</label>
          <select 
            value={specialty} 
            onChange={e => setSpecialty(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Specialties</option>
            {specialties.map((spec, idx) => (
              <option key={idx} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Organization</label>
          <select 
            value={organization} 
            onChange={e => setOrganization(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Organization Type</label>
          <select 
            value={orgType} 
            onChange={e => setOrgType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            {orgTypes.map((type, idx) => (
              <option key={idx} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Availability</label>
          <select 
            value={availability} 
            onChange={e => setAvailability(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Any Availability</option>
            <option value="today">Available Today</option>
          </select>
        </div>
        
        <button 
          onClick={handleApplyFilters}
          className="w-full bg-violet-600 text-white py-2 rounded-md hover:bg-violet-700 transition"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ type, query }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle size={48} className="text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-700">No {type} found</h3>
    {query ? (
      <p className="text-gray-500 mt-1">
        We couldn't find any {type} matching "{query}".<br/>
        Try different keywords or filters.
      </p>
    ) : (
      <p className="text-gray-500 mt-1">
        Try adjusting your filters to see more results.
      </p>
    )}
  </div>
);

const DetailPanel = ({ item, type, onClose }) => {
  if (!item) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-20 h-20 rounded-full object-cover mr-4"
          />
          <div>
            <h2 className="text-xl font-medium">{item.name}</h2>
            <p className="text-gray-600">
              {type === 'doctor' ? item.specialty : item.type}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Contact Information</h3>
            <div className="space-y-2">
              <p className="flex items-center text-gray-700">
                <Phone size={18} className="mr-2 text-violet-600" />
                {item.contact.phone}
              </p>
              <p className="flex items-center text-gray-700">
                <Mail size={18} className="mr-2 text-violet-600" />
                {item.contact.email}
              </p>
              <p className="flex items-center text-gray-700">
                <MapPin size={18} className="mr-2 text-violet-600" />
                {item.address}
              </p>
            </div>
          </div>
          
          {type === 'doctor' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Experience</h3>
              <p className="text-gray-700">{item.experience}</p>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-800">Organization</h4>
                <p className="text-gray-700">{item.organization.name}</p>
              </div>
            </div>
          )}
          
          {type === 'organization' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {item.specialties.map((specialty, idx) => (
                  <span key={idx} className="bg-violet-100 text-violet-800 rounded-full px-3 py-1 text-sm">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {type === 'doctor' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Key Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-xl font-medium text-violet-600">{item.rating}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Patients</p>
                  <p className="text-xl font-medium text-violet-600">{item.patientCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                  <p className="text-sm text-gray-600">Availability</p>
                  <p className={`font-medium ${item.availability.includes('Available') ? 'text-green-600' : 'text-amber-600'}`}>
                    {item.availability}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {type === 'organization' && (
            <>
              <div>
                <h3 className="text-lg font-medium mb-2">Key Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Doctors</p>
                    <p className="text-xl font-medium text-violet-600">{item.doctorCount}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-medium text-violet-600">{item.rating}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Features</h3>
                <ul className="space-y-2">
                  {item.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <CheckCircle size={16} className="mr-2 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          
          <div className="mt-6">
            <button className="w-full bg-violet-600 text-white py-3 rounded-lg hover:bg-violet-700 transition flex items-center justify-center">
              <Plus size={18} className="mr-2" />
              {type === 'doctor' ? 'Request Connection' : 'Connect with Organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
function PulseConnect() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' or 'organizations'
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const filteredResults = activeTab === 'doctors' 
    ? filterResults(searchQuery, activeFilters, mockDoctors, 'doctor')
    : filterResults(searchQuery, activeFilters, mockOrganizations, 'organization');
    
  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setShowFilters(false);
  };
  
  const handleClearFilters = () => {
    setActiveFilters({});
    setShowFilters(false);
  };
  
  const removeFilter = (filterKey) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
  };
  
  const handleItemClick = (item) => {
    setSelectedItem({
      ...item,
      type: activeTab === 'doctors' ? 'doctor' : 'organization'
    });
  };
  
  const handleCloseDetail = () => {
    setSelectedItem(null);
  };
  
  const getFilterLabel = (key, value) => {
    if (key === 'specialty') return value;
    if (key === 'organization') {
      const org = mockOrganizations.find(o => o.id === value);
      return org ? org.name : value;
    }
    if (key === 'orgType') return value;
    if (key === 'availability') return 'Available Today';
    return value;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart size={28} className="text-violet-600 mr-2" />
              <h1 className="text-xl font-bold text-violet-600">PulseConnect</h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">Help</button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {selectedItem ? (
          <DetailPanel 
            item={selectedItem} 
            type={selectedItem.type} 
            onClose={handleCloseDetail} 
          />
        ) : (
          <>
            {/* Search and filters header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Find Hypertension Care Providers</h2>
              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
                <SearchBar 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={`Search for ${activeTab}...`}
                />
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-shrink-0 flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <Filter size={18} />
                  <span>Filters</span>
                  {Object.keys(activeFilters).length > 0 && (
                    <span className="bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {Object.keys(activeFilters).length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Active filters */}
              {Object.keys(activeFilters).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(activeFilters).map(([key, value]) => (
                    <FilterTag 
                      key={key}
                      label={getFilterLabel(key, value)}
                      onRemove={() => removeFilter(key)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Tab switcher */}
            <div className="flex space-x-3 mb-6">
              <TabButton 
                active={activeTab === 'doctors'}
                icon={User}
                label="Doctors"
                onClick={() => setActiveTab('doctors')}
              />
              <TabButton 
                active={activeTab === 'organizations'}
                icon={Hospital}
                label="Organizations"
                onClick={() => setActiveTab('organizations')}
              />
            </div>
            
            {/* Main content area */}
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
              {/* Filter panel (visible only when showFilters is true) */}
              {showFilters && (
                <div className="md:w-64 flex-shrink-0">
                  <FilterPanel 
                    activeFilters={activeFilters}
                    onApplyFilter={handleApplyFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>
              )}
              
              {/* Results panel */}
              <div className="flex-grow">
                {filteredResults.length === 0 ? (
                  <EmptyState 
                    type={activeTab} 
                    query={searchQuery} 
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {activeTab === 'doctors' && filteredResults.map(doctor => (
                      <div key={doctor.id} onClick={() => handleItemClick(doctor)} className="cursor-pointer">
                        <DoctorCard doctor={doctor} />
                      </div>
                    ))}
                    
                    {activeTab === 'organizations' && filteredResults.map(org => (
                      <div key={org.id} onClick={() => handleItemClick(org)} className="cursor-pointer">
                        <OrganizationCard organization={org} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default PulseConnect; // Ensure the component is exported correctly