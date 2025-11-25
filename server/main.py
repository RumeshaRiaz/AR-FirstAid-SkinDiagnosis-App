from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import uvicorn
import os

# Try to import TensorFlow Lite
TFLITE_AVAILABLE = False
Interpreter = None

try:
    # First try: Standard TensorFlow with TFLite
    import tensorflow as tf
    if hasattr(tf, 'lite') and hasattr(tf.lite, 'Interpreter'):
        Interpreter = tf.lite.Interpreter
        TFLITE_AVAILABLE = True
        print("Using TensorFlow Lite from tensorflow package")
    else:
        raise AttributeError("tf.lite.Interpreter not found")
except (ImportError, AttributeError):
    try:
        # Second try: tflite-runtime (lighter package)
        import tflite_runtime.interpreter as tflite
        Interpreter = tflite.Interpreter
        TFLITE_AVAILABLE = True
        print("Using TensorFlow Lite from tflite-runtime package")
    except ImportError:
        TFLITE_AVAILABLE = False
        print("WARNING: TensorFlow Lite not available!")
        print("Please install one of the following:")
        print("  1. pip install tensorflow>=2.13.0")
        print("  2. pip install tflite-runtime")
        print("Falling back to mock predictions.")

app = FastAPI(title="DokTap Disease Detection API")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React Native app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load TFLite model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "skin_disease_model.tflite")
LABELS_PATH = os.path.join(os.path.dirname(__file__), "models", "labels.txt")

# Load labels
def load_labels():
    try:
        with open(LABELS_PATH, 'r', encoding='utf-8') as f:
            labels = [line.strip() for line in f.readlines() if line.strip()]
        return labels
    except Exception as e:
        print(f"Error loading labels: {e}")
        # Fallback labels
        return [
            'Acne and Rosacea Photos',
            'Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions',
            'Atopic Dermatitis Photos',
            'Bullous Disease Photos',
            'Cellulitis Impetigo and other Bacterial Infections',
            'Eczema Photos',
            'Exanthems and Drug Eruptions',
            'Hair Loss Photos Alopecia and other Hair Disease',
            'Herpes HPV and other STDs Photos',
            'Light Diseases and Disorders of Pigmentation',
            'Lupus and other Connective Tissue diseases',
            'Melanoma Skin Cancer Nevi and Moles',
            'Nail Fungus and other Nail Disease',
            'Poison Ivy Photos and other Contact Dermatitis',
            'Psoriasis Lichen Planus and related diseases',
            'Scabies Lyme Disease and other Infestations',
            'Seborrheic Keratoses and other Benign Tumors',
            'Systemic Disease',
            'Tinea Ringworm Candidiasis and other Fungal Infections',
            'Urticaria Hives',
            'Vascular Tumors',
            'Vasculitis Photos',
            'Warts Molluscum and other Viral Infections',
        ]

