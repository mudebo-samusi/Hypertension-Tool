import React, { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';

const CreatePostModal = ({ isOpen, onClose, onSave, entityType = 'doctor', organizations = [] }) => {
  const initialFormData = {
    name: '',
    specialty: '',
    rating: 4.5,
    patientCount: 0,
    experience: '',
    organization: '',
    availability: 'Available today',
    image: '/api/placeholder/200/200',
    contact: {
      phone: '',
      email: '',
    },
    address: '',
    // For organizations
    type: 'Clinic',
    doctorCount: 0,
    specialties: [],
    features: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [currentSpecialty, setCurrentSpecialty] = useState('');
  const [currentFeature, setCurrentFeature] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const specialtyOptions = [
    'Cardiologist',
    'Hypertension Specialist',
    'Internal Medicine',
    'Family Medicine',
    'Nephrologist',
    'Endocrinologist',
  ];

  const availabilityOptions = [
    'Available today',
    'Next available: Tomorrow',
    'Next available: This week',
    'Next available: Next week',
  ];

  const organizationTypes = ['Clinic', 'Hospital', 'Medical Center', 'Private Practice'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData({
        ...formData,
        [name]: numValue,
      });
    }
  };

  const handleRatingChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 5) {
      setFormData({
        ...formData,
        rating: value,
      });
    }
  };

  const addSpecialty = () => {
    if (currentSpecialty && !formData.specialties.includes(currentSpecialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, currentSpecialty],
      });
      setCurrentSpecialty('');
    }
  };

  const removeSpecialty = (specialty) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((s) => s !== specialty),
    });
  };

  const addFeature = () => {
    if (currentFeature && !formData.features.includes(currentFeature)) {
      setFormData({
        ...formData,
        features: [...formData.features, currentFeature],
      });
      setCurrentFeature('');
    }
  };

  const removeFeature = (feature) => {
    setFormData({
      ...formData,
      features: formData.features.filter((f) => f !== feature),
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        // In a real app, you would upload this to a server and get back a URL
        // For now, we'll just use the local preview
        setFormData({
          ...formData,
          image: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Common validations
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.contact.phone.trim()) {
      newErrors['contact.phone'] = 'Phone number is required';
    }
    
    if (!formData.contact.email.trim()) {
      newErrors['contact.email'] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact.email)) {
      newErrors['contact.email'] = 'Email is invalid';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    // Entity-specific validations
    if (entityType === 'doctor') {
      if (!formData.specialty.trim()) {
        newErrors.specialty = 'Specialty is required';
      }
      
      if (!formData.organization) {
        newErrors.organization = 'Organization is required';
      }
      
      if (!formData.experience.trim()) {
        newErrors.experience = 'Experience is required';
      }
    } else { // organization
      if (!formData.type) {
        newErrors.type = 'Organization type is required';
      }
      
      if (formData.specialties.length === 0) {
        newErrors.specialties = 'At least one specialty is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      let entityData;
      
      if (entityType === 'doctor') {
        const selectedOrg = organizations.find(org => org.id.toString() === formData.organization.toString());
        
        entityData = {
          name: formData.name,
          specialty: formData.specialty,
          rating: formData.rating,
          patientCount: formData.patientCount,
          experience: formData.experience,
          organization: selectedOrg || { id: parseInt(formData.organization), name: "Unknown Organization" },
          availability: formData.availability,
          image: formData.image,
          contact: formData.contact,
          address: formData.address,
        };
      } else {
        entityData = {
          name: formData.name,
          type: formData.type,
          rating: formData.rating,
          doctorCount: formData.doctorCount,
          specialties: formData.specialties,
          features: formData.features,
          image: formData.image,
          contact: formData.contact,
          address: formData.address,
        };
      }
      
      // This onSave will call the api.createDoctor or api.createOrganization from PulseConnect
      onSave(entityData, entityType);
      setFormData(initialFormData);
      setImagePreview(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {entityType === 'doctor' ? 'Create New Doctor Profile' : 'Create New Organization Profile'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={entityType === 'doctor' ? "Dr. Full Name" : "Organization Name"}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  {entityType === 'doctor' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specialty <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="specialty"
                          value={formData.specialty}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-md ${errors.specialty ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Select a specialty</option>
                          {specialtyOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {errors.specialty && (
                          <p className="text-red-500 text-xs mt-1">{errors.specialty}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Experience <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-md ${errors.experience ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="e.g. 5 years"
                        />
                        {errors.experience && (
                          <p className="text-red-500 text-xs mt-1">{errors.experience}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organization <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="organization"
                          value={formData.organization}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-md ${errors.organization ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Select an organization</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                        {errors.organization && (
                          <p className="text-red-500 text-xs mt-1">{errors.organization}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Availability
                        </label>
                        <select
                          name="availability"
                          value={formData.availability}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          {availabilityOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patient Count
                        </label>
                        <input
                          type="number"
                          name="patientCount"
                          value={formData.patientCount}
                          onChange={handleNumberInputChange}
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-md ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          {organizationTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        {errors.type && (
                          <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Doctor Count
                        </label>
                        <input
                          type="number"
                          name="doctorCount"
                          value={formData.doctorCount}
                          onChange={handleNumberInputChange}
                          min="0"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specialties <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-2 mb-2">
                          <select
                            value={currentSpecialty}
                            onChange={(e) => setCurrentSpecialty(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Select a specialty</option>
                            {specialtyOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={addSpecialty}
                            className="bg-violet-600 text-white px-3 py-1 rounded-md hover:bg-violet-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.specialties.map((specialty, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-violet-100 text-violet-800 rounded-full px-3 py-1 text-sm"
                            >
                              <span>{specialty}</span>
                              <button
                                type="button"
                                onClick={() => removeSpecialty(specialty)}
                                className="ml-1 text-violet-800 hover:text-violet-900"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {errors.specialties && (
                          <p className="text-red-500 text-xs mt-1">{errors.specialties}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Features
                        </label>
                        <div className="flex space-x-2 mb-2">
                          <input
                            type="text"
                            value={currentFeature}
                            onChange={(e) => setCurrentFeature(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                            placeholder="e.g. 24/7 Emergency Care"
                          />
                          <button
                            type="button"
                            onClick={addFeature}
                            className="bg-violet-600 text-white px-3 py-1 rounded-md hover:bg-violet-700"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm"
                            >
                              <span>{feature}</span>
                              <button
                                type="button"
                                onClick={() => removeFeature(feature)}
                                className="ml-1 text-gray-600 hover:text-gray-800"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Rating</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={handleRatingChange}
                    className="flex-1"
                  />
                  <span className="text-lg font-medium text-violet-600">{formData.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Profile Image</h3>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 mb-3">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
                        {entityType === 'doctor' ? 'Doctor' : 'Org'} Image
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-2 rounded-md text-sm inline-flex items-center transition">
                    <Upload size={16} className="mr-1" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="contact.phone"
                      value={formData.contact.phone}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-md ${errors['contact.phone'] ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="(555) 123-4567"
                    />
                    {errors['contact.phone'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['contact.phone']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="contact.email"
                      value={formData.contact.email}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-md ${errors['contact.email'] ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="email@example.com"
                    />
                    {errors['contact.email'] && (
                      <p className="text-red-500 text-xs mt-1">{errors['contact.email']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-md ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="123 Main St, City, State"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition inline-flex items-center"
            >
              <Check size={18} className="mr-1" /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;