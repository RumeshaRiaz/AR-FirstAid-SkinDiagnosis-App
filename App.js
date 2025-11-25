import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import RegularUserRegister1 from './components/RegularUserRegister1';
import RegularUserRegister2 from './components/RegularUserRegister2';
import ProfessionalRegister1 from './components/ProfessionalRegister1';
import ProfessionalRegister2 from './components/ProfessionalRegister2';
import UpdatePasswordScreen from './components/UpdatePasswordScreen';
import HomeScreen from './components/HomeScreen';
import SymptomsCheckerScreen from './components/SymptomsCheckerScreen';
import ScanForDiseaseScreen from './components/ScanForDiseaseScreen';
import NearbyHospitalsScreen from './components/NearbyHospitalsScreen';
import FirstAidScreen from './components/FirstAidScreen';
import ARFirstAidScreen from './components/ARFirstAidScreen';
import SuggestionScreen from './components/SuggestionScreen';
import ReportProblemScreen from './components/ReportProblemScreen';
import ProfileScreen from './components/ProfileScreen';
import ProfessionalHomeScreen from './components/ProfessionalHomeScreen';
import ProfessionalProfileScreen from './components/ProfessionalProfileScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash', 'login', 'register', 'regularUserRegister1', 'regularUserRegister2', 'professionalRegister1', 'professionalRegister2', 'updatePassword', 'home', 'professionalHome', 'professionalProfile', 'symptomsChecker', 'scanForDisease', 'nearbyHospitals', 'firstAid', 'arFirstAid', 'suggestion', 'reportProblem', 'profile'
  const [selectedInjuryType, setSelectedInjuryType] = useState(null);

  const handleNavigateToLogin = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToRegister = () => {
    setCurrentScreen('register');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleBackToRegister = () => {
    setCurrentScreen('register');
  };

  const handleNavigateToRegularUser = () => {
    setCurrentScreen('regularUserRegister1');
  };

  const handleNavigateToProfessional = () => {
    setCurrentScreen('professionalRegister1');
  };

  const [registerData1, setRegisterData1] = useState(null);

  const handleNavigateToRegister2 = (data) => {
    console.log('Regular Register1 Data:', data);
    setRegisterData1(data);
    setCurrentScreen('regularUserRegister2');
  };

  const [professionalRegisterData1, setProfessionalRegisterData1] = useState(null);

  const handleNavigateToProfessionalRegister2 = (data) => {
    console.log('Professional Register1 Data:', data);
    setProfessionalRegisterData1(data);
    setCurrentScreen('professionalRegister2');
  };

  const handleBackToRegister1 = () => {
    setCurrentScreen('regularUserRegister1');
  };

  const handleBackToProfessionalRegister1 = () => {
    setCurrentScreen('professionalRegister1');
  };

  const handleCreateAccount = (data) => {
    console.log('Register2 Data:', data);
    // Account created successfully, navigate based on user type
    const userType = data?.userType || 'regular';
    const professionalStatus = data?.status;
    
    if (userType === 'professional') {
      // Professional should not auto-login if status is pending
      if (professionalStatus === 'pending') {
        // Navigate to login instead
        setCurrentScreen('login');
      } else if (professionalStatus === 'approved') {
        setCurrentScreen('professionalHome');
      } else {
        // Rejected or unknown status, go to login
        setCurrentScreen('login');
      }
    } else {
      // Regular user, navigate to home
      setCurrentScreen('home');
    }
  };

  const handleNavigateToUpdatePassword = () => {
    setCurrentScreen('updatePassword');
  };

  const handlePasswordUpdated = () => {
    // Navigate back to login after successful password update
    setCurrentScreen('login');
  };

  const handleNavigateToHome = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToProfessionalHome = () => {
    setCurrentScreen('professionalHome');
  };

  const handleNavigateToMenu = () => {
    // Handle menu navigation
    console.log('Navigate to Menu');
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToProfessionalProfile = () => {
    setCurrentScreen('professionalProfile');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleBackToProfessionalHome = () => {
    setCurrentScreen('professionalHome');
  };

  const handleNavigateToCamera = () => {
    console.log('Navigate to Camera');
    // Handle camera navigation here
  };

  const handleNavigateToSymptomsChecker = () => {
    setCurrentScreen('symptomsChecker');
  };

  const handleNavigateToScanDisease = () => {
    setCurrentScreen('scanForDisease');
  };

  const handleNavigateToARFirstAid = (injuryType) => {
    setSelectedInjuryType(injuryType);
    setCurrentScreen('arFirstAid');
  };

  const handleBackToFirstAid = () => {
    setCurrentScreen('firstAid');
    setSelectedInjuryType(null);
  };

  const handleNavigateToNearbyHospitals = () => {
    setCurrentScreen('nearbyHospitals');
  };

  const handleNavigateToFirstAid = () => {
    setCurrentScreen('firstAid');
  };

  const handleNavigateToSuggestion = () => {
    setCurrentScreen('suggestion');
  };

  const handleNavigateToReportProblem = () => {
    setCurrentScreen('reportProblem');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  return (
    <>
      {currentScreen === 'splash' && (
        <SplashScreen onNavigate={handleNavigateToLogin} />
      )}
      {currentScreen === 'login' && (
        <LoginScreen 
          onNavigateToRegister={handleNavigateToRegister}
          onNavigateToForgotPassword={handleNavigateToUpdatePassword}
          onNavigateToHome={handleNavigateToHome}
          onNavigateToProfessionalHome={handleNavigateToProfessionalHome}
        />
      )}
      {currentScreen === 'home' && (
        <HomeScreen 
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToCamera={handleNavigateToCamera}
          onNavigateToSymptomsChecker={handleNavigateToSymptomsChecker}
          onNavigateToScanDisease={handleNavigateToScanDisease}
          onNavigateToNearbyHospitals={handleNavigateToNearbyHospitals}
          onNavigateToFirstAid={handleNavigateToFirstAid}
          onNavigateToSuggestion={handleNavigateToSuggestion}
          onNavigateToReportProblem={handleNavigateToReportProblem}
        />
      )}
      {currentScreen === 'professionalHome' && (
        <ProfessionalHomeScreen 
          onNavigateToProfile={handleNavigateToProfessionalProfile}
          onNavigateToMenu={handleNavigateToMenu}
        />
      )}
      {currentScreen === 'professionalProfile' && (
        <ProfessionalProfileScreen 
          onBack={handleBackToProfessionalHome}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'symptomsChecker' && (
        <SymptomsCheckerScreen 
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === 'scanForDisease' && (
        <ScanForDiseaseScreen 
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === 'nearbyHospitals' && (
        <NearbyHospitalsScreen 
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === 'firstAid' && (
        <FirstAidScreen 
          onBack={handleBackToHome}
          onNavigateToARFirstAid={handleNavigateToARFirstAid}
        />
      )}
      {currentScreen === 'arFirstAid' && (
        <ARFirstAidScreen 
          onBack={handleBackToFirstAid}
          injuryType={selectedInjuryType}
        />
      )}
      {currentScreen === 'suggestion' && (
        <SuggestionScreen 
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === 'reportProblem' && (
        <ReportProblemScreen 
          onBack={handleBackToHome}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen 
          onBack={handleBackToHome}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'updatePassword' && (
        <UpdatePasswordScreen 
          onBack={handleBackToLogin}
          onPasswordUpdated={handlePasswordUpdated}
        />
      )}
      {currentScreen === 'register' && (
        <RegisterScreen 
          onBack={handleBackToLogin} 
          onNavigateToRegularUser={handleNavigateToRegularUser}
          onNavigateToProfessional={handleNavigateToProfessional}
        />
      )}
      {currentScreen === 'professionalRegister1' && (
        <ProfessionalRegister1 
          onBack={handleBackToRegister}
          onNavigateToProfessionalRegister2={handleNavigateToProfessionalRegister2}
        />
      )}
      {currentScreen === 'professionalRegister2' && (
        <ProfessionalRegister2 
          onBack={handleBackToProfessionalRegister1}
          onCreateAccount={handleCreateAccount}
          registerData1={professionalRegisterData1}
          onNavigateToLogin={handleNavigateToLogin}
        />
      )}
      {currentScreen === 'regularUserRegister1' && (
        <RegularUserRegister1 
          onBack={handleBackToRegister}
          onNavigateToRegister2={handleNavigateToRegister2}
        />
      )}
      {currentScreen === 'regularUserRegister2' && (
        <RegularUserRegister2 
          onBack={handleBackToRegister1}
          onCreateAccount={handleCreateAccount}
          registerData1={registerData1}
        />
      )}
      <StatusBar style="light" />
    </>
  );
}