# Load TFLite model
def load_model():
    try:
        if not TFLITE_AVAILABLE or Interpreter is None:
            print("TensorFlow Lite not available - cannot load model")
            return None
            
        # Check if model file exists
        if not os.path.exists(MODEL_PATH):
            print(f"Model file not found at: {MODEL_PATH}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"Looking for model at: {os.path.abspath(MODEL_PATH)}")
            return None
            
        print(f"Loading model from: {MODEL_PATH}")
        interpreter = Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        print(f"Model loaded successfully!")
        
        # Print model input/output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        print(f"Input shape: {input_details[0]['shape']}")
        print(f"Output shape: {output_details[0]['shape']}")
        
        return interpreter
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return None

# Initialize
labels = load_labels()
model = load_model()

if model is None:
    print("Warning: Model not loaded. Predictions will be mock data.")

# Preprocess image for model
def preprocess_image(image_bytes, target_size=224):
    try:
        # Load image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize to target size
        image = image.resize((target_size, target_size))
        
        # Convert to numpy array and normalize to [0, 1]
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # Add batch dimension: (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

# Run inference
def run_inference(interpreter, preprocessed_image):
    try:
        # Get input and output tensors
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        # Set input tensor
        interpreter.set_tensor(input_details[0]['index'], preprocessed_image)
        
        # Run inference
        interpreter.invoke()
        
        # Get output
        output_data = interpreter.get_tensor(output_details[0]['index'])
        
        # Convert to probabilities (if not already)
        predictions = output_data[0]
        
        # Apply softmax if needed (some models output logits)
        if np.sum(predictions) > 1.1:  # If not normalized, apply softmax
            exp_predictions = np.exp(predictions - np.max(predictions))
            predictions = exp_predictions / np.sum(exp_predictions)
        
        return predictions
    except Exception as e:
        print(f"Error running inference: {e}")
        raise HTTPException(status_code=500, detail=f"Error running inference: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "DokTap Disease Detection API",
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "labels_count": len(labels)
    }

@app.post("/predict")
async def predict_disease(file: UploadFile = File(...)):
    try:
        # Read image file
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Preprocess image
        preprocessed_image = preprocess_image(image_bytes)
        
        # Run inference
        if model is None:
            # Return mock predictions if model not loaded
            mock_predictions = np.random.rand(len(labels))
            mock_predictions = mock_predictions / np.sum(mock_predictions)
            predictions = mock_predictions
        else:
            predictions = run_inference(model, preprocessed_image)
        
        # Get top 3 predictions
        top_indices = np.argsort(predictions)[::-1][:3]
        
        results = []
        for idx in top_indices:
            results.append({
                "label": labels[idx] if idx < len(labels) else f"Class {idx}",
                "confidence": float(predictions[idx]),
                "confidence_percent": f"{(predictions[idx] * 100):.2f}%"
            })
        
        return JSONResponse(content={
            "success": True,
            "predictions": results,
            "all_predictions": [float(p) for p in predictions]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/detect-wound")
async def detect_wound(file: UploadFile = File(...)):
    """
    Detect wounds/injuries in the image and return bounding boxes
    This is a mock implementation - replace with actual wound detection model
    """
    try:
        # Read image file
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Load image to get dimensions
        image = Image.open(io.BytesIO(image_bytes))
        image_width, image_height = image.size
        
        # Mock wound detection - in production, use actual object detection model (YOLO, etc.)
        # For now, return a detection in the center area (simulating wound detection)
        detections = []
        
        # Simulate detecting 1-2 wounds in the image
        import random
        num_wounds = random.randint(1, 2)
        
        for i in range(num_wounds):
            # Random position in center area (where wounds are likely)
            center_x = image_width / 2 + random.uniform(-image_width/4, image_width/4)
            center_y = image_height / 2 + random.uniform(-image_height/4, image_height/4)
            
            # Random size (wound size)
            wound_width = random.uniform(image_width * 0.1, image_width * 0.3)
            wound_height = random.uniform(image_height * 0.1, image_height * 0.3)
            
            # Bounding box coordinates
            x = max(0, center_x - wound_width / 2)
            y = max(0, center_y - wound_height / 2)
            width = min(image_width - x, wound_width)
            height = min(image_height - y, wound_height)
            
            # Confidence score
            confidence = random.uniform(0.6, 0.95)
            
            detections.append({
                "id": f"wound_{i}",
                "x": float(x),
                "y": float(y),
                "width": float(width),
                "height": float(height),
                "confidence": float(confidence),
                "imageWidth": image_width,
                "imageHeight": image_height
            })
        
        return JSONResponse(content={
            "success": True,
            "detections": detections,
            "count": len(detections)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in wound detection: {e}")
        import traceback
        traceback.print_exc()
        # Return empty detections on error
        return JSONResponse(content={
            "success": False,
            "detections": [],
            "count": 0,
            "error": str(e)
        })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

