import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SERVER_URL } from '../config/serverConfig';

const { width, height } = Dimensions.get('window');

export default function ARFirstAidScreen({ onBack, injuryType }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStep, setCurrentStep] = useState(0);
  const [showMarker, setShowMarker] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [detectedWounds, setDetectedWounds] = useState([]); // Array of {x, y, width, height, confidence}
  const [isDetecting, setIsDetecting] = useState(false);
  const cameraRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  // Animation values for AR markers
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  
  // Wound detection animation
  const woundPulseAnims = useRef({}).current;
  
  // Center position for AR markers (middle of screen)
  const markerPosition = {
    x: width / 2 - 50,
    y: height / 2 - 50,
  };

  // Step-by-step instructions for different injury types
  const getInstructions = () => {
    const instructions = {
      'Burns': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the area where the burn occurred. Make sure the affected area is clearly visible in the frame.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Cool the Burn',
          instruction: 'Immediately run cool (not cold) water over the burn for 10-15 minutes. Do not use ice as it can cause further damage. Keep the burn under running water.',
          action: 'Cool the burn, then tap "I\'ve Done This"',
          icon: '💧'
        },
        {
          step: 3,
          title: 'Remove Constrictive Items',
          instruction: 'Gently remove any jewelry or tight clothing near the burn before it swells. Do not remove anything stuck to the burn.',
          action: 'Remove items, then tap "I\'ve Done This"',
          icon: '👕'
        },
        {
          step: 4,
          title: 'Apply Ointment',
          instruction: 'After cooling, apply a thin layer of burn ointment or aloe vera gel to the affected area. Be very gentle and do not break any blisters.',
          action: 'Apply ointment, then tap "I\'ve Done This"',
          icon: '🧴'
        },
        {
          step: 5,
          title: 'Apply Bandage',
          instruction: 'Cover the burn with a sterile, non-stick bandage. Make sure it\'s loose and not too tight. Do not wrap tightly.',
          action: 'Apply bandage, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 6,
          title: 'Monitor',
          instruction: 'Monitor the burn for signs of infection: increased redness, swelling, pus, or fever. If the burn is severe, covers a large area, or shows signs of infection, seek medical attention immediately.',
          action: 'Continue monitoring',
          icon: '👁️'
        }
      ],
      'Bleeding': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the bleeding area. Make sure the wound is clearly visible in the center of the frame.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Apply Direct Pressure',
          instruction: 'Apply firm, direct pressure to the wound using a clean cloth, gauze, or your hand. Keep constant pressure for at least 5-10 minutes. Do not remove to check.',
          action: 'Apply pressure, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 3,
          title: 'Elevate the Area',
          instruction: 'If possible, elevate the injured area above the heart level to help reduce blood flow and bleeding. Keep pressure applied while elevating.',
          action: 'Elevate the area, then tap "I\'ve Done This"',
          icon: '⬆️'
        },
        {
          step: 4,
          title: 'Add More Layers if Needed',
          instruction: 'If blood soaks through, add more layers of cloth or gauze on top. Do not remove the original dressing. Continue applying pressure.',
          action: 'Add layers if needed, then tap "I\'ve Done This"',
          icon: '📦'
        },
        {
          step: 5,
          title: 'Clean and Dress',
          instruction: 'Once bleeding stops completely, gently clean around (not inside) the wound with clean water. Apply a sterile dressing and bandage.',
          action: 'Clean and dress the wound, then tap "I\'ve Done This"',
          icon: '💧'
        },
        {
          step: 6,
          title: 'Seek Medical Help if Needed',
          instruction: 'If bleeding doesn\'t stop after 10-15 minutes, the wound is deep, or you suspect internal bleeding, seek immediate medical attention.',
          action: 'Continue monitoring',
          icon: '🏥'
        }
      ],
      'Sprain': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the sprained area. Make sure the joint is clearly visible in the frame.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Rest the Area',
          instruction: 'Stop any activity immediately. Do not put weight on the injured area. Use crutches if needed for leg/ankle sprains.',
          action: 'Rest the area, then tap "I\'ve Done This"',
          icon: '🛌'
        },
        {
          step: 3,
          title: 'Apply Ice',
          instruction: 'Apply an ice pack wrapped in a cloth to the sprained area for 15-20 minutes every 2-3 hours. Do not apply ice directly to skin.',
          action: 'Apply ice, then tap "I\'ve Done This"',
          icon: '🧊'
        },
        {
          step: 4,
          title: 'Compress',
          instruction: 'Wrap the area with an elastic bandage or compression wrap. Start below the injury and wrap upward. Make it snug but not too tight.',
          action: 'Compress the area, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 5,
          title: 'Elevate',
          instruction: 'Elevate the injured area above heart level, especially when resting. This helps reduce swelling.',
          action: 'Elevate the area, then tap "I\'ve Done This"',
          icon: '⬆️'
        },
        {
          step: 6,
          title: 'Monitor and Seek Help',
          instruction: 'If pain is severe, you cannot bear weight, or there\'s significant swelling or deformity, seek medical attention. Otherwise, continue RICE treatment.',
          action: 'Continue monitoring',
          icon: '👁️'
        }
      ],
      'Cuts': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the cut. Make sure the wound is clearly visible in the center of the frame.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Stop Bleeding',
          instruction: 'Apply firm, direct pressure with a clean cloth or sterile gauze. Hold for 5-10 minutes until bleeding stops. Do not remove the cloth to check.',
          action: 'Apply pressure, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 3,
          title: 'Clean the Wound',
          instruction: 'Once bleeding stops, gently rinse the cut with clean running water. Remove any visible debris with clean tweezers if needed.',
          action: 'Clean the wound, then tap "I\'ve Done This"',
          icon: '💧'
        },
        {
          step: 4,
          title: 'Apply Antiseptic',
          instruction: 'Apply an antiseptic solution (like hydrogen peroxide or iodine) or antibiotic ointment to prevent infection. Be gentle.',
          action: 'Apply antiseptic, then tap "I\'ve Done This"',
          icon: '🧴'
        },
        {
          step: 5,
          title: 'Cover the Wound',
          instruction: 'Cover the cut with a sterile adhesive bandage or dressing. Change daily or if it becomes wet or dirty.',
          action: 'Cover the wound, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 6,
          title: 'Monitor',
          instruction: 'Watch for signs of infection: redness, swelling, pus, or increased pain. Seek medical help if the cut is deep, won\'t stop bleeding, or shows signs of infection.',
          action: 'Continue monitoring',
          icon: '👁️'
        }
      ],
      'Allergic Reaction': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the affected area. Make sure any visible reaction (rash, swelling) is clearly visible.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Assess Severity',
          instruction: 'Check for severe symptoms: difficulty breathing, swelling of face/throat, rapid pulse, or dizziness. If present, call emergency services immediately.',
          action: 'Assess the reaction, then tap "I\'ve Done This"',
          icon: '⚠️'
        },
        {
          step: 3,
          title: 'Remove Allergen',
          instruction: 'If possible, remove the source of the allergic reaction. Wash the affected area with soap and water if it\'s a contact allergen.',
          action: 'Remove allergen, then tap "I\'ve Done This"',
          icon: '🧼'
        },
        {
          step: 4,
          title: 'Apply Cold Compress',
          instruction: 'Apply a cold, damp cloth or ice pack wrapped in a towel to reduce swelling and itching. Apply for 15-20 minutes.',
          action: 'Apply cold compress, then tap "I\'ve Done This"',
          icon: '🧊'
        },
        {
          step: 5,
          title: 'Take Antihistamine',
          instruction: 'If available and not contraindicated, take an over-the-counter antihistamine (like Benadryl) as directed. For severe reactions, use an epinephrine auto-injector if available.',
          action: 'Take medication, then tap "I\'ve Done This"',
          icon: '💊'
        },
        {
          step: 6,
          title: 'Monitor Closely',
          instruction: 'Continue monitoring for worsening symptoms. If symptoms persist or worsen, seek immediate medical attention. Keep the person calm and in a comfortable position.',
          action: 'Continue monitoring',
          icon: '👁️'
        }
      ],
      'Bruises': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the bruised area. Make sure the affected area is clearly visible in the frame.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Apply Ice',
          instruction: 'Apply an ice pack or cold compress wrapped in a cloth to the bruised area immediately. Apply for 15-20 minutes to reduce swelling and pain.',
          action: 'Apply ice, then tap "I\'ve Done This"',
          icon: '🧊'
        },
        {
          step: 3,
          title: 'Elevate the Area',
          instruction: 'If possible, elevate the bruised area above heart level to help reduce swelling and promote healing.',
          action: 'Elevate the area, then tap "I\'ve Done This"',
          icon: '⬆️'
        },
        {
          step: 4,
          title: 'Rest the Area',
          instruction: 'Avoid putting pressure or strain on the bruised area. Rest and avoid activities that could cause further injury.',
          action: 'Rest the area, then tap "I\'ve Done This"',
          icon: '🛌'
        },
        {
          step: 5,
          title: 'Apply Warm Compress (After 24-48 hours)',
          instruction: 'After the first 24-48 hours, switch to a warm compress to help improve blood circulation and speed up healing.',
          action: 'Apply warm compress, then tap "I\'ve Done This"',
          icon: '🔥'
        },
        {
          step: 6,
          title: 'Monitor Healing',
          instruction: 'Bruises typically heal in 1-2 weeks. Seek medical attention if the bruise is very large, doesn\'t improve, or is accompanied by severe pain or inability to move the affected area.',
          action: 'Continue monitoring',
          icon: '👁️'
        }
      ],
      'Infection Prevention': [
        {
          step: 1,
          title: 'Position Camera',
          instruction: 'Point your camera at the wound or area that needs protection. Make sure it\'s clearly visible.',
          action: 'Position camera and tap "Next" when ready',
          icon: '📷'
        },
        {
          step: 2,
          title: 'Wash Hands',
          instruction: 'Before touching the wound, thoroughly wash your hands with soap and water for at least 20 seconds. Use hand sanitizer if soap is not available.',
          action: 'Wash hands, then tap "I\'ve Done This"',
          icon: '🧼'
        },
        {
          step: 3,
          title: 'Clean the Wound',
          instruction: 'Gently clean the wound with clean running water. Remove any debris. Use a mild soap around (not inside) the wound if needed.',
          action: 'Clean the wound, then tap "I\'ve Done This"',
          icon: '💧'
        },
        {
          step: 4,
          title: 'Apply Antiseptic',
          instruction: 'Apply an antiseptic solution or antibiotic ointment to the wound to kill bacteria and prevent infection.',
          action: 'Apply antiseptic, then tap "I\'ve Done This"',
          icon: '🧴'
        },
        {
          step: 5,
          title: 'Cover with Sterile Dressing',
          instruction: 'Cover the wound with a sterile, non-stick bandage or dressing. Make sure it\'s secure but not too tight.',
          action: 'Cover the wound, then tap "I\'ve Done This"',
          icon: '🩹'
        },
        {
          step: 6,
          title: 'Change Dressing Regularly',
          instruction: 'Change the dressing daily or whenever it becomes wet or dirty. Keep the wound clean and dry. Watch for signs of infection: redness, swelling, pus, or increased pain.',
          action: 'Continue care',
          icon: '🔄'
        }
      ]
    };

    return instructions[injuryType] || instructions['Burns'];
  };

  // Wound detection function
  const detectWounds = async (imageUri) => {
    if (isDetecting) return;
    
    try {
      setIsDetecting(true);
      
      // Create form data with proper format
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'wound.jpg',
      });
      
      // Send to server for wound detection with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(`${SERVER_URL}/detect-wound`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.detections && result.detections.length > 0) {
          // Convert bounding boxes to screen coordinates
          const screenWounds = result.detections.map(detection => ({
            x: (detection.x / detection.imageWidth) * width,
            y: (detection.y / detection.imageHeight) * height,
            width: (detection.width / detection.imageWidth) * width,
            height: (detection.height / detection.imageHeight) * height,
            confidence: detection.confidence,
            id: detection.id || Math.random().toString(),
          }));
          
          setDetectedWounds(screenWounds);
          
          // Initialize animations for new wounds
          screenWounds.forEach(wound => {
            if (!woundPulseAnims[wound.id]) {
              woundPulseAnims[wound.id] = new Animated.Value(1);
            }
          });
        } else {
          setDetectedWounds([]);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn('Wound detection timeout - server not responding');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Wound detection error:', error);
      // Fallback: Use center position if detection fails or server unavailable
      if (currentStep > 0 && showMarker) {
        setDetectedWounds([{
          x: width / 2 - 50,
          y: height / 2 - 50,
          width: 100,
          height: 100,
          confidence: 0.5,
          id: 'fallback',
        }]);
      } else {
        setDetectedWounds([]);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Capture frame and detect wounds
  const captureAndDetect = async () => {
    if (!cameraReady || isDetecting) return;
    
    try {
      // Note: CameraView doesn't support takePictureAsync directly
      // For now, use fallback markers at center position
      // In production, you would need to use a different camera library or API
      if (currentStep > 0 && showMarker) {
        // Use fallback position (center of screen)
        setDetectedWounds([{
          x: width / 2 - 50,
          y: height / 2 - 50,
          width: 100,
          height: 100,
          confidence: 0.5,
          id: 'fallback',
        }]);
      }
    } catch (error) {
      console.error('Frame capture error:', error);
      // If capture fails, use fallback position
      if (currentStep > 0 && showMarker) {
        setDetectedWounds([{
          x: width / 2 - 50,
          y: height / 2 - 50,
          width: 100,
          height: 100,
          confidence: 0.5,
          id: 'fallback',
        }]);
      }
    }
  };

  useEffect(() => {
    const initializeCamera = async () => {
      if (!permission) {
        // Still loading
        return;
      }
      
      if (!permission.granted) {
        const result = await requestPermission();
        if (result.granted) {
          // Set camera ready immediately when permission granted
          setTimeout(() => setCameraReady(true), 100);
        } else {
          Alert.alert(
            'Camera Permission Required',
            'Camera access is needed for AR First Aid guidance. Please enable camera permission in device settings.',
            [
              { text: 'Go Back', onPress: onBack },
              { text: 'Try Again', onPress: () => requestPermission() }
            ]
          );
        }
      } else {
        // Permission already granted, set camera ready
        setTimeout(() => setCameraReady(true), 100);
      }
    };
    
    initializeCamera();
  }, [permission]);

  // Show fallback markers when camera is ready and step > 0 (wound detection disabled)
  useEffect(() => {
    if (cameraReady && currentStep > 0 && showMarker) {
      // Use fallback markers (no server call needed)
      setDetectedWounds([{
        x: width / 2 - 50,
        y: height / 2 - 50,
        width: 100,
        height: 100,
        confidence: 0.5,
        id: 'fallback',
      }]);
    } else {
      setDetectedWounds([]);
    }
  }, [cameraReady, currentStep, showMarker]);

  // AR Marker Animations
  useEffect(() => {
    // Pulse animation for target circle
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation animation for arrows
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Arrow bounce animation
    const arrowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 10,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    rotateAnimation.start();
    arrowAnimation.start();

    // Animate detected wounds
    Object.keys(woundPulseAnims).forEach(woundId => {
      const anim = woundPulseAnims[woundId];
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
      arrowAnimation.stop();
      Object.values(woundPulseAnims).forEach(anim => {
        anim.stopAnimation();
      });
    };
  }, [currentStep, detectedWounds]);

  const instructions = getInstructions();
  const currentInstruction = instructions[currentStep];

  // Show markers based on step
  useEffect(() => {
    // Show markers for steps that need visual guidance (step 1 and action steps)
    if (currentStep === 0 || (currentStep > 0 && currentStep < instructions.length - 1)) {
      setShowMarker(true);
    } else {
      setShowMarker(false);
    }
  }, [currentStep, instructions.length]);

  const handleNext = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert('Complete', 'You have completed all first aid steps. Continue monitoring the injury and seek medical help if needed.', [
        { text: 'OK', onPress: onBack }
      ]);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>Please grant camera permission to use AR First Aid</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]} onPress={onBack}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera View - No children allowed */}
      {permission?.granted ? (
        <>
          <CameraView 
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            enableTorch={false}
            onCameraReady={() => {
              console.log('Camera is ready');
              setCameraReady(true);
            }}
            onMountError={(error) => {
              console.error('Camera mount error:', error);
              Alert.alert('Camera Error', 'Failed to start camera. Please try again.');
            }}
          />
          
          {/* Camera Toggle Button */}
          <TouchableOpacity 
            style={styles.cameraToggle}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Text style={styles.cameraToggleText}>🔄</Text>
            <Text style={styles.cameraToggleLabel}>
              {facing === 'back' ? 'Front' : 'Back'}
            </Text>
          </TouchableOpacity>
          
          {/* Overlay with Instructions - Positioned absolutely */}
          <View style={styles.overlay} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.injuryType}>{injuryType}</Text>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>Step {currentStep + 1}/{instructions.length}</Text>
              </View>
            </View>

            {/* True AR: Detected Wound Overlays */}
            {detectedWounds.length > 0 && currentStep > 0 && (
              <>
                {detectedWounds.map((wound, index) => {
                  const anim = woundPulseAnims[wound.id] || pulseAnim;
                  return (
                    <Animated.View
                      key={wound.id || index}
                      style={[
                        styles.woundOverlay,
                        {
                          left: wound.x,
                          top: wound.y,
                          width: wound.width,
                          height: wound.height,
                          transform: [{ scale: anim }],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      {/* 3D-style wound marker */}
                      <View style={styles.woundMarker3D}>
                        {/* Outer ring */}
                        <Animated.View
                          style={[
                            styles.woundRing,
                            {
                              transform: [{ scale: pulseAnim }],
                              opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.3],
                                outputRange: [0.8, 0.3],
                              }),
                            },
                          ]}
                        />
                        {/* Inner circle */}
                        <View style={styles.woundCircle} />
                        {/* Center dot */}
                        <View style={styles.woundCenter} />
                        {/* 3D depth effect */}
                        <View style={styles.woundDepth} />
                      </View>
                      
                      {/* Confidence label */}
                      <View style={styles.confidenceLabel}>
                        <Text style={styles.confidenceText}>
                          {Math.round(wound.confidence * 100)}%
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </>
            )}

            {/* Fallback AR Visual Markers (if no detection) */}
            {showMarker && currentStep > 0 && detectedWounds.length === 0 && (
              <View style={styles.arMarkerContainer} pointerEvents="none">
                {/* Target Circle - Pulsing */}
                <Animated.View
                  style={[
                    styles.targetCircle,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.3],
                        outputRange: [0.6, 0.3],
                      }),
                    },
                  ]}
                />
                
                {/* Inner Target Circle */}
                <View style={styles.innerTargetCircle} />
                
                {/* Directional Arrows - Rotating */}
                <Animated.View
                  style={[
                    styles.arrowContainer,
                    {
                      transform: [
                        {
                          rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.arrow, styles.arrowTop]}>
                    <View style={styles.arrowHead} />
                  </View>
                  <View style={[styles.arrow, styles.arrowRight]}>
                    <View style={styles.arrowHead} />
                  </View>
                  <View style={[styles.arrow, styles.arrowBottom]}>
                    <View style={styles.arrowHead} />
                  </View>
                  <View style={[styles.arrow, styles.arrowLeft]}>
                    <View style={styles.arrowHead} />
                  </View>
                </Animated.View>

                {/* Bouncing Arrow Indicator */}
                <Animated.View
                  style={[
                    styles.bounceArrow,
                    {
                      transform: [
                        {
                          translateY: arrowAnim,
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.bounceArrowText}>↓</Text>
                </Animated.View>

                {/* Object Detection Hint */}
                <View style={styles.detectionHint}>
                  <View style={styles.detectionDot} />
                  <Text style={styles.detectionText}>Scanning for wound...</Text>
                </View>
              </View>
            )}

            {/* Instruction Card - Positioned at bottom */}
            <View style={styles.instructionCardContainer}>
              <View style={styles.instructionCard}>
                {/* Step Icon */}
                {currentInstruction.icon && (
                  <View style={styles.iconContainer}>
                    <Text style={styles.stepIcon}>{currentInstruction.icon}</Text>
                  </View>
                )}
                <Text style={styles.stepTitle}>{currentInstruction.title}</Text>
                <Text style={styles.instructionText}>{currentInstruction.instruction}</Text>
                <View style={styles.actionBox}>
                  <Text style={styles.actionText}>{currentInstruction.action}</Text>
                </View>
              </View>

              {/* Bottom Action Button */}
              <View style={styles.bottomBar}>
                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={handleNext}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === 0 ? 'Next' : currentStep === instructions.length - 1 ? 'Complete' : "I've Done This"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.placeholderText}>Camera not available</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Request Camera Permission</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  injuryType: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    backgroundColor: 'rgba(0, 151, 178, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  instructionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: height * 0.35, // Limit height to not cover too much
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0097B2',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 15,
  },
  actionBox: {
    backgroundColor: '#E0F7FA',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0097B2',
  },
  actionText: {
    fontSize: 14,
    color: '#0097B2',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  bottomBar: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  nextButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  errorSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#0097B2',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 50,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
  },
  // AR Marker Styles
  arMarkerContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  targetCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF4444',
    borderStyle: 'dashed',
  },
  innerTargetCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  arrowContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    width: 30,
    height: 2,
    backgroundColor: '#0097B2',
  },
  arrowTop: {
    top: 0,
    left: 45,
  },
  arrowRight: {
    right: 0,
    top: 59,
    transform: [{ rotate: '90deg' }],
  },
  arrowBottom: {
    bottom: 0,
    left: 45,
    transform: [{ rotate: '180deg' }],
  },
  arrowLeft: {
    left: 0,
    top: 59,
    transform: [{ rotate: '270deg' }],
  },
  arrowHead: {
    position: 'absolute',
    right: -5,
    top: -3,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0097B2',
  },
  bounceArrow: {
    position: 'absolute',
    top: 110,
    alignItems: 'center',
  },
  bounceArrowText: {
    fontSize: 30,
    color: '#0097B2',
    fontWeight: 'bold',
  },
  detectionHint: {
    position: 'absolute',
    top: 150,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 151, 178, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  detectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 90,
    right: 20,
    backgroundColor: 'rgba(0, 151, 178, 0.9)',
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cameraToggleText: {
    fontSize: 20,
  },
  cameraToggleLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    backgroundColor: '#E0F7FA',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#0097B2',
  },
  stepIcon: {
    fontSize: 40,
    textAlign: 'center',
  },
  // True AR Wound Overlay Styles
  woundOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  woundMarker3D: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  woundRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FF4444',
    borderStyle: 'dashed',
  },
  woundCircle: {
    width: '70%',
    height: '70%',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF6666',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  woundCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  woundDepth: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    shadowColor: '#FF0000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  confidenceLabel: {
    position: 'absolute',
    top: -25,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

