import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { signOut } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { auth, realtimeDb } from '../config/firebaseConfig';

export default function ProfessionalProfileScreen({ onBack, onLogout }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gender, setGender] = useState('Select Gender');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [displayDate, setDisplayDate] = useState('dd/mm/yyyy');

  // Professional Details
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [hospitalClinicName, setHospitalClinicName] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  // Load user data from Firebase
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        setLoadingHospitals(true);
        const snapshot = await get(ref(realtimeDb, 'hospitals'));

        if (snapshot.exists()) {
          const hospitalData = snapshot.val();
          const hospitalList = Object.keys(hospitalData)
            .map((hospitalId) => ({
              id: hospitalId,
              name: hospitalData[hospitalId]?.name || hospitalData[hospitalId]?.hospitalName || 'Unnamed Hospital',
              address: hospitalData[hospitalId]?.address || '',
            }))
            .filter((hospital) => hospital.name);

          setHospitals(hospitalList);
        } else {
          setHospitals([]);
        }
      } catch (error) {
        console.error('Error loading hospitals:', error);
        Alert.alert('Error', 'Failed to load hospitals');
      } finally {
        setLoadingHospitals(false);
      }
    };

    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert('Error', 'User not logged in');
          return;
        }

        const userRef = ref(realtimeDb, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          // Set personal information
          setFullName(userData.fullName || '');
          setEmail(userData.email || user.email || '');
          setContactNumber(userData.contactNumber || '');
          setGender(userData.gender || 'Select Gender');
          
          // Set date of birth
          if (userData.birthDate) {
            try {
              let birthDate;
              const dateValue = userData.birthDate;
              
              // Handle different date formats
              if (typeof dateValue === 'string') {
                // Check if it's in DD/MM/YYYY format (from registration)
                const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                const match = dateValue.match(ddmmyyyyPattern);
                
                if (match) {
                  // Parse DD/MM/YYYY format
                  const day = parseInt(match[1], 10);
                  const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
                  const year = parseInt(match[3], 10);
                  birthDate = new Date(year, month, day);
                } else {
                  // Try ISO format or other standard formats
                  birthDate = new Date(dateValue);
                }
              } else if (dateValue instanceof Date) {
                birthDate = dateValue;
              } else {
                // Try to convert to date
                birthDate = new Date(dateValue);
              }
              
              // Validate and set the date
              if (!isNaN(birthDate.getTime()) && birthDate.getFullYear() > 1900 && birthDate.getFullYear() <= new Date().getFullYear()) {
                setDateOfBirth(birthDate);
                const day = String(birthDate.getDate()).padStart(2, '0');
                const month = String(birthDate.getMonth() + 1).padStart(2, '0');
                const year = birthDate.getFullYear();
                setDisplayDate(`${day}/${month}/${year}`);
              } else {
                console.warn('Invalid birth date format:', dateValue);
              }
            } catch (dateError) {
              console.error('Error parsing birth date:', dateError, 'Value:', userData.birthDate);
            }
          }

          // Set professional details
          setLicenseNumber(userData.licenseNo || '');
          setSpecialization(userData.specialization || '');
          setSelectedHospitalId(userData.hospitalId || '');
          setHospitalClinicName(userData.hospitalName || userData.hospitalClinicName || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadHospitals();
    loadUserData();
  }, []);

  const genders = ['Male', 'Female', 'Other'];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDisplayDate(`${day}/${month}/${year}`);
    }
  };

  const handleEditProfile = () => {
    setIsEditMode(true);
  };

  const handleSaveChanges = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      setSaving(true);

      // Validate required fields
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        setSaving(false);
        return;
      }

      if (!selectedHospitalId) {
        Alert.alert('Error', 'Please select your hospital');
        setSaving(false);
        return;
      }

      const selectedHospital = hospitals.find((hospital) => hospital.id === selectedHospitalId);
      const selectedHospitalName = selectedHospital?.name || hospitalClinicName.trim();

      // Prepare user data
      const userData = {
        uid: user.uid,
        email: email.trim() || user.email,
        userType: 'professional',
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        gender: gender !== 'Select Gender' ? gender : '',
        birthDate: dateOfBirth.toISOString(),
        licenseNo: licenseNumber.trim(),
        specialization: specialization.trim(),
        hospitalId: selectedHospitalId,
        hospitalName: selectedHospitalName,
        hospitalAddress: selectedHospital?.address || '',
        hospitalClinicName: selectedHospitalName,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firebase without removing existing approval/status fields.
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      await update(userRef, userData);

      console.log('Profile updated successfully');
      setIsEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('User logged out successfully');
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                <View style={styles.profileImagePlaceholder}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.profileImageText}>
                      {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'DR'}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.cameraButton}>
                <View style={styles.cameraIcon}>
                  <View style={styles.cameraLens} />
                </View>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginBottom: 5 }} />
            ) : (
              <Text style={styles.userName}>Dr. {fullName || 'Professional'}</Text>
            )}
            <Text style={styles.userType}>Medical Professional</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  editable={isEditMode}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="03XX-XXXXXXXX"
                  placeholderTextColor="#999"
                  editable={isEditMode}
                  keyboardType="phone-pad"
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity 
                style={[styles.input, styles.dropdown]}
                onPress={() => {
                  if (!isEditMode) {
                    handleEditProfile();
                  } else {
                    setShowGenderPicker(true);
                  }
                }}
              >
                <Text style={[styles.dropdownText, gender === 'Select Gender' && styles.placeholderText]}>
                  {gender}
                </Text>
                {isEditMode && <Text style={styles.dropdownArrow}>▼</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity 
                style={[styles.input, styles.dropdown]}
                onPress={() => {
                  if (!isEditMode) {
                    handleEditProfile();
                  } else {
                    setShowDatePicker(true);
                  }
                }}
              >
                <Text style={[styles.dropdownText, displayDate === 'dd/mm/yyyy' && styles.placeholderText]}>
                  {displayDate}
                </Text>
                {isEditMode && (
                  <View style={styles.calendarIconContainer}>
                    <View style={styles.calendarIcon}>
                      <View style={styles.calendarTop} />
                      <View style={styles.calendarBody} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Number</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="License Number"
                  placeholderTextColor="#999"
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialization</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, !isEditMode && styles.inputDisabled]}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="Specialization"
                  placeholderTextColor="#999"
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital</Text>
              <TouchableOpacity 
                style={[styles.input, styles.dropdown, !isEditMode && styles.inputDisabled]}
                onPress={() => {
                  if (!isEditMode) {
                    setIsEditMode(true);
                  }
                  setShowHospitalPicker(true);
                }}
                disabled={loadingHospitals}
              >
                <Text style={[styles.dropdownText, !hospitalClinicName && styles.placeholderText]}>
                  {loadingHospitals ? 'Loading hospitals...' : hospitalClinicName || 'Select Hospital'}
                </Text>
                {isEditMode && <Text style={styles.dropdownArrow}>▼</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {isEditMode ? (
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>EDIT PROFILE</Text>
          </TouchableOpacity>
        )}
        
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {genders.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.modalOption}
                onPress={() => {
                  setGender(item);
                  setShowGenderPicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowGenderPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Hospital Picker Modal */}
      <Modal
        visible={showHospitalPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHospitalPicker(false)}
      >
        <View style={[styles.modalOverlay, styles.popupOverlay]}>
          <View style={styles.popupContent}>
            <Text style={styles.modalTitle}>Select Hospital</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {hospitals.length === 0 ? (
                <View style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>No hospitals available</Text>
                </View>
              ) : (
                hospitals.map((hospital) => (
                  <TouchableOpacity
                    key={hospital.id}
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedHospitalId(hospital.id);
                      setHospitalClinicName(hospital.name);
                      setShowHospitalPicker(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{hospital.name}</Text>
                    {!!hospital.address && (
                      <Text style={styles.modalOptionSubtext}>{hospital.address}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowHospitalPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    backgroundColor: '#0097B2',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholder: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#00B8D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLens: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userType: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0097B2',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#0097B2',
  },
  calendarIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIcon: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  calendarTop: {
    width: 18,
    height: 6,
    backgroundColor: '#0097B2',
    borderRadius: 2,
    marginBottom: -1,
  },
  calendarBody: {
    width: 18,
    height: 12,
    backgroundColor: '#0097B2',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0097B2',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  saveButton: {
    backgroundColor: '#0097B2',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popupOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '50%',
  },
  popupContent: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  modalList: {
    maxHeight: 380,
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
  },
  modalOptionSubtext: {
    fontSize: 13,
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
});

