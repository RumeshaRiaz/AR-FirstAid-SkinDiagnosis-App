import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { loadLabels, checkServerHealth, preprocessImage, runInference, getTopPredictions } from '../utils/modelLoader';

export default function ScanForDiseaseScreen({ onBack }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  // Initialize Server Connection
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('Initializing server connection...');
        
        // Load labels
        const loadedLabels = await loadLabels();
        setLabels(loadedLabels);
        console.log('Labels loaded:', loadedLabels.length);
        
        // Check server health
        const health = await checkServerHealth();
        if (health.status === 'healthy' && health.model_loaded) {
          setModel({ serverBased: true });
          console.log('Server is ready and model is loaded');
        } else {
          console.warn('Server not ready or model not loaded:', health);
          Alert.alert(
            'Server Warning',
            'Server is not ready or model is not loaded. Predictions may not work correctly.',
            [{ text: 'OK' }]
          );
        }
        
        setModelLoading(false);
      } catch (error) {
        console.error('Error initializing server:', error);
        Alert.alert(
          'Server Connection Error',
          'Failed to connect to prediction server. Please ensure the server is running.',
          [{ text: 'OK' }]
        );
        setModelLoading(false);
      }
    };
    
    initializeModel();
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

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos!');
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleUploadFromGallery = async () => {
    try {
      const hasPermission = await requestImagePermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSelectFromDevice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        await processImage(fileUri);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const processImage = async (imageUri) => {
    try {
      setLoading(true);
      setSelectedImage(imageUri);
      setPredictions(null);
      setShowResults(false);

      // Preprocess image (resize for server)
      const preprocessed = await preprocessImage(imageUri);
      
      // Run inference on server
      const serverResponse = await runInference(preprocessed);
      console.log('Server response received:', serverResponse);
      
      // Get top predictions from server response
      const topPredictions = getTopPredictions(serverResponse, labels, 3);
      console.log('Top predictions processed:', topPredictions);
      
      if (topPredictions.length === 0 && serverResponse.all_predictions) {
        // Fallback: use all_predictions if predictions format is different
        const predictionsArray = serverResponse.all_predictions;
        const predictionsWithLabels = predictionsArray.map((score, index) => ({
          label: labels[index] || `Class ${index}`,
          score: score,
          confidence: (score * 100).toFixed(2) + '%',
        }));
        predictionsWithLabels.sort((a, b) => b.score - a.score);
        const finalPredictions = predictionsWithLabels.slice(0, 3);
        console.log('Using fallback predictions:', finalPredictions);
        setPredictions(finalPredictions);
      } else {
        console.log('Setting predictions:', topPredictions);
        setPredictions(topPredictions);
      }
      
      console.log('Showing results modal');
      setShowResults(true);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert(
        'Error',
        `Failed to analyze image: ${error.message || 'Please check server connection and try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPredictions(null);
    setShowResults(false);
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

        <Text style={styles.title}>SCAN FOR DISEASE</Text>
        <Text style={styles.subtitle}>Upload or capture symptoms for instant analysis.</Text>

        {modelLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0097B2" />
            <Text style={styles.loadingText}>Loading AI model...</Text>
          </View>
        )}

        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            {loading && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Analyzing...</Text>
              </View>
            )}
            {!loading && predictions && predictions.length > 0 && (
              <TouchableOpacity 
                style={styles.viewResultsButton} 
                onPress={() => setShowResults(true)}
              >
                <Text style={styles.viewResultsButtonText}>View Results ({predictions.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Choose Different Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadArea}>
            <View style={styles.cameraIconContainer}>
              <View style={styles.cameraIcon}>
                <View style={styles.cameraBody} />
                <View style={styles.cameraLens} />
              </View>
            </View>
            <Text style={styles.uploadText}>Tap to capture or upload image</Text>
          </View>
        )}

        {!selectedImage && (
          <>
            <TouchableOpacity 
              style={styles.takePhotoButton} 
              onPress={handleTakePhoto}
              disabled={modelLoading}
            >
              {modelLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.takePhotoText}>Take Photo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={handleUploadFromGallery}
              disabled={modelLoading}
            >
              {modelLoading ? (
                <ActivityIndicator color="#0097B2" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.selectFileButton} 
              onPress={handleSelectFromDevice}
              disabled={modelLoading}
            >
              {modelLoading ? (
                <ActivityIndicator color="#0097B2" />
              ) : (
                <Text style={styles.selectFileButtonText}>📁 Select from Device</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.disclaimer}>
          AI can identify skin issues like rashes, bruises, burns, infections. Results are for informational purposes only.
        </Text>
      </ScrollView>

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
              <Text style={styles.resultsTitle}>Analysis Results</Text>
              <TouchableOpacity onPress={() => setShowResults(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.resultImage} />
            )}

            {predictions && predictions.length > 0 ? (
              <ScrollView style={styles.predictionsContainer}>
                <Text style={styles.predictionsTitle}>Possible Conditions:</Text>
                {predictions.map((pred, index) => {
                  // Extract numeric value from confidence (handle both string "8.29%" and number 0.0829)
                  const confidenceValue = typeof pred.confidence === 'string' 
                    ? parseFloat(pred.confidence.replace('%', '')) 
                    : (pred.confidence * 100);
                  const confidenceDisplay = typeof pred.confidence === 'string'
                    ? pred.confidence
                    : `${confidenceValue.toFixed(2)}%`;
                  
                  return (
                    <View key={index} style={styles.predictionCard}>
                      <View style={styles.predictionHeader}>
                        <Text style={styles.predictionLabel}>{pred.label}</Text>
                        <Text style={styles.predictionConfidence}>{confidenceDisplay}</Text>
                      </View>
                      <View style={styles.confidenceBar}>
                        <View 
                          style={[
                            styles.confidenceFill, 
                            { width: `${confidenceValue}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.noResultsText}>No predictions available</Text>
            )}

            <View style={styles.resultsFooter}>
              <Text style={styles.resultsDisclaimer}>
                ⚠️ These results are AI-generated and for informational purposes only. Always consult a healthcare professional for proper diagnosis.
              </Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowResults(false);
                  handleReset();
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
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
    color: '#0097B2',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
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
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#0097B2',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E0E0E0',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    minHeight: 250,
    backgroundColor: '#FAFAFA',
  },
  cameraIconContainer: {
    marginBottom: 20,
  },
  cameraIcon: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBody: {
    width: 50,
    height: 38,
    borderRadius: 5,
    borderWidth: 3,
    borderColor: '#0097B2',
    backgroundColor: 'transparent',
  },
  cameraLens: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0097B2',
  },
  uploadText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 15,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  processingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  viewResultsButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  viewResultsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#0097B2',
    fontSize: 16,
    fontWeight: '600',
  },
  takePhotoButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  takePhotoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectFileButton: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#0097B2',
  },
  selectFileButtonText: {
    color: '#0097B2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  // Results Modal Styles
  resultsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    paddingBottom: 20,
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
  resultImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  predictionsContainer: {
    padding: 20,
    maxHeight: 400,
  },
  predictionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  predictionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  predictionConfidence: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0097B2',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#0097B2',
    borderRadius: 3,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 16,
    padding: 20,
  },
  resultsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  resultsDisclaimer: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  doneButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
