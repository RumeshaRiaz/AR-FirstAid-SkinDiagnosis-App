import React from 'react';
import { 
  View, 
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

export default function RegisterScreen({ onBack, onNavigateToRegularUser, onNavigateToProfessional }) {
  const handleRegularUser = () => {
    if (onNavigateToRegularUser) {
      onNavigateToRegularUser();
    }
  };

  const handleMedicalProfessional = () => {
    if (onNavigateToProfessional) {
      onNavigateToProfessional();
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

        <Text style={styles.title}>Register As!</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.userButton} 
            onPress={handleRegularUser}
          >
            <Text style={styles.buttonText}>Regular User</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <TouchableOpacity 
            style={styles.userButton} 
            onPress={handleMedicalProfessional}
          >
            <Text style={styles.buttonText}>Medical Professional</Text>
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
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 50,
    letterSpacing: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  userButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  orText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    marginTop: 5,
    textAlign: 'center',
  },
});

