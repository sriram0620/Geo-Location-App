import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Platform } from 'react-native';
import { router, Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Lock, Mail } from 'lucide-react-native';
import { auth, db } from '../config/firebase';
import * as Device from 'expo-device';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getDeviceInfo = async () => {
    // Handle web platform differently
    if (Platform.OS === 'web') {
      return {
        brand: 'Web Browser',
        modelName: navigator.userAgent,
        osName: Platform.OS,
        osVersion: 'N/A',
        deviceId: 'web-' + Math.random().toString(36).substring(7)
      };
    }

    return {
      brand: Device.brand || 'Unknown',
      modelName: Device.modelName || 'Unknown',
      osName: Device.osName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      deviceId: Platform.OS === 'web' ? 
        'web-' + Math.random().toString(36).substring(7) : 
        (await Device.getDeviceIdAsync() || 'unknown')
    };
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get device information
      const deviceInfo = await getDeviceInfo();

      // Update user's device info and last login
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString(),
          deviceInfo,
          status: 'active'
        });

        const userData = userDoc.data();
        if (userData?.isAdmin) {
          router.replace('/admin');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // If user document doesn't exist (edge case), create it
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          deviceInfo,
          status: 'active',
          biometricEnabled: true,
          biometricAttempts: [],
          checkInHistory: [],
          checkedIn: false
        });
        
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800' }}
          style={styles.headerImage}
        />
        
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        
        <View style={styles.inputContainer}>
          <Mail size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/signup" style={styles.link}>Sign Up</Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
  },
});