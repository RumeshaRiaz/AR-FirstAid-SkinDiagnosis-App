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
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, realtimeDb } from '../config/firebaseConfig';

export default function UpdatePasswordScreen({ onBack, onPasswordUpdated }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // Check if email exists in database
      const usersRef = ref(realtimeDb, 'users');
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        Alert.alert('Error', 'No users found in database');
        setLoading(false);
        return;
      }

      // Find user by email
      let userFound = false;
      let userId = null;
      const users = snapshot.val();
      
      for (const uid in users) {
        if (users[uid].email === email.trim()) {
          userFound = true;
          userId = uid;
          break;
        }
      }

      if (!userFound) {
        Alert.alert('Error', 'Email not found. Please check your email address.');
        setLoading(false);
        return;
      }

      // Save new password in database
      await set(ref(realtimeDb, `users/${userId}/password`), newPassword);
      
      // Try to update Firebase Auth password
      // Note: This requires authentication, so we'll try to send reset email
      // But password is already saved in database for login
      try {
        await sendPasswordResetEmail(auth, email.trim());
        console.log('Password reset email sent');
      } catch (resetError) {
        console.log('Password reset email not sent (may not be configured):', resetError.message);
        // Continue anyway - password is saved in database
      }
      
      Alert.alert(
        'Password Updated Successfully',
        'Your password has been updated. You can now login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onPasswordUpdated) {
                onPasswordUpdated();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Update password error:', error);
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'Email not found. Please check your email address.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Invalid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Too many requests. Please try again later.');
      } else {
        Alert.alert('Error', `Failed to update password: ${error.message}`);
      }
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

        <Text style={styles.title}>UPDATE PASSWORD</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Your Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.changeButton, loading && styles.changeButtonDisabled]} 
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0097B2" />
          ) : (
            <Text style={styles.changeButtonText}>UPDATE PASSWORD</Text>
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
    paddingTop: 60,
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
    marginBottom: 10,
    marginTop: 20,
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
    marginBottom: 30,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 30,
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
  changeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    color: '#0097B2',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

