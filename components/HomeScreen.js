import React, { useState, useEffect } from 'react';
import { 
  View, 
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { ref, get } from 'firebase/database';
import { realtimeDb } from '../config/firebaseConfig';

export default function HomeScreen({ onNavigateToProfile, onNavigateToCamera, onNavigateToSymptomsChecker, onNavigateToScanDisease, onNavigateToNearbyHospitals, onNavigateToFirstAid, onNavigateToSuggestion, onNavigateToReportProblem }) {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/small-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.welcomeContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.welcomeText}>Welcome, {userName}</Text>
          )}
          <Text style={styles.subText}>How are you feeling today?</Text>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Your Health, Your Strength</Text>
          <Text style={styles.bannerSubtitle}>We Care For You.</Text>
        </View>

        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToScanDisease}>
            <Text style={styles.buttonText}>Scan for Skin Disease</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToSymptomsChecker}>
            <Text style={styles.buttonText}>Symptoms Checker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToFirstAid}>
            <Text style={styles.buttonText}>Emergency FirstAid</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToNearbyHospitals}>
            <Text style={styles.buttonText}>Nearby Hospitals</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToSuggestion}>
            <Text style={styles.buttonText}>Write a Suggestion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToReportProblem}>
            <Text style={styles.buttonText}>Report a Problem</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.iconContainer}>
            <View style={styles.homeIcon}>
              <View style={styles.homeRoof} />
              <View style={styles.homeBase} />
            </View>
          </View>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToScanDisease}>
          <View style={styles.iconContainer}>
            <View style={styles.cameraIcon}>
              <View style={styles.cameraBody} />
              <View style={styles.cameraLens} />
            </View>
          </View>
          <Text style={styles.navText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToProfile}>
          <View style={styles.iconContainer}>
            <View style={styles.profileIcon}>
              <View style={styles.profileHead} />
              <View style={styles.profileBody} />
            </View>
          </View>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0097B2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 220,
    height: 80,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  banner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 25,
    marginBottom: 50,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#00B8D4',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingBottom: 25,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  homeIcon: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0097B2',
    marginBottom: -1,
  },
  homeBase: {
    width: 16,
    height: 12,
    backgroundColor: '#0097B2',
    borderRadius: 1,
  },
  cameraIcon: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBody: {
    width: 20,
    height: 16,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#0097B2',
    backgroundColor: 'transparent',
  },
  cameraLens: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0097B2',
  },
  profileIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0097B2',
    marginBottom: 2,
  },
  profileBody: {
    width: 14,
    height: 8,
    borderRadius: 7,
    backgroundColor: '#0097B2',
  },
  navText: {
    fontSize: 12,
    color: '#0097B2',
    fontWeight: '600',
  },
});

