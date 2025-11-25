import React from 'react';
import { 
  View, 
  Image,
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView
} from 'react-native';

export default function FirstAidScreen({ onBack, onNavigateToARFirstAid }) {
  const firstAidTopics = [
    { id: 1, label: 'Burns' },
    { id: 2, label: 'Bleeding' },
    { id: 3, label: 'Sprain' },
    { id: 4, label: 'Cuts' },
    { id: 5, label: 'Allergic Reaction' },
    { id: 6, label: 'Bruises' },
    { id: 7, label: 'Infection Prevention' },
  ];

  const handleTopicSelect = (topic) => {
    console.log('Selected topic:', topic);
    // Navigate to AR First Aid screen with selected injury type
    if (onNavigateToARFirstAid) {
      onNavigateToARFirstAid(topic.label);
    }
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

        <Text style={styles.title}>FIRST AID GUIDE</Text>
        <Text style={styles.subtitle}>Quick steps for common injuries</Text>

        <View style={styles.topicsList}>
          {firstAidTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => handleTopicSelect(topic)}
            >
              <Text style={styles.topicText}>{topic.label}</Text>
              <View style={styles.chevronIcon}>
                <View style={styles.chevronLine1} />
                <View style={styles.chevronLine2} />
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
    backgroundColor: '#F5F5F5',
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
    marginBottom: 30,
  },
  topicsList: {
    marginTop: 10,
  },
  topicCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  chevronIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chevronLine1: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '45deg' }],
    top: 8,
    right: 4,
  },
  chevronLine2: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: '#0097B2',
    transform: [{ rotate: '-45deg' }],
    top: 8,
    left: 4,
  },
});



