import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export default function SplashScreen({ onNavigate }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onNavigate) {
        onNavigate();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onNavigate]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/doktap logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0097B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 650,
    height: 600,
    marginBottom: 20,
  },
  text: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
});

