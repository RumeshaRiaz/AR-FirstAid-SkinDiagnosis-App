import React, { useState } from 'react';
import { 
  View, 
  Image, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, realtimeDb } from '../config/firebaseConfig';

export default function LoginScreen({ onNavigateToRegister, onNavigateToForgotPassword, onNavigateToHome, onNavigateToProfessionalHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Step 1: Authenticate with Firebase Auth first (fastest) with timeout
      const authPromise = signInWithEmailAndPassword(auth, email.trim(), password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout. Please check your internet connection.')), 8000)
      );
      
      const userCredential = await Promise.race([authPromise, timeoutPromise]);
      
      const user = userCredential.user;
      
      console.log('Login successful:', user.uid);
      
      // Step 2: Fetch user data with very short timeout (1.5 seconds max) - non-blocking
      let userData = null;
      try {
        const userRef = ref(realtimeDb, `users/${user.uid}`);
        const dbPromise = get(userRef);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 1500)
        );
        
        const snapshot = await Promise.race([dbPromise, timeoutPromise]);
        
        if (snapshot && snapshot.exists()) {
          userData = snapshot.val();
        }
      } catch (dbError) {
        console.error('Error fetching user data (continuing with default):', dbError);
        // Continue with login even if database query fails
        // Default to regular user if data not found
        userData = null;
      }
      
      const userType = userData?.userType || 'regular';
      const professionalStatus = userData?.status; // pending, approved, rejected
      console.log('User type:', userType);
      console.log('Professional status:', professionalStatus);
      
      // Check professional status from users table
      if (userType === 'professional') {
        if (professionalStatus === 'pending') {
          setLoading(false);
          Alert.alert(
            'Account Under Review',
            'Your account is currently under review. Please wait for approval. You will be able to login once your account is approved by the admin.',
            [{ text: 'OK' }]
          );
          return;
        } else if (professionalStatus === 'rejected') {
          setLoading(false);
          Alert.alert(
            'Account Rejected',
            'Your account registration has been rejected. Please contact support for more information.',
            [{ text: 'OK' }]
          );
          return;
        } else if (professionalStatus !== 'approved') {
          // If status is not approved (and not pending/rejected), treat as pending
          setLoading(false);
          Alert.alert(
            'Account Under Review',
            'Your account is currently under review. Please wait for approval. You will be able to login once your account is approved by the admin.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Professional is approved, allow login - navigate immediately
        setLoading(false);
        console.log('Navigating to Professional Home...');
        if (onNavigateToProfessionalHome) {
          onNavigateToProfessionalHome();
        } else {
          console.error('onNavigateToProfessionalHome not provided');
          Alert.alert('Error', 'Navigation function not available');
        }
      } else {
        // Regular user, allow login - navigate immediately
        setLoading(false);
        console.log('Navigating to Home...');
        if (onNavigateToHome) {
          onNavigateToHome();
        } else {
          console.error('onNavigateToHome not provided');
          Alert.alert('Error', 'Navigation function not available');
        }
      }
    } catch (authError) {
      // Handle authentication errors
      console.error('Login error:', authError);
      let errorMessage = 'Login failed. Please try again.';
      
      if (authError.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (authError.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (authError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (authError.code === 'auth/network-request-failed' || authError.message?.includes('network') || authError.message?.includes('timeout')) {
        errorMessage = 'Network error. Please check your internet connection and try again. Make sure you have a stable internet connection.';
      } else if (authError.message) {
        // Show more specific error if available
        if (authError.message.includes('timeout')) {
          errorMessage = 'Connection timeout. Please check your internet connection and try again.';
        } else {
          errorMessage = `Login failed: ${authError.message}`;
        }
      }
      
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword();
    }
  };

  const handleRegister = () => {
    if (onNavigateToRegister) {
      onNavigateToRegister();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/doktap logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.welcomeText}>WELCOME</Text>
        <Text style={styles.tagline}>SMART CARE FOR EVERY PATIENT.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordText}>Forgot Password</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0097B2" />
          ) : (
            <Text style={styles.loginButtonText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have Account? </Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0097B2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 280,
    height: 280,
  },
  welcomeText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  registerLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

