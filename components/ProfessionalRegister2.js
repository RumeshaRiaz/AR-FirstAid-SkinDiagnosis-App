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
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, realtimeDb, storage } from '../config/firebaseConfig';
import * as FileSystem from 'expo-file-system';

export default function ProfessionalRegister2({ onBack, onCreateAccount, registerData1, onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!createPassword.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (createPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (createPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Check if registerData1 is available
    if (!registerData1) {
      Alert.alert('Error', 'Please complete step 1 first. Go back and fill all fields.');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting registration...');
      console.log('Email:', email.trim());
      console.log('RegisterData1:', registerData1);
      console.log('License Image URI:', registerData1?.licenseImageUri || 'NOT PROVIDED');
      console.log('Firebase Auth:', auth ? 'Initialized' : 'Not initialized');
      console.log('Firebase Database:', realtimeDb ? 'Initialized' : 'Not initialized');
      console.log('Firebase Storage:', storage ? 'Initialized' : 'Not initialized');
      
      // Check internet connectivity
      if (!auth || !realtimeDb) {
        Alert.alert('Error', 'Firebase not properly initialized. Please check your configuration.');
        setLoading(false);
        return;
      }
      
      // Firebase Authentication - Create User
      console.log('Creating user with email:', email.trim());
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email.trim(), 
        createPassword
      );
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);
      
      // Upload license image to Firebase Storage if available
      let licenseImageUrl = '';
      if (registerData1?.licenseImageUri) {
        try {
          console.log('Uploading license image...');
          console.log('Image URI:', registerData1.licenseImageUri);
          
          // Check if storage is initialized
          if (!storage) {
            console.error('Firebase Storage is not initialized');
            throw new Error('Storage not initialized');
          }

          // Read image file using expo-file-system
          console.log('Reading image file...');
          const base64 = await FileSystem.readAsStringAsync(registerData1.licenseImageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('Image read successfully, base64 length:', base64.length);
          
          if (!base64 || base64.length === 0) {
            throw new Error('Image file is empty');
          }

          // Convert base64 to Uint8Array for Firebase Storage
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          
          console.log('Image converted to Uint8Array, size:', byteArray.length);

          // Create unique filename
          const timestamp = Date.now();
          const filename = `licenses/${user.uid}/${timestamp}.jpg`;
          console.log('Uploading to path:', filename);

          // Upload to Firebase Storage
          const imageRef = storageRef(storage, filename);
          console.log('Starting upload to Firebase Storage...');
          
          // Upload bytes directly
          await uploadBytes(imageRef, byteArray, {
            contentType: 'image/jpeg',
          });
          
          console.log('Upload completed, getting download URL...');

          // Get download URL
          licenseImageUrl = await getDownloadURL(imageRef);
          console.log('License image uploaded successfully!');
          console.log('Download URL:', licenseImageUrl);
        } catch (uploadError) {
          console.error('Error uploading license image:', uploadError);
          console.error('Error code:', uploadError.code);
          console.error('Error message:', uploadError.message);
          console.error('Error stack:', uploadError.stack);
          
          // Log more details if available
          if (uploadError.serverResponse) {
            console.error('Server response:', uploadError.serverResponse);
          }
          
          // Continue registration even if image upload fails
          Alert.alert(
            'Warning', 
            `Account created but license image upload failed: ${uploadError.message || 'Unknown error'}. You can upload it later in your profile.`
          );
        }
      } else {
        console.log('No license image URI provided');
      }
      
      // Save user data to Realtime Database
      const userData = {
        uid: user.uid,
        email: email.trim(),
        userType: 'professional',
        fullName: registerData1?.fullName || '',
        gender: registerData1?.gender || '',
        birthDate: registerData1?.birthDate || '',
        specialization: registerData1?.specialization || '',
        licenseNo: registerData1?.licenseNo || '',
        contactNumber: registerData1?.contactNumber || '',
        licenseImageUrl: licenseImageUrl,
        status: 'pending', // Professional status: pending, approved, rejected
        createdAt: new Date().toISOString(),
      };
      
      console.log('Saving user data to database:', userData);
      
      // Save to Realtime Database
      try {
        await set(ref(realtimeDb, `users/${user.uid}`), userData);
        console.log('User data saved successfully to database');
        
        // Create verification request in verificationRequests table
        const verificationRequest = {
          email: email.trim(),
          userId: user.uid,
          fullName: registerData1?.fullName || '',
          specialization: registerData1?.specialization || '',
          licenseNo: registerData1?.licenseNo || '',
          status: 'pending', // pending, approved, rejected
          createdAt: new Date().toISOString(),
        };
        
        const verificationRequestsRef = ref(realtimeDb, 'verificationRequests');
        const newVerificationRef = ref(realtimeDb, `verificationRequests/${user.uid}`);
        await set(newVerificationRef, verificationRequest);
        console.log('Verification request created successfully');
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Even if database save fails, user is created, so we continue
        Alert.alert('Warning', 'Account created but data save failed. Please update your profile later.');
      }
      
      console.log('Professional account created successfully:', user.uid);
      
      // Sign out the user after registration (they need to wait for approval)
      try {
        await signOut(auth);
        console.log('User signed out after registration');
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }

      Alert.alert(
        'Registration Successful', 
        'Your account has been created successfully. Your registration is under review. You will be able to login once your account is approved by the admin.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to login screen
              if (onNavigateToLogin) {
                onNavigateToLogin();
              } else if (onBack) {
                // Fallback: go back to login
                onBack();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('RegisterData1:', registerData1);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'PERMISSION_DENIED' || error.message?.includes('permission')) {
        errorMessage = 'Database permission denied. Please check Firebase Realtime Database rules.';
      } else if (error.message?.includes('database')) {
        errorMessage = 'Database error. Please ensure Realtime Database is enabled in Firebase Console.';
      } else {
        errorMessage = `Registration failed: ${error.message || error.code || 'Unknown error'}`;
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setLoading(false);
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/doktap logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>PROFESSIONAL USER</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Create Password"
            placeholderTextColor="#999"
            value={createPassword}
            onChangeText={setCreatePassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]} 
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0097B2" />
          ) : (
            <Text style={styles.createButtonText}>CREATE ACCOUNT</Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    marginTop: 10,
  },
  logo: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
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
  createButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

