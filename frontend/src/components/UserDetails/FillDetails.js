import React, { useState, useEffect } from 'react';
import { User, Calendar, Phone, Mail, MapPin, GraduationCap, Building, FileText, CheckCircle } from 'lucide-react';
import apiClient from '../../utils/api';

const FillDetails = ({ onDetailsSubmitted }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    date_of_birth: '',
    contact_number: '',
    email_id: '',
    address: '',
    educational_qualification: '',
    organization_company: '',
    any_illness: '',
    signature_confirmation: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load existing user details if any
  useEffect(() => {
    const loadExistingDetails = async () => {
      try {
        const result = await apiClient.getUserDetails();
        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            ...result.data
          }));
        }
      } catch (err) {
        // User details not found, keep form empty
        console.log('No existing user details found');
      }
    };

    loadExistingDetails();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    const requiredFields = ['name', 'age', 'gender', 'contact_number', 'signature_confirmation'];
    
    for (let field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in the ${field.replace('_', ' ')} field`);
        return false;
      }
    }

    if (formData.age && (isNaN(formData.age) || formData.age < 1 || formData.age > 120)) {
      setError('Please enter a valid age between 1 and 120');
      return false;
    }

    if (formData.contact_number && formData.contact_number.length < 10) {
      setError('Please enter a valid contact number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await apiClient.saveUserDetails(formData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onDetailsSubmitted();
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <CheckCircle size={64} style={styles.successIcon} />
          <h1 style={styles.successTitle}>Details Saved Successfully!</h1>
          <p style={styles.successMessage}>
            Your information has been securely stored. Redirecting to assessments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Personal Information</h1>
          <p style={styles.subtitle}>
            Please provide your details for the assessment. All information will be kept confidential.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          <div style={styles.formGrid}>
            {/* Name */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <User size={16} style={styles.labelIcon} />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                style={styles.input}
                disabled={isLoading}
                required
              />
            </div>

            {/* Age */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Calendar size={16} style={styles.labelIcon} />
                Age *
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Enter your age"
                style={styles.input}
                disabled={isLoading}
                min="1"
                max="120"
                required
              />
            </div>

            {/* Gender */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <User size={16} style={styles.labelIcon} />
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                style={styles.select}
                disabled={isLoading}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Calendar size={16} style={styles.labelIcon} />
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                style={styles.input}
                disabled={isLoading}
              />
            </div>

            {/* Contact Number */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Phone size={16} style={styles.labelIcon} />
                Contact Number *
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleInputChange}
                placeholder="Enter your contact number"
                style={styles.input}
                disabled={isLoading}
                required
              />
            </div>

            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Mail size={16} style={styles.labelIcon} />
                Email Address
              </label>
              <input
                type="email"
                name="email_id"
                value={formData.email_id}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                style={styles.input}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Address */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <MapPin size={16} style={styles.labelIcon} />
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter your complete address"
              style={styles.textarea}
              disabled={isLoading}
              rows="3"
            />
          </div>

          {/* Educational Qualification */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <GraduationCap size={16} style={styles.labelIcon} />
              Educational Qualification
            </label>
            <input
              type="text"
              name="educational_qualification"
              value={formData.educational_qualification}
              onChange={handleInputChange}
              placeholder="e.g., Bachelor's in Computer Science"
              style={styles.input}
              disabled={isLoading}
            />
          </div>

          {/* Organization/Company */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <Building size={16} style={styles.labelIcon} />
              Organization / Company
            </label>
            <input
              type="text"
              name="organization_company"
              value={formData.organization_company}
              onChange={handleInputChange}
              placeholder="Enter your organization or company name"
              style={styles.input}
              disabled={isLoading}
            />
          </div>

          {/* Any Illness */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              <FileText size={16} style={styles.labelIcon} />
              Any Illness or Medical Condition
            </label>
            <textarea
              name="any_illness"
              value={formData.any_illness}
              onChange={handleInputChange}
              placeholder="Please mention any illness or medical condition (optional)"
              style={styles.textarea}
              disabled={isLoading}
              rows="2"
            />
          </div>

          {/* Consent and Signature */}
          <div style={styles.consentSection}>
            <div style={styles.consentText}>
              <h3 style={styles.consentTitle}>Consent and Agreement</h3>
              <p style={styles.consentDescription}>
                I certify that I am willingly participating in this assessment and understand the procedure and 
                aim of the testing that is being conducted. I also understand that the study would not cause me 
                any discomfort. Should any kind of discomfort arise, I know that I have the right to withdraw at 
                any point during the study. My identity shall remain confidential to ensure that the responses 
                cannot be identified. I know that I have the right to get informed of the results. The data can 
                be used for research purposes provided that my confidentiality is maintained.
              </p>
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <FileText size={16} style={styles.labelIcon} />
                Digital Signature (Type your full name) *
              </label>
              <input
                type="text"
                name="signature_confirmation"
                value={formData.signature_confirmation}
                onChange={handleInputChange}
                placeholder="Type your full name as digital signature"
                style={styles.input}
                disabled={isLoading}
                required
              />
              <small style={styles.helperText}>
                By typing your name, you agree to the terms and conditions stated above.
              </small>
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isLoading ? styles.submitButtonDisabled : {})
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Saving Details...' : 'Save Details & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #CCD8C2 0%, #B3D29A 30%, #60AA47 65%, #2E6603 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  formCard: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)'
  },
  successCard: {
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    minHeight: 'calc(100vh - 40px)',
    justifyContent: 'center'
  },
  successIcon: {
    color: '#60AA47'
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2E6603',
    margin: '0'
  },
  successMessage: {
    fontSize: '16px',
    color: '#60AA47',
    margin: '0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2E6603',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#60AA47',
    lineHeight: '1.5',
    margin: '0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  errorMessage: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '12px',
    color: '#991B1B',
    fontSize: '14px',
    textAlign: 'center'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2E6603',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  labelIcon: {
    color: '#60AA47'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #B3D29A',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#2E6603',
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #B3D29A',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#2E6603',
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  textarea: {
    padding: '12px 16px',
    border: '2px solid #B3D29A',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#2E6603',
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  consentSection: {
    backgroundColor: 'rgba(179, 210, 154, 0.1)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #B3D29A'
  },
  consentTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2E6603',
    marginBottom: '12px',
    margin: '0 0 12px 0'
  },
  consentDescription: {
    fontSize: '14px',
    color: '#2E6603',
    lineHeight: '1.6',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  },
  helperText: {
    fontSize: '12px',
    color: '#60AA47',
    fontStyle: 'italic'
  },
  submitButton: {
    backgroundColor: '#2E6603',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '16px'
  },
  submitButtonDisabled: {
    opacity: '0.7',
    cursor: 'not-allowed'
  }
};

export default FillDetails;