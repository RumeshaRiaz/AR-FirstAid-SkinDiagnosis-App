import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image,
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
import { ref, get, set } from 'firebase/database';
import { auth, realtimeDb } from '../config/firebaseConfig';

export default function ProfileScreen({ onBack, onLogout }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(null);

  // Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gender, setGender] = useState('Select Gender');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [displayDate, setDisplayDate] = useState('DD / MM / YYYY');

  // Medical Information
  const [bloodType, setBloodType] = useState('Select Blood Type');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');

  // Emergency Contacts - Start with only one
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: 1, name: '', number: '', relationship: 'Select Relationship' }
  ]);

  // Load user data from Firebase
  useEffect(() => {
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
                setDisplayDate(`${day} / ${month} / ${year}`);
              } else {
                console.warn('Invalid birth date format:', dateValue);
              }
            } catch (dateError) {
              console.error('Error parsing birth date:', dateError, 'Value:', userData.birthDate);
            }
          }

          // Set medical information
          setBloodType(userData.bloodType || 'Select Blood Type');
          setAllergies(userData.allergies || '');
          setMedicalConditions(userData.medicalConditions || '');
          setCurrentMedications(userData.currentMedications || '');

          // Set emergency contacts
          if (userData.emergencyContacts && Array.isArray(userData.emergencyContacts) && userData.emergencyContacts.length > 0) {
            setEmergencyContacts(userData.emergencyContacts.map((contact, index) => ({
              id: index + 1,
              name: contact.name || '',
              number: contact.number || '',
              relationship: contact.relationship || 'Select Relationship'
            })));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const genders = ['Male', 'Female', 'Other'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const relationships = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDisplayDate(`${day} / ${month} / ${year}`);
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

      // Prepare user data
      const userData = {
        uid: user.uid,
        email: email.trim() || user.email,
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        gender: gender !== 'Select Gender' ? gender : '',
        birthDate: dateOfBirth.toISOString(),
        bloodType: bloodType !== 'Select Blood Type' ? bloodType : '',
        allergies: allergies.trim(),
        medicalConditions: medicalConditions.trim(),
        currentMedications: currentMedications.trim(),
        emergencyContacts: emergencyContacts
          .filter(contact => contact.name.trim() || contact.number.trim())
          .map(contact => ({
            name: contact.name.trim(),
            number: contact.number.trim(),
            relationship: contact.relationship !== 'Select Relationship' ? contact.relationship : ''
          })),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firebase
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      await set(userRef, { ...userData });

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

  const handleAddEmergencyContact = () => {
    if (emergencyContacts.length < 2) {
      setEmergencyContacts([...emergencyContacts, { 
        id: emergencyContacts.length + 1, 
        name: '', 
        number: '', 
        relationship: 'Select Relationship' 
      }]);
    } else {
      Alert.alert('Limit Reached', 'You can add maximum 2 emergency contacts');
    }
  };

  const handleDeleteEmergencyContact = (id) => {
    if (emergencyContacts.length > 1) {
      setEmergencyContacts(emergencyContacts.filter(contact => contact.id !== id));
    } else {
      Alert.alert('Error', 'At least one emergency contact is required');
    }
  };

  const handleUpdateEmergencyContact = (id, field, value) => {
    setEmergencyContacts(emergencyContacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
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
                      {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
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
              <Text style={styles.userName}>{fullName || 'User'}</Text>
            )}
            <Text style={styles.tagline}>Manage your personal & emergency info</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
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
                  placeholder="example@email.com"
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
                  placeholder="03XX-XXXXXXX"
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
                <Text style={styles.dropdownArrow}>▼</Text>
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
                <Text style={[styles.dropdownText, displayDate === 'DD / MM / YYYY' && styles.placeholderText]}>
                  {displayDate}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Emergency Contacts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.emergencyContactBlock}>
                {isEditMode && emergencyContacts.length > 1 && (
                  <View style={styles.emergencyContactHeader}>
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleDeleteEmergencyContact(contact.id)}
                    >
                      <View style={styles.deleteIcon}>
                        <View style={styles.deleteIconLine1} />
                        <View style={styles.deleteIconLine2} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    onPress={() => !isEditMode && handleEditProfile()}
                    activeOpacity={isEditMode ? 1 : 0.7}
                  >
                    <TextInput
                      style={[styles.input, styles.emergencyInput, !isEditMode && styles.inputDisabled]}
                      value={contact.name}
                      onChangeText={(value) => handleUpdateEmergencyContact(contact.id, 'name', value)}
                      placeholder="Full Name"
                      placeholderTextColor="#999"
                      editable={isEditMode}
                      pointerEvents={isEditMode ? 'auto' : 'none'}
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    onPress={() => !isEditMode && handleEditProfile()}
                    activeOpacity={isEditMode ? 1 : 0.7}
                  >
                    <TextInput
                      style={[styles.input, styles.emergencyInput, !isEditMode && styles.inputDisabled]}
                      value={contact.number}
                      onChangeText={(value) => handleUpdateEmergencyContact(contact.id, 'number', value)}
                      placeholder="03XX-XXXXXXX"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      editable={isEditMode}
                      pointerEvents={isEditMode ? 'auto' : 'none'}
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputGroup}>
                  <TouchableOpacity 
                    style={[styles.input, styles.dropdown, styles.emergencyInput]}
                    onPress={() => {
                      if (!isEditMode) {
                        handleEditProfile();
                      } else {
                        setShowRelationshipPicker(contact.id);
                      }
                    }}
                  >
                    <Text style={[styles.dropdownText, contact.relationship === 'Select Relationship' && styles.placeholderText]}>
                      {contact.relationship}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {isEditMode && emergencyContacts.length < 2 && (
              <TouchableOpacity 
                style={styles.addContactButton}
                onPress={handleAddEmergencyContact}
              >
                <View style={styles.addIcon}>
                  <View style={styles.addIconHorizontal} />
                  <View style={styles.addIconVertical} />
                </View>
                <Text style={styles.addContactText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Medical Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Blood Type</Text>
              <TouchableOpacity 
                style={[styles.input, styles.dropdown]}
                onPress={() => {
                  if (!isEditMode) {
                    handleEditProfile();
                  } else {
                    setShowBloodTypePicker(true);
                  }
                }}
              >
                <Text style={[styles.dropdownText, bloodType === 'Select Blood Type' && styles.placeholderText]}>
                  {bloodType}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Allergies</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, styles.textArea, !isEditMode && styles.inputDisabled]}
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Pollen, Dust, Penicillin"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical Conditions</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, styles.textArea, !isEditMode && styles.inputDisabled]}
                  value={medicalConditions}
                  onChangeText={setMedicalConditions}
                  placeholder="e.g. Asthma, Diabetes"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Medications</Text>
              <TouchableOpacity 
                onPress={() => !isEditMode && handleEditProfile()}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <TextInput
                  style={[styles.input, styles.textArea, !isEditMode && styles.inputDisabled]}
                  value={currentMedications}
                  onChangeText={setCurrentMedications}
                  placeholder="e.g. Insulin, Antibiotics"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  editable={isEditMode}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!isEditMode ? (
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>EDIT PROFILE</Text>
              </TouchableOpacity>
            ) : (
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
            )}
            
            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Your medical info helps us respond faster in emergencies.
          </Text>
        </View>
      </ScrollView>

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

      {/* Blood Type Picker Modal */}
      <Modal
        visible={showBloodTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBloodTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Blood Type</Text>
            {bloodTypes.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.modalOption}
                onPress={() => {
                  setBloodType(item);
                  setShowBloodTypePicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowBloodTypePicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Relationship Picker Modal */}
      <Modal
        visible={showRelationshipPicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRelationshipPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Relationship</Text>
            {relationships.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.modalOption}
                onPress={() => {
                  if (showRelationshipPicker) {
                    handleUpdateEmergencyContact(showRelationshipPicker, 'relationship', item);
                  }
                  setShowRelationshipPicker(null);
                }}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowRelationshipPicker(null)}
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
    paddingBottom: 30,
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
    backgroundColor: '#0097B2',
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
  tagline: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0097B2',
    marginBottom: 15,
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
    backgroundColor: '#FFFFFF',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  emergencyContactBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  iconButton: {
    marginLeft: 10,
    padding: 5,
  },
  deleteIcon: {
    width: 18,
    height: 18,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconLine1: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '45deg' }],
  },
  deleteIconLine2: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '-45deg' }],
  },
  emergencyInput: {
    marginBottom: 10,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0097B2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  addIcon: {
    width: 20,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addIconHorizontal: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#0097B2',
  },
  addIconVertical: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#0097B2',
  },
  addContactText: {
    fontSize: 16,
    color: '#0097B2',
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0097B2',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
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
    marginTop: 15,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
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

