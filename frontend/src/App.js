import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import FillDetails from './components/UserDetails/FillDetails';
import PsychologyQuestionnaire from './components/PsychologyQuestionnaire';
import apiClient from './utils/api';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userHasDetails, setUserHasDetails] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First check if user is authenticated
      const authResult = await apiClient.checkAuth();
      
      if (authResult.authenticated) {
        setIsAuthenticated(true);
        
        // Then check if user has filled details
        try {
          const detailsResult = await apiClient.getUserDetails();
          
          // Check if details exist AND have required fields filled
          if (detailsResult.success && 
              detailsResult.data && 
              detailsResult.data.name && 
              detailsResult.data.signature_confirmation) {
            // User has valid details, go directly to questionnaire
            console.log('User details found, redirecting to questionnaire');
            setUserHasDetails(true);
            setCurrentPage('questionnaire');
          } else {
            // No valid details found
            console.log('No valid user details, redirecting to fill details');
            setUserHasDetails(false);
            setCurrentPage('fillDetails');
          }
        } catch (err) {
          // Error means no details exist
          console.log('Error fetching user details:', err);
          setUserHasDetails(false);
          setCurrentPage('fillDetails');
        }
      } else {
        // Not authenticated
        setIsAuthenticated(false);
        setCurrentPage('login');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setIsAuthenticated(false);
      setCurrentPage('login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true);
    
    // After login, check if user already has details
    try {
      const detailsResult = await apiClient.getUserDetails();
      
      if (detailsResult.success && 
          detailsResult.data && 
          detailsResult.data.name && 
          detailsResult.data.signature_confirmation) {
        // User already has details, skip to questionnaire
        setUserHasDetails(true);
        setCurrentPage('questionnaire');
      } else {
        // Need to fill details
        setUserHasDetails(false);
        setCurrentPage('fillDetails');
      }
    } catch (err) {
      // No details found, go to fill details
      setUserHasDetails(false);
      setCurrentPage('fillDetails');
    }
  };

  const handleRegisterSuccess = () => {
    setIsAuthenticated(true);
    setUserHasDetails(false);
    setCurrentPage('fillDetails');
  };

  const handleDetailsSubmitted = () => {
    setUserHasDetails(true);
    setCurrentPage('questionnaire');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserHasDetails(false);
    setCurrentPage('login');
  };

  const switchToRegister = () => {
    setCurrentPage('register');
  };

  const switchToLogin = () => {
    setCurrentPage('login');
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentPage === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={switchToRegister}
        />
      )}
      
      {currentPage === 'register' && (
        <Register 
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={switchToLogin}
        />
      )}
      
      {currentPage === 'fillDetails' && isAuthenticated && (
        <FillDetails 
          onDetailsSubmitted={handleDetailsSubmitted}
        />
      )}
      
      {currentPage === 'questionnaire' && isAuthenticated && (
        <PsychologyQuestionnaire 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #CCD8C2 0%, #B3D29A 30%, #60AA47 65%, #2E6603 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingText: {
    color: 'white',
    fontSize: '20px'
  }
};

export default App;