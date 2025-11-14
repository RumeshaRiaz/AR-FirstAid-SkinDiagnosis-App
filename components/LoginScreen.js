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
  Platform
} from 'react-native';

export default function LoginScreen({ onNavigateToRegister, onNavigateToForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Handle login logic here
    console.log('Login pressed');
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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>LOG IN</Text>
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

