import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet
} from 'react-native';
import { OPENAI_API_KEY } from '../config/apiConfig';
import { auth } from '../config/firebaseConfig';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '../config/firebaseConfig';

export default function SymptomsCheckerScreen({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = ref(realtimeDb, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const name = userData.fullName || userData.name || 'User';
            // Extract first name if full name has space
            const firstName = name.split(' ')[0];
            setUserName(firstName);
          } else {
            setUserName('User');
          }
        } else {
          setUserName('User');
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('User');
      }
    };

    fetchUserName();
  }, []);

  const symptoms = [
    { id: 1, label: 'Burn' },
    { id: 2, label: 'Bleeding' },
    { id: 3, label: 'Headache' },
    { id: 4, label: 'Red Eye' },
    { id: 5, label: 'Cough' },
    { id: 6, label: 'Fever' },
    { id: 7, label: 'Vomiting' },
    { id: 8, label: 'Skin Rash' },
    { id: 9, label: 'Swelling' },
    { id: 10, label: 'Back Pain' },
    { id: 11, label: 'Stomach Pain' },
    { id: 12, label: 'Tooth Pain' },
    { id: 13, label: 'Ear Pain' },
  ];

  let lastCallTime = 0;
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const getFallbackAdvice = (symptom) => {
    const symptomLower = symptom.toLowerCase();
    const fallbackData = {
      'burn': {
        symptom_detected: 'Burn',
        possible_cause: 'Heat exposure, chemicals, or electricity',
        precautions: ['Remove from heat source immediately', 'Do not apply ice directly', 'Do not break blisters'],
        home_treatment: ['Cool with cool (not cold) running water for 10-15 minutes', 'Cover with sterile non-stick bandage', 'Take over-the-counter pain relievers if needed'],
        seek_doctor_if: ['Burns larger than 3 inches', 'Burns on face, hands, or feet', 'Chemical or electrical burns', 'Signs of infection']
      },
      'bleeding': {
        symptom_detected: 'Bleeding',
        possible_cause: 'Cut, wound, or injury',
        precautions: ['Apply direct pressure', 'Elevate the injured area if possible', 'Do not remove embedded objects'],
        home_treatment: ['Apply clean cloth or bandage with firm pressure', 'Keep pressure for at least 10-15 minutes', 'Clean wound gently with water once bleeding stops'],
        seek_doctor_if: ['Bleeding is severe', "Bleeding doesn't stop after 15 minutes", 'Deep wound or puncture', 'Signs of infection']
      },
      'headache': {
        symptom_detected: 'Headache',
        possible_cause: 'Stress, dehydration, or tension',
        precautions: ['Rest in a quiet, dark room', 'Stay hydrated', 'Avoid bright lights and loud noises'],
        home_treatment: ['Apply cold or warm compress to forehead', 'Take over-the-counter pain relievers', 'Practice relaxation techniques'],
        seek_doctor_if: ['Severe or sudden headache', 'Headache with fever or stiff neck', 'Headache after head injury', 'Persistent headaches']
      },
      'fever': {
        symptom_detected: 'Fever',
        possible_cause: 'Infection or illness',
        precautions: ['Stay hydrated', 'Rest', 'Monitor temperature regularly'],
        home_treatment: ['Take over-the-counter fever reducers', 'Apply cool compresses', 'Drink plenty of fluids'],
        seek_doctor_if: ['Fever above 103°F (39.4°C)', 'Fever lasting more than 3 days', 'Fever with severe symptoms', 'Infant under 3 months with fever']
      }
    };

    for (const [key, value] of Object.entries(fallbackData)) {
      if (symptomLower.includes(key)) {
        return value;
      }
    }

    return {
      symptom_detected: symptom,
      possible_cause: 'Various possible causes',
      precautions: ['Keep the affected area clean', 'Avoid further injury or irritation', 'Monitor symptoms closely'],
      home_treatment: ['Apply appropriate first aid', 'Rest if needed', 'Use over-the-counter pain relief if appropriate'],
      seek_doctor_if: ['Symptoms worsen', 'Symptoms persist', 'Severe pain', 'Difficulty breathing']
    };
  };

  const callOpenAI = async (symptom) => {
    try {
      setLoading(true);
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a medical assistant AI. Respond ONLY in clean JSON. No text outside JSON. Format: {\"symptom_detected\":\"\", \"possible_cause\":\"\", \"precautions\":[], \"home_treatment\":[], \"seek_doctor_if\":[]}"
            },
            {
              role: "user",
              content: `Symptom: ${symptom}. Provide JSON only.`
            }
          ],
          temperature: 0.2,
          max_tokens: 400
        })
      });
  
      const data = await response.json();
  
      if (data?.choices?.[0]?.message?.content) {
        const clean = data.choices[0].message.content.trim();
  
        // Parse safely
        const parsed = JSON.parse(clean);
  
        setApiResponse(parsed);
        setShowResults(true);
      } else {
        // If JSON missing → fallback
        setApiResponse(getFallbackAdvice(symptom));
        setShowResults(true);
      }
    } catch (err) {
      console.log("OpenAI Error:", err);
      setApiResponse(getFallbackAdvice(symptom));
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  };
  

  const handleSymptomSelect = (symptom) => {
    if (loading) return;
    setLoading(true);
    setSelectedSymptom(symptom.label);
    callOpenAI(symptom.label);
  };

  const handleTextSubmit = () => {
    if (loading) return;

    if (!symptomText.trim()) {
      Alert.alert('Error', 'Please type a symptom.');
      return;
    }

    setLoading(true);
    setSelectedSymptom(symptomText.trim());
    callOpenAI(symptomText.trim());
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/small-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>WHAT HAPPEN {userName ? userName.toUpperCase() : 'USER'}?</Text>
        <Text style={styles.subtitle}>Describe or show your symptoms to continue</Text>

        <View style={styles.symptomGrid}>
          {symptoms.map((symptom) => (
            <TouchableOpacity
              key={symptom.id}
              style={styles.symptomButton}
              onPress={() => handleSymptomSelect(symptom)}
              disabled={loading}
            >
              <Text style={styles.symptomText}>{symptom.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your symptoms..."
          placeholderTextColor="#999"
          value={symptomText}
          onChangeText={setSymptomText}
          multiline
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={handleTextSubmit} 
          style={styles.submitButton}
          disabled={loading || !symptomText.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#0097B2" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>✓</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      {loading && (
        <Modal transparent={true} animationType="fade" visible={loading}>
          <View style={styles.loadingModal}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0097B2" />
              <Text style={styles.loadingText}>Analyzing symptoms...</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Results Modal */}
      <Modal
        visible={showResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.resultsModal}>
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Medical Advice</Text>
              <TouchableOpacity onPress={() => {
                setShowResults(false);
                setApiResponse(null);
                setSymptomText('');
                setSelectedSymptom(null);
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {apiResponse && (
              <ScrollView style={styles.resultsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.symptomCard}>
                  <Text style={styles.symptomLabel}>Symptom:</Text>
                  <Text style={styles.symptomValue}>{selectedSymptom || apiResponse.symptom_detected}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}>
                      <Text style={styles.sectionIconText}>💡</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Possible Cause</Text>
                  </View>
                  <Text style={styles.listText}>{apiResponse.possible_cause || 'Various possible causes'}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}>
                      <Text style={styles.sectionIconText}>⚠️</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Precautionary Measures</Text>
                  </View>
                  {apiResponse.precautions && Array.isArray(apiResponse.precautions) ? (
                    apiResponse.precautions.map((item, index) => (
                      <View key={index} style={styles.listItem}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.listText}>{apiResponse.precautions || 'Follow general first aid guidelines'}</Text>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}>
                      <Text style={styles.sectionIconText}>🏠</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Home Treatment</Text>
                  </View>
                  {apiResponse.home_treatment && Array.isArray(apiResponse.home_treatment) ? (
                    apiResponse.home_treatment.map((item, index) => (
                      <View key={index} style={styles.listItem}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.listText}>{apiResponse.home_treatment || 'Apply appropriate first aid measures'}</Text>
                  )}
                </View>

                <View style={[styles.sectionCard, styles.urgentCard]}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, styles.urgentIcon]}>
                      <Text style={styles.sectionIconText}>🏥</Text>
                    </View>
                    <Text style={[styles.sectionTitle, styles.urgentTitle]}>When to Seek Doctor</Text>
                  </View>
                  {apiResponse.seek_doctor_if && Array.isArray(apiResponse.seek_doctor_if) ? (
                    apiResponse.seek_doctor_if.map((item, index) => (
                      <View key={index} style={styles.listItem}>
                        <View style={styles.bulletPoint} />
                        <Text style={styles.urgentText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.urgentText}>
                      {apiResponse.seek_doctor_if || 'Seek immediate medical attention if symptoms worsen or persist.'}
                    </Text>
                  )}
                </View>

                <View style={styles.disclaimerCard}>
                  <Text style={styles.disclaimerText}>
                    ⚠️ This is general medical advice. Always consult a healthcare professional for proper diagnosis and treatment.
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => {
                setShowResults(false);
                setApiResponse(null);
                setSymptomText('');
                setSelectedSymptom(null);
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
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
    color: '#0097B2',
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  symptomButton: {
    width: '31%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  symptomText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingRight: 10,
    maxHeight: 120,
  },
  submitButton: {
    padding: 8,
  },
  submitButtonText: {
    fontSize: 20,
    color: '#0097B2',
    fontWeight: 'bold',
  },
  loadingModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#0097B2',
    fontWeight: '500',
  },
  resultsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
    paddingBottom: 30,
    marginTop: 50,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
    fontWeight: 'bold',
  },
  resultsContent: {
    padding: 20,
  },
  symptomCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  symptomLabel: {
    fontSize: 12,
    color: '#0097B2',
    fontWeight: '600',
    marginBottom: 5,
  },
  symptomValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  sectionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0097B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionIconText: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0097B2',
    marginTop: 6,
    marginRight: 10,
  },
  listText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    lineHeight: 20,
  },
  urgentCard: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF8800',
  },
  urgentIcon: {
    backgroundColor: '#FF8800',
  },
  urgentTitle: {
    color: '#FF8800',
  },
  urgentText: {
    fontSize: 14,
    color: '#FF8800',
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  disclaimerCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  doneButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
