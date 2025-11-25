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
  ActivityIndicator,
  Modal
} from 'react-native';
import { ref, push, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { realtimeDb, auth, storage } from '../config/firebaseConfig';
import { useEffect } from 'react';

export default function ReportProblemScreen({ onBack }) {
  const [problemType, setProblemType] = useState('Burn');
  const [customProblemType, setCustomProblemType] = useState('');
  const [injuryDescription, setInjuryDescription] = useState('');
  const [painLevel, setPainLevel] = useState('Moderate');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [showProblemTypeModal, setShowProblemTypeModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const problemTypes = ['Burn', 'Bleeding', 'Sprain', 'Cut', 'Bruise', 'Infection', 'Other'];
  const painLevels = ['Mild', 'Moderate', 'Severe', 'Emergency'];

  // Load professionals from Firebase
  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setLoadingProfessionals(true);
        const usersRef = ref(realtimeDb, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const users = snapshot.val();
          const professionalList = [];
          
          for (const uid in users) {
            const user = users[uid];
            if (user.userType === 'professional' && user.fullName && user.specialization) {
              professionalList.push({
                uid: uid,
                name: user.fullName,
                specialization: user.specialization
              });
            }
          }
          
          setProfessionals(professionalList);
        }
      } catch (error) {
        console.error('Error loading professionals:', error);
        Alert.alert('Error', 'Failed to load medical professionals');
      } finally {
        setLoadingProfessionals(false);
      }
    };

    loadProfessionals();
  }, []);

  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload photos!');
        return false;
      }
    }
    return true;
  };

  const handleUploadPhoto = async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedImage(null);
  };

  const uploadImageToFirebase = async (imageUri) => {
    try {
      setUploadingImage(true);
      console.log('Uploading report image...');
      console.log('Image URI:', imageUri);
      
      // Check if storage is initialized
      if (!storage) {
        console.error('Firebase Storage is not initialized');
        throw new Error('Storage not initialized');
      }

      // Read image file using expo-file-system
      console.log('Reading image file...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
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
      const user = auth.currentUser;
      const userId = user ? user.uid : 'anonymous';
      const timestamp = Date.now();
      const filename = `reports/${userId}/${timestamp}.jpg`;
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
      const downloadURL = await getDownloadURL(imageRef);
      console.log('Report image uploaded successfully!');
      console.log('Download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!injuryDescription.trim()) {
      Alert.alert('Error', 'Please describe your injury');
      return;
    }

    // If "Other" is selected, validate custom problem type
    if (problemType === 'Other' && !customProblemType.trim()) {
      Alert.alert('Error', 'Please specify the problem type');
      return;
    }

    // Validate phone number (mandatory)
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[0-9]{10,15}$/;
    const cleanPhone = phoneNumber.trim().replace(/[-\s]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    // Validate professional selection
    if (!selectedProfessional) {
      Alert.alert('Error', 'Please select a medical professional');
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const user = auth.currentUser;
      const userId = user ? user.uid : 'anonymous';
      const userEmail = user ? user.email : 'anonymous';

      // Determine final problem type
      const finalProblemType = problemType === 'Other' ? customProblemType.trim() : problemType;

      // Upload image if selected
      let photoUrl = null;
      if (selectedImage) {
        try {
          photoUrl = await uploadImageToFirebase(selectedImage);
        } catch (imageError) {
          console.error('Image upload error:', imageError);
          Alert.alert(
            'Image Upload Failed',
            'Failed to upload image. Do you want to submit the report without the image?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Submit Without Image', onPress: () => {} }
            ]
          );
          return;
        }
      }

      // Get user's full name for the report
      let userName = 'User';
      try {
        const userRef = ref(realtimeDb, `users/${userId}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          userName = userData.fullName || userName;
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }

      // Create report data
      const reportData = {
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        problemType: finalProblemType,
        customProblemType: problemType === 'Other' ? customProblemType.trim() : null,
        injuryDescription: injuryDescription.trim(),
        painLevel: painLevel,
        phoneNumber: cleanPhone,
        location: location.trim() || null,
        photoUrl: photoUrl,
        assignedProfessionalId: selectedProfessional.uid,
        assignedProfessionalName: selectedProfessional.name,
        assignedProfessionalSpecialization: selectedProfessional.specialization,
        createdAt: new Date().toISOString(),
        status: 'pending',
        accepted: false,
        priority: painLevel === 'Emergency' ? 'high' : painLevel === 'Severe' ? 'medium' : 'low'
      };

      // Save to Firebase Realtime Database
      const reportsRef = ref(realtimeDb, 'reports');
      const reportSnapshot = await push(reportsRef, reportData);
      const reportId = reportSnapshot.key;

      console.log('Report saved successfully with ID:', reportId);

      // Send notification to assigned professional
      try {
        console.log('Attempting to send notification to professional:', selectedProfessional.uid);
        const professionalRef = ref(realtimeDb, `users/${selectedProfessional.uid}/expoPushToken`);
        const tokenSnapshot = await get(professionalRef);
        
        if (tokenSnapshot.exists()) {
          const expoPushToken = tokenSnapshot.val();
          console.log('Found push token for professional:', expoPushToken);
          
          // Send notification via Expo Push API
          const message = {
            to: expoPushToken,
            sound: 'default',
            title: 'New Emergency Report',
            body: `${userName} needs your help at ${location || 'your location'}. Problem: ${finalProblemType}`,
            data: {
              reportId: reportId,
              type: 'new_report',
              userName: userName,
              problemType: finalProblemType,
              location: location,
              painLevel: painLevel
            },
            priority: painLevel === 'Emergency' ? 'high' : 'default',
          };

          console.log('Sending notification with message:', JSON.stringify(message, null, 2));
          
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });

          const result = await response.json();
          console.log('Notification API response:', result);
          
          if (result.data && result.data.status === 'ok') {
            console.log('✅ Notification sent successfully to professional');
          } else {
            console.warn('⚠️ Notification may not have been sent. Response:', result);
          }
        } else {
          console.warn('⚠️ Professional does not have push token registered. They need to login first to receive notifications.');
          console.log('Professional ID:', selectedProfessional.uid);
          console.log('Professional Name:', selectedProfessional.name);
          console.log('Note: Professional must login to register their push token.');
        }
      } catch (notificationError) {
        console.error('❌ Error sending notification:', notificationError);
        console.error('Error details:', {
          message: notificationError.message,
          stack: notificationError.stack
        });
        // Don't fail the report submission if notification fails
      }
      
      // Show success message
      Alert.alert(
        'Success',
        'Your report has been submitted successfully. We will review it and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setProblemType('Burn');
              setCustomProblemType('');
              setInjuryDescription('');
              setPainLevel('Moderate');
              setPhoneNumber('');
              setLocation('');
              setSelectedProfessional(null);
              setSelectedImage(null);
              // Navigate back
              onBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/small-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.tagline}>Your Health. Our Priority.</Text>
          <Text style={styles.title}>REPORT A MEDICAL PROBLEM</Text>
          <Text style={styles.headerSubtitle}>Tell us what injury or problem you are experiencing. We'll guide you toward the right care.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Type of Problem</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowProblemTypeModal(true)}
            disabled={loading}
          >
            <Text style={styles.dropdownText}>
              {problemType === 'Other' && customProblemType ? customProblemType : problemType}
            </Text>
            <View style={styles.chevronIcon}>
              <View style={styles.chevronLine1} />
              <View style={styles.chevronLine2} />
            </View>
          </TouchableOpacity>

          {problemType === 'Other' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specify Problem Type</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Type your problem here..."
                placeholderTextColor="#999"
                value={customProblemType}
                onChangeText={setCustomProblemType}
                editable={!loading}
              />
            </View>
          )}

          <Text style={styles.label}>Describe Your Injury</Text>
          <TextInput
            style={styles.injuryInput}
            placeholder="Describe what happened, when it happened, and how severe it feels..."
            placeholderTextColor="#999"
            value={injuryDescription}
            onChangeText={setInjuryDescription}
            multiline
            numberOfLines={5}
            editable={!loading}
          />

          <Text style={styles.label}>Pain Level</Text>
          <View style={styles.painLevelContainer}>
            {painLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.painLevelButton,
                  painLevel === level && styles.painLevelButtonActive
                ]}
                onPress={() => setPainLevel(level)}
                disabled={loading}
              >
                <Text style={[
                  styles.painLevelText,
                  painLevel === level && styles.painLevelTextActive
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Select Medical Professional <Text style={styles.required}>*</Text></Text>
          {loadingProfessionals ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0097B2" />
              <Text style={styles.loadingText}>Loading professionals...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => setShowProfessionalModal(true)}
              disabled={loading || professionals.length === 0}
            >
              <Text style={[styles.dropdownText, !selectedProfessional && styles.placeholderText]}>
                {selectedProfessional 
                  ? `${selectedProfessional.name} - ${selectedProfessional.specialization}`
                  : 'Select a medical professional'}
              </Text>
              <View style={styles.chevronIcon}>
                <View style={styles.chevronLine1} />
                <View style={styles.chevronLine2} />
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Add Photo (Optional)</Text>
          
          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={handleRemovePhoto}
                disabled={loading || uploadingImage}
              >
                <Text style={styles.removeImageText}>× Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={handleUploadPhoto}
              disabled={loading || uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color="#0097B2" />
              ) : (
                <>
                  <View style={styles.cameraIcon}>
                    <View style={styles.cameraBody} />
                    <View style={styles.cameraLens} />
                  </View>
                  <Text style={styles.uploadButtonText}>Upload Injury Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="03XX-XXXXXXX"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.locationInput}
            placeholder="Enter your location (e.g., City, Address)"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0097B2" />
          ) : (
            <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>We ensure your safety with smart and quick care.</Text>
        </View>
      </ScrollView>

      {/* Problem Type Picker Modal */}
      <Modal
        visible={showProblemTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProblemTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Problem Type</Text>
            {problemTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalOption}
                onPress={() => {
                  setProblemType(type);
                  setShowProblemTypeModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{type}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowProblemTypeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Professional Picker Modal */}
      <Modal
        visible={showProfessionalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfessionalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Medical Professional</Text>
            {professionals.length === 0 ? (
              <View style={styles.modalOption}>
                <Text style={styles.modalOptionText}>No professionals available</Text>
              </View>
            ) : (
              professionals.map((prof) => (
                <TouchableOpacity
                  key={prof.uid}
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedProfessional(prof);
                    setShowProfessionalModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{prof.name}</Text>
                  <Text style={styles.modalOptionSubtext}>{prof.specialization}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowProfessionalModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerSection: {
    backgroundColor: '#0097B2',
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 60,
  },
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: 10,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0097B2',
    marginBottom: 10,
    marginTop: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  chevronIcon: {
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
  injuryInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  painLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  painLevelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  painLevelButtonActive: {
    backgroundColor: '#E0F7FA',
  },
  painLevelText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
    textAlign: 'center',
  },
  painLevelTextActive: {
    color: '#0097B2',
    fontWeight: 'bold',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cameraIcon: {
    width: 24,
    height: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBody: {
    width: 20,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#0097B2',
    backgroundColor: 'transparent',
  },
  cameraLens: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0097B2',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#0097B2',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  removeImageButton: {
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
  },
  required: {
    color: '#FF4444',
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginBottom: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0097B2',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  modalOptionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalCancel: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#0097B2',
    fontWeight: '600',
  },
  footerSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

