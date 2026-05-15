import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SERVER_URL, API_ENDPOINTS } from '../config/serverConfig';

// Load labels from text file
export const loadLabels = async () => {
  try {
    // Labels array - directly from labels.txt
    const labels = [
        "Acne and Rosacea",
        "Actinic Keratosis / Basal Cell Carcinoma / Malignant Lesions",
        "Atopic Dermatitis",
        "Bullous Diseases",
        "Cellulitis / Impetigo / Bacterial Infections",
        "Eczema",
        "Exanthems / Drug Eruptions",
        "Hair Loss / Alopecia / Hair Disorders",
        "Herpes / HPV / Other STDs",
        "Pigmentation Disorders",
        "Lupus / Connective Tissue Diseases",
        "Melanoma / Skin Cancer / Nevi / Moles",
        "Nail Fungus / Nail Diseases",
        "Poison Ivy / Contact Dermatitis",
        "Psoriasis / Lichen Planus / Related Disorders",
        "Scabies / Lyme / Other Infestations",
        "Seborrheic Keratoses / Benign Tumors",
        "Systemic Diseases",
        "Tinea / Ringworm / Candidiasis / Fungal Infections",
        "Urticaria / Hives",
        "Vascular Tumors",
        "Vasculitis",
        "Warts / Molluscum / Viral Infections"
      ];
      
    
    return labels;
  } catch (error) {
    console.error('Error loading labels:', error);
    return [];
  }
};

// Check server health
export const checkServerHealth = async () => {
  try {
    console.log(`Checking server health at: ${SERVER_URL}${API_ENDPOINTS.HEALTH}`);
    const response = await fetch(`${SERVER_URL}${API_ENDPOINTS.HEALTH}`, {
      method: 'GET',
      timeout: 5000, // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server health check successful:', data);
    return data;
  } catch (error) {
    console.error('Server health check failed:', error);
    console.error('Server URL:', SERVER_URL);
    console.error('Error details:', error.message);
    return { 
      status: 'unhealthy', 
      error: error.message,
      serverUrl: SERVER_URL,
      suggestion: 'Make sure the FastAPI server is running on port 8000'
    };
  }
};

// Preprocess image for server upload
export const preprocessImage = async (imageUri, inputSize = 224) => {
  try {
    // Resize image to model input size
    const manipulated = await manipulateAsync(
      imageUri,
      [{ resize: { width: inputSize, height: inputSize } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );
    
    return {
      uri: manipulated.uri,
      width: inputSize,
      height: inputSize,
    };
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
};

// Run inference on server
export const runInference = async (preprocessedImage) => {
  try {
    console.log(`Sending prediction request to: ${SERVER_URL}${API_ENDPOINTS.PREDICT}`);
    
    // Create FormData for file upload
    const formData = new FormData();
    
    // Get image file name from URI
    const uriParts = preprocessedImage.uri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // Add file to FormData (React Native format)
    formData.append('file', {
      uri: preprocessedImage.uri,
      type: 'image/jpeg',
      name: fileName || 'image.jpg',
    });
    
    // Send request to server
    // Note: Don't set Content-Type header - fetch will set it automatically with boundary
    const response = await fetch(`${SERVER_URL}${API_ENDPOINTS.PREDICT}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Server error' }));
      const errorMessage = errorData.detail || `Server error: ${response.status}`;
      console.error('Server response error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Prediction successful:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Prediction failed');
    }
    
    // Return full server response for getTopPredictions to process
    return result;
  } catch (error) {
    console.error('Error running inference:', error);
    console.error('Server URL:', SERVER_URL);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    // Provide helpful error message
    if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
      throw new Error(
        `Cannot connect to server at ${SERVER_URL}. ` +
        `Please make sure:\n` +
        `1. FastAPI server is running (cd server && uvicorn main:app --reload --port 8000)\n` +
        `2. Server URL is correct for your platform\n` +
        `3. Firewall is not blocking port 8000`
      );
    }
    
    throw error;
  }
};

// Get top predictions from server response
export const getTopPredictions = (serverResponse, labels, topK = 3) => {
  try {
    if (!serverResponse || !serverResponse.predictions) {
      return [];
    }
    
    // Server already returns top predictions
    return serverResponse.predictions.map((pred) => ({
      label: pred.label,
      score: pred.confidence,
      confidence: pred.confidence_percent || `${(pred.confidence * 100).toFixed(2)}%`,
    }));
  } catch (error) {
    console.error('Error parsing predictions:', error);
    return [];
  }
};

// Load model (not needed for server-based approach, but kept for compatibility)
export const loadModel = async () => {
  // For server-based approach, model is loaded on server
  // This function is kept for compatibility
  return {
    serverBased: true,
    serverUrl: SERVER_URL,
  };
};
