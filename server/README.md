# DokTap Disease Detection Server

FastAPI server for skin disease detection using TFLite model.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Place your model files in `server/models/`:
   - `skin_disease_model.tflite`
   - `labels.txt`

3. Run the server:
```bash
python main.py
```

Or using uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /` - Server info
- `GET /health` - Health check
- `POST /predict` - Upload image and get predictions

## Usage

Send POST request to `/predict` with image file:
```bash
curl -X POST "http://localhost:8000/predict" -F "file=@image.jpg"
```

## React Native Integration

Update your React Native app to send images to:
```
http://YOUR_SERVER_IP:8000/predict
```


