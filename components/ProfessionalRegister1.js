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
  Modal,
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export default function ProfessionalRegister1({ onBack, onNavigateToProfessionalRegister2 }) {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [licenseImageUri, setLicenseImageUri] = useState(null);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  const genderOptions = ['Male', 'Female', 'Other'];

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setBirthDate(formatDate(date));
    }
  };

  const handleGenderSelect = (selectedGender) => {
    setGender(selectedGender);
    setShowGenderDropdown(false);
  };

  const handleNext = () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!gender.trim()) {
      Alert.alert('Error', 'Please enter your gender');
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert('Error', 'Please enter your birth date');
      return;
    }
    if (!specialization.trim()) {
      Alert.alert('Error', 'Please enter your specialization');
      return;
    }
    if (!licenseNo.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please enter your contact number');
      return;
    }
    if (contactNumber.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid contact number');
      return;
    }

    // Navigate to Register2 with data
    if (onNavigateToProfessionalRegister2) {
      onNavigateToProfessionalRegister2({
        fullName: fullName.trim(),
        gender: gender.trim(),
        birthDate: birthDate.trim(),
        specialization: specialization.trim(),
        licenseNo: licenseNo.trim(),
        contactNumber: contactNumber.trim(),
        licenseImageUri: licenseImageUri
      });
    }
  };

  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload your license!');
        return false;
      }
    }
    return true;
  };

  const handleUploadLicense = async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLicenseImageUri(result.assets[0].uri);
        Alert.alert('Success', 'License image selected. You can change it by selecting again.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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
            placeholder="Full Name"
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TouchableOpacity 
            style={styles.input}
            onPress={() => setShowGenderDropdown(true)}
          >
            <Text style={gender ? styles.inputText : styles.placeholderText}>
              {gender || 'Gender'}
            </Text>
            <View style={styles.dropdownArrow}>
              <View style={styles.chevronLine1} />
              <View style={styles.chevronLine2} />
            </View>
          </TouchableOpacity>

          <Modal
            visible={showGenderDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowGenderDropdown(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowGenderDropdown(false)}
            >
              <View style={styles.dropdownContainer}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownOption}
                    onPress={() => handleGenderSelect(option)}
                  >
                    <Text style={styles.dropdownOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <TouchableOpacity 
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={birthDate ? styles.inputText : styles.placeholderText}>
              {birthDate || 'Birth Date'}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
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

        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadLicense} disabled={uploadingLicense}>
          {uploadingLicense ? (
            <ActivityIndicator color="#0097B2" size="small" />
          ) : (
            <>
              <Text style={styles.uploadButtonText}>
                {licenseImageUri ? 'License Image Selected ✓' : 'Upload Your Medical License'}
              </Text>
              <Text style={styles.uploadIcon}>☁</Text>
            </>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  dropdownArrow: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chevronLine1: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '45deg' }],
    top: 8,
    right: 4,
  },
  chevronLine2: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '-45deg' }],
    top: 8,
    left: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
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

