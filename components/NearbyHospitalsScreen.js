import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { GOOGLE_PLACES_API_KEY } from '../config/apiConfig';

// Notification handler setup (only if available)
let notificationsAvailable = true;
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.log('Notifications not available in Expo Go:', error);
  notificationsAvailable = false;
}

export default function NearbyHospitalsScreen({ onBack }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [region, setRegion] = useState({
    latitude: 24.8607, // Default to Karachi, Pakistan
    longitude: 67.0011,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    // Location permission
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    // Notification permission (only if available)
    if (notificationsAvailable) {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (error) {
        console.log('Notification permission request failed:', error);
      }
    }
    
    if (locationStatus === 'granted') {
      setLocationEnabled(true);
      getCurrentLocation();
    } else {
      Alert.alert('Permission Required', 'Location permission is required to find nearby hospitals.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to find nearby hospitals.'
        );
        setLoading(false);
        return;
      }

      // Get current location with high accuracy
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
        maximumAge: 10000, // Accept cached location if less than 10 seconds old
        timeout: 15000, // 15 second timeout
      });
      
      const { latitude, longitude, accuracy } = currentLocation.coords;
      
      // Log location for debugging
      console.log('Location fetched:', {
        latitude,
        longitude,
        accuracy: `${accuracy}m`,
        timestamp: new Date(currentLocation.timestamp).toLocaleString(),
      });
      
      // Check if accuracy is reasonable (less than 100 meters)
      if (accuracy && accuracy > 100) {
        Alert.alert(
          'Low Location Accuracy',
          `Location accuracy is ${Math.round(accuracy)}m. For better results, please move to an open area or enable high accuracy GPS.`
        );
      }
      
      setLocation(currentLocation);
      
      // Update map region to show current location
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      
      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
      await fetchNearbyHospitals(latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      let errorMessage = 'Unable to get your location. ';
      
      if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage += 'Please check your GPS settings and try again.';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage += 'Location request timed out. Please try again in an open area.';
      } else {
        errorMessage += 'Please ensure location permissions are granted and GPS is enabled.';
      }
      
      Alert.alert('Location Error', errorMessage);
      setLoading(false);
    }
  };

  const fetchNearbyHospitals = async (latitude, longitude) => {
    try {
      const radius = 5000; // 5km radius
      const type = 'hospital';
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        const hospitalList = data.results.slice(0, 10).map((place, index) => {
          // Calculate distance
          const distance = calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          
          return {
            id: place.place_id || index,
            name: place.name,
            distance: `${distance.toFixed(1)} km away`,
            status: place.opening_hours?.open_now ? 'Open' : 'Closed',
            isOpen: place.opening_hours?.open_now || false,
            address: place.vicinity || place.formatted_address,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            placeId: place.place_id,
            rating: place.rating,
            phoneNumber: place.formatted_phone_number,
          };
        });
        
        setHospitals(hospitalList);
        setLoading(false);
        
        // Show notification if hospitals found
        if (hospitalList.length > 0) {
          await showNotification(hospitalList.length);
        }
      } else if (data.status === 'ZERO_RESULTS') {
        setHospitals([]);
        setLoading(false);
        Alert.alert('No Results', 'No hospitals found nearby.');
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('API Error:', data.status, data.error_message);
        setLoading(false);
        Alert.alert(
          'API Key Error',
          'Your Google Places API key is invalid or not properly configured.\n\nPlease check:\n1. API key is correct in config/apiConfig.js\n2. Places API is enabled in Google Cloud Console\n3. API key restrictions allow Places API\n4. Billing is enabled for your Google Cloud project',
          [{ text: 'OK' }]
        );
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('API Error:', data.status, data.error_message);
        setLoading(false);
        Alert.alert('API Limit Exceeded', 'You have exceeded the API quota. Please check your Google Cloud Console billing and quotas.');
      } else {
        console.error('API Error:', data.status, data.error_message);
        setLoading(false);
        Alert.alert(
          'API Error',
          `${data.error_message || 'Unable to fetch hospitals.'}\n\nStatus: ${data.status}\n\nPlease check your API key configuration.`
        );
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      Alert.alert('Error', 'Unable to fetch nearby hospitals. Please try again.');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const showNotification = async (count) => {
    if (notificationsAvailable) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Nearby Hospitals Found!',
            body: `Found ${count} hospital${count > 1 ? 's' : ''} near your location.`,
            sound: true,
          },
          trigger: null, // Show immediately
        });
      } catch (error) {
        console.log('Notification not available, using Alert instead:', error);
        // Fallback to Alert for Expo Go
        Alert.alert(
          'Nearby Hospitals Found!',
          `Found ${count} hospital${count > 1 ? 's' : ''} near your location.`
        );
      }
    } else {
      // Use Alert as fallback for Expo Go
      Alert.alert(
        'Nearby Hospitals Found!',
        `Found ${count} hospital${count > 1 ? 's' : ''} near your location.`
      );
    }
  };

  const handleEnableGPS = async () => {
    if (!locationEnabled) {
      await requestPermissions();
    } else {
      await getCurrentLocation();
    }
  };

  const handleHospitalClick = (hospital) => {
    Alert.alert(
      hospital.name,
      `Distance: ${hospital.distance}\n${hospital.address ? `Address: ${hospital.address}\n` : ''}${hospital.rating ? `Rating: ${hospital.rating}/5\n` : ''}Status: ${hospital.status}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open in Maps',
          onPress: () => {
            const url = `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`;
            Linking.openURL(url).catch(err => {
              console.error('Error opening maps:', err);
              Alert.alert('Error', 'Unable to open maps.');
            });
          },
        },
        {
          text: 'Get Directions',
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
            Linking.openURL(url).catch(err => {
              console.error('Error opening directions:', err);
              Alert.alert('Error', 'Unable to open directions.');
            });
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

        <Text style={styles.title}>NEARBY HOSPITALS</Text>
        <Text style={styles.subtitle}>Hospitals close to your location</Text>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            region={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            mapType="standard"
            onMapReady={() => {
              if (location && mapRef.current) {
                mapRef.current.animateToRegion(region, 1000);
              }
            }}
          >
            {/* Current Location Marker */}
            {location && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="Your Location"
                pinColor="#0097B2"
              />
            )}
            
            {/* Hospital Markers */}
            {hospitals.map((hospital) => (
              <Marker
                key={hospital.id}
                coordinate={{
                  latitude: hospital.latitude,
                  longitude: hospital.longitude,
                }}
                title={hospital.name}
                description={`${hospital.distance} - ${hospital.status}`}
                pinColor={hospital.isOpen ? "#4CAF50" : "#F44336"}
                onPress={() => handleHospitalClick(hospital)}
              />
            ))}
          </MapView>
          
          <TouchableOpacity 
            style={styles.gpsButton} 
            onPress={handleEnableGPS}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.gpsButtonText}>Enable GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.hospitalList}>
          {hospitals.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hospitals found. Tap "Enable GPS" to search.</Text>
            </View>
          )}
          {hospitals.map((hospital) => (
            <TouchableOpacity 
              key={hospital.id} 
              style={styles.hospitalCard}
              onPress={() => handleHospitalClick(hospital)}
              activeOpacity={0.7}
            >
              <View style={styles.hospitalIcon}>
                <View style={styles.buildingIcon}>
                  <View style={styles.buildingTop} />
                  <View style={styles.buildingBase} />
                  <View style={styles.buildingCross} />
                </View>
              </View>
              <View style={styles.hospitalInfo}>
                <Text style={styles.hospitalName}>{hospital.name}</Text>
                <Text style={styles.hospitalDistance}>{hospital.distance}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, hospital.isOpen ? styles.statusOpen : styles.statusClosed]} />
                  <Text style={styles.statusText}>{hospital.status}</Text>
                </View>
              </View>
              <View style={styles.locationIcon}>
                <View style={styles.pinIcon}>
                  <View style={styles.pinTop} />
                  <View style={styles.pinBase} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 20,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapContainer: {
    marginBottom: 30,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  gpsButton: {
    backgroundColor: '#0097B2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hospitalList: {
    marginTop: 10,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  hospitalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hospitalIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  buildingIcon: {
    width: 30,
    height: 30,
    position: 'relative',
  },
  buildingTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0097B2',
    alignSelf: 'center',
  },
  buildingBase: {
    width: 20,
    height: 18,
    backgroundColor: '#0097B2',
    borderRadius: 2,
    marginTop: -1,
  },
  buildingCross: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#FFFFFF',
    top: 8,
    left: 9,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  hospitalDistance: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOpen: {
    backgroundColor: '#4CAF50',
  },
  statusClosed: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
  },
  locationIcon: {
    padding: 5,
  },
  pinIcon: {
    width: 20,
    height: 24,
    alignItems: 'center',
  },
  pinTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#999999',
  },
  pinBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999999',
    marginTop: -2,
    alignSelf: 'center',
  },
});
