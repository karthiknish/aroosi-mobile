import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';

interface OnboardingCompleteScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

export default function OnboardingCompleteScreen({ navigation }: OnboardingCompleteScreenProps) {
  const handleContinue = () => {
    navigation.navigate('Main');
  };

  const handleAddPhotos = () => {
    // Navigate to photo upload screen (to be implemented)
    navigation.navigate('Main', { openProfile: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Animation/Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Profile Created!</Text>
          <Text style={styles.successSubtitle}>
            Congratulations! Your profile has been successfully created.
          </Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>📸</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Profile Photos</Text>
              <Text style={styles.stepDescription}>
                Upload photos to make your profile more attractive and get better matches
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>🔍</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Start Browsing</Text>
              <Text style={styles.stepDescription}>
                Discover and connect with amazing people in your area
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>💬</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Send Interests</Text>
              <Text style={styles.stepDescription}>
                Show interest in profiles you like and start meaningful conversations
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddPhotos}>
            <Text style={styles.primaryButtonText}>Add Photos Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleContinue}>
            <Text style={styles.secondaryButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <Text style={styles.tipText}>
            • Complete your profile to increase your chances of finding matches
          </Text>
          <Text style={styles.tipText}>
            • Add multiple photos showcasing different aspects of your life
          </Text>
          <Text style={styles.tipText}>
            • Be authentic and honest in your bio and preferences
          </Text>
          <Text style={styles.tipText}>
            • Stay active and engage with the community regularly
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  nextStepsContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  nextStepsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepEmoji: {
    fontSize: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    paddingVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});