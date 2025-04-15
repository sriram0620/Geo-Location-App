import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, AlertCircle, LogIn, LogOut } from 'lucide-react-native';
import { doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function LocationScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isInOffice, setIsInOffice] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [lastCheckOut, setLastCheckOut] = useState<string | null>(null);
  const [officeLocation, setOfficeLocation] = useState<any>(null);
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get office location from Firebase
        const officeDoc = await getDoc(doc(db, 'settings', 'office_location'));
        if (!officeDoc.exists()) {
          setErrorMsg('Office location not set');
          setLoading(false);
          return;
        }
        
        setOfficeLocation(officeDoc.data());

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLocation);
        
        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          officeDoc.data().latitude,
          officeDoc.data().longitude
        );
        setDistanceFromOffice(distance);
        setIsInOffice(distance <= officeDoc.data().radius);

        // Get user's check-in status
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const userData = userDoc.data();
          if (userData) {
            setCheckedIn(userData.checkedIn || false);
            setLastCheckIn(userData.lastCheckIn || null);
            setLastCheckOut(userData.lastCheckOut || null);
          }
        }
      } catch (error) {
        console.error('Error initializing location:', error);
        setErrorMsg('Failed to initialize location services');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser || !location) {
        Alert.alert('Error', 'Unable to get location or user information');
        return;
      }

      if (!isInOffice) {
        Alert.alert('Error', 'You must be within office premises to check in');
        return;
      }

      const timestamp = new Date().toISOString();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // Check if the user document exists
      const userDoc = await getDoc(userRef);
      
      const checkInData = {
        type: 'check-in',
        timestamp,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      };

      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: [checkInData],
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || 'User'
        });
      } else {
        // Document exists, update it
        await updateDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: arrayUnion(checkInData)
        });
      }

      // Add check-in record
      await setDoc(doc(db, 'attendance', `${auth.currentUser.uid}_${timestamp}`), {
        userId: auth.currentUser.uid,
        ...checkInData
      });

      setCheckedIn(true);
      setLastCheckIn(timestamp);
      Alert.alert('Success', 'You have successfully checked in');
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser || !location) {
        Alert.alert('Error', 'Unable to get location or user information');
        return;
      }

      const timestamp = new Date().toISOString();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // Check if user document exists
      const userDoc = await getDoc(userRef);
      
      const checkOutData = {
        type: 'check-out',
        timestamp,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      };

      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: [checkOutData],
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || 'User'
        });
      } else {
        // Document exists, update it
        await updateDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: arrayUnion(checkOutData)
        });
      }

      // Add check-out record
      await setDoc(doc(db, 'attendance', `${auth.currentUser.uid}_${timestamp}`), {
        userId: auth.currentUser.uid,
        ...checkOutData
      });

      setCheckedIn(false);
      setLastCheckOut(timestamp);
      Alert.alert('Success', 'You have successfully checked out');
    } catch (error) {
      console.error('Check-out error:', error);
      Alert.alert('Error', 'Failed to check out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <MapPin size={24} color="#007AFF" />
          <Text style={styles.title}>Location Status</Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color="#FF3B30" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusContainer}>
              <Text style={styles.label}>Current Status:</Text>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: isInOffice ? '#34C759' : '#FF3B30' },
                ]}
              />
              <Text style={[styles.status, { color: isInOffice ? '#34C759' : '#FF3B30' }]}>
                {isInOffice ? 'In Office' : 'Outside Office'}
              </Text>
            </View>

            {location && officeLocation && (
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinates}>
                  Your Location: {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                </Text>
                <Text style={styles.coordinates}>
                  Office Location: {officeLocation.latitude.toFixed(6)}, {officeLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.coordinates}>
                  Distance from Office: {(distanceFromOffice || 0).toFixed(0)} meters
                </Text>
                {lastCheckIn && (
                  <Text style={styles.timestamp}>
                    Last Check-in: {new Date(lastCheckIn).toLocaleString()}
                  </Text>
                )}
                {lastCheckOut && (
                  <Text style={styles.timestamp}>
                    Last Check-out: {new Date(lastCheckOut).toLocaleString()}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              {!checkedIn ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkInButton, (!isInOffice || loading) && styles.buttonDisabled]}
                  onPress={handleCheckIn}
                  disabled={!isInOffice || loading}
                >
                  <LogIn size={20} color="white" />
                  <Text style={styles.actionButtonText}>Check In</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkOutButton, loading && styles.buttonDisabled]}
                  onPress={handleCheckOut}
                  disabled={loading}
                >
                  <LogOut size={20} color="white" />
                  <Text style={styles.actionButtonText}>Check Out</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 10,
    color: '#FF3B30',
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginRight: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
  },
  coordinatesContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  checkInButton: {
    backgroundColor: '#34C759',
  },
  checkOutButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});