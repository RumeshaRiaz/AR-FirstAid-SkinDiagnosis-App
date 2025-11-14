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

export default function ForgotPassword2({ onBack, onNext, onResend }) {
  const [code, setCode] = useState('');

  const handleNext = () => {
    if (onNext) {
      onNext(code);
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

        <Text style={styles.title}>FORGOT PASSWORD</Text>
        <Text style={styles.instructionText}>Enter the code sent to your email</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>NEXT</Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't received code? </Text>
          <TouchableOpacity onPress={onResend}>
            <Text style={styles.resendLink}>Resend</Text>
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
    marginBottom: 10,
    letterSpacing: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  nextButtonText: {
    color: '#0097B2',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  resendLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

