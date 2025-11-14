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

export default function ProfessionalRegister1({ onBack, onNavigateToProfessionalRegister2 }) {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const handleNext = () => {
    if (onNavigateToProfessionalRegister2) {
      onNavigateToProfessionalRegister2({
        fullName,
        gender,
        birthDate,
        specialization,
        licenseNo,
        contactNumber
      });
    }
  };

  const handleUploadLicense = () => {
    // Handle license upload here
    console.log('Upload license pressed');
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
            placeholder="Full Name"
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Gender"
            placeholderTextColor="#999"
            value={gender}
            onChangeText={setGender}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Birth Date"
            placeholderTextColor="#999"
            value={birthDate}
            onChangeText={setBirthDate}
          />
          <TextInput
            style={styles.input}
            placeholder="Specialization"
            placeholderTextColor="#999"
            value={specialization}
            onChangeText={setSpecialization}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="License No."
            placeholderTextColor="#999"
            value={licenseNo}
            onChangeText={setLicenseNo}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Contact Number"
            placeholderTextColor="#999"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadLicense}>
          <Text style={styles.uploadButtonText}>Upload Your Medical License</Text>
          <Text style={styles.uploadIcon}>☁</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>NEXT</Text>
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
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#999',
    fontSize: 16,
    flex: 1,
  },
  uploadIcon: {
    fontSize: 24,
    color: '#0097B2',
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

