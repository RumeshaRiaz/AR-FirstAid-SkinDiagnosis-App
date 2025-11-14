import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import RegularUserRegister1 from './components/RegularUserRegister1';
import RegularUserRegister2 from './components/RegularUserRegister2';
import ProfessionalRegister1 from './components/ProfessionalRegister1';
import ProfessionalRegister2 from './components/ProfessionalRegister2';
import ForgotPassword1 from './components/ForgotPassword1';
import ForgotPassword2 from './components/ForgotPassword2';
import ForgotPassword3 from './components/ForgotPassword3';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash', 'login', 'register', 'regularUserRegister1', 'regularUserRegister2', 'professionalRegister1', 'professionalRegister2', 'forgotPassword1', 'forgotPassword2', 'forgotPassword3'

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

  const handleNavigateToRegister2 = (data) => {
    console.log('Regular Register1 Data:', data);
    setCurrentScreen('regularUserRegister2');
  };

  const handleNavigateToProfessionalRegister2 = (data) => {
    console.log('Professional Register1 Data:', data);
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
    // Handle account creation here
    // You can navigate to login or home screen after successful registration
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgotPassword1');
  };

  const handleForgotPasswordNext = (email) => {
    console.log('Forgot Password Email:', email);
    setCurrentScreen('forgotPassword2');
  };

  const handleForgotPasswordCodeNext = (code) => {
    console.log('Verification Code:', code);
    setCurrentScreen('forgotPassword3');
  };

  const handleForgotPasswordResend = () => {
    console.log('Resend code');
    // Handle resend logic here
  };

  const handleChangePassword = (newPassword) => {
    console.log('New Password:', newPassword);
    // Handle password change logic here
    // Navigate back to login after successful password change
    setCurrentScreen('login');
  };

  return (
    <>
      {currentScreen === 'splash' && (
        <SplashScreen onNavigate={handleNavigateToLogin} />
      )}
      {currentScreen === 'login' && (
        <LoginScreen 
          onNavigateToRegister={handleNavigateToRegister}
          onNavigateToForgotPassword={handleNavigateToForgotPassword}
        />
      )}
      {currentScreen === 'forgotPassword1' && (
        <ForgotPassword1 
          onCancel={handleBackToLogin}
          onNext={handleForgotPasswordNext}
        />
      )}
      {currentScreen === 'forgotPassword2' && (
        <ForgotPassword2 
          onBack={() => setCurrentScreen('forgotPassword1')}
          onNext={handleForgotPasswordCodeNext}
          onResend={handleForgotPasswordResend}
        />
      )}
      {currentScreen === 'forgotPassword3' && (
        <ForgotPassword3 
          onBack={() => setCurrentScreen('forgotPassword2')}
          onChangePassword={handleChangePassword}
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
        />
      )}
      <StatusBar style="light" />
    </>
  );
}
