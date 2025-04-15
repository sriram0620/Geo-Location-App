import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../app/config/firebase';
import { router } from 'expo-router';

interface BiometricPromptProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BiometricPrompt({ onSuccess, onCancel }: BiometricPromptProps) {
  const [isPromptVisible, setIsPromptVisible] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Skip biometric verification on web
      setIsPromptVisible(false);
      onSuccess();
      return;
    }
    authenticate();
  }, []);

  const authenticate = async () => {
    if (Platform.OS === 'web') {
      setIsPromptVisible(false);
      onSuccess();
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        await logVerificationAttempt(false, 'Biometric hardware not available or not enrolled');
        setIsPromptVisible(false);
        onSuccess(); // Allow access even if biometrics are not available
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      await logVerificationAttempt(result.success, result.success ? 'Authentication successful' : 'Authentication failed');

      if (result.success) {
        setIsPromptVisible(false);
        onSuccess();
      } else {
        // If authentication fails, redirect to login
        await auth.signOut();
        router.replace('/(auth)/login');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await logVerificationAttempt(false, errorMessage);
      // If there's an error, sign out and redirect to login
      await auth.signOut();
      router.replace('/(auth)/login');
    }
  };

  const logVerificationAttempt = async (success: boolean, message: string) => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const timestamp = new Date().toISOString();
      
      const biometricAttempt = {
        timestamp,
        success,
        message: message || 'No message provided'
      };

      // Check if the document exists
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new document if it doesn't exist
        await setDoc(userRef, {
          biometricAttempts: [biometricAttempt],
          lastBiometricAttempt: biometricAttempt,
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || 'User'
        });
      } else {
        // Update existing document
        await updateDoc(userRef, {
          biometricAttempts: arrayUnion(biometricAttempt),
          lastBiometricAttempt: biometricAttempt
        });
      }
    } catch (error) {
      console.error('Error logging biometric attempt:', error);
    }
  };

  if (!isPromptVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.prompt}>
        <Text style={styles.title}>Verification Required</Text>
        <Text style={styles.message}>
          Please verify your identity to continue using the app.
        </Text>
        <TouchableOpacity style={styles.button} onPress={authenticate}>
          <Text style={styles.buttonText}>Verify Identity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  prompt: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});