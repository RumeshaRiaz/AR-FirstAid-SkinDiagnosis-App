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
import { ref, push } from 'firebase/database';
import { realtimeDb, auth } from '../config/firebaseConfig';

export default function SuggestionScreen({ onBack }) {
  const [suggestion, setSuggestion] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!suggestion.trim()) {
      Alert.alert('Error', 'Please enter your suggestion');
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const user = auth.currentUser;
      const userId = user ? user.uid : 'anonymous';
      const userEmail = user ? user.email : email || 'anonymous';

      // Create suggestion data
      const suggestionData = {
        userId: userId,
        userEmail: userEmail,
        suggestion: suggestion.trim(),
        email: email.trim() || null,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      // Save to Firebase Realtime Database
      const suggestionsRef = ref(realtimeDb, 'suggestions');
      await push(suggestionsRef, suggestionData);

      console.log('Suggestion saved successfully');
      
      // Show success message
      Alert.alert(
        'Success',
        'Your suggestion has been submitted successfully. Thank you for your feedback!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setSuggestion('');
              setEmail('');
              // Navigate back
              onBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving suggestion:', error);
      Alert.alert(
        'Error',
        'Failed to submit suggestion. Please try again.',
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
          <Text style={styles.slogan}>Your Voice Makes Us Better</Text>
          <Text style={styles.title}>SUGGESTION BOX</Text>
          <Text style={styles.headerSubtitle}>We value your thoughts. Help us improve your experience.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Your Suggestion</Text>
          <TextInput
            style={styles.suggestionInput}
            placeholder="Write your suggestion here..."
            placeholderTextColor="#999"
            value={suggestion}
            onChangeText={setSuggestion}
            multiline
            numberOfLines={6}
            editable={!loading}
          />

          <Text style={styles.label}>Optional Email</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="example@mail.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0097B2" />
            ) : (
              <Text style={styles.submitButtonText}>SUBMIT SUGGESTION</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Thank you for helping us grow.</Text>
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
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 60,
  },
  slogan: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
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
  suggestionInput: {
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
  emailInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333333',
    marginBottom: 25,
  },
  submitButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0097B2',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerSection: {
    backgroundColor: '#0097B2',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

