// Server Configuration
import { Platform } from 'react-native';

// Change this to your server IP address
// For Android emulator: 'http://10.0.2.2:8000'
// For iOS simulator: 'http://localhost:8000'
// For real device: 'http://YOUR_COMPUTER_IP:8000' (replace YOUR_COMPUTER_IP with your computer's IP)

// Platform-specific default URLs
const getServerURL = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine
    return 'http://10.0.2.2:8000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:8000';
  }
  // Default fallback
  return 'http://localhost:8000';
};

export const SERVER_URL = getServerURL();

// API Endpoints
export const API_ENDPOINTS = {
  PREDICT: '/predict',
  HEALTH: '/health',
};

