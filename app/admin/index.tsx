import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TextInput, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import {
  collection, query, orderBy, getDocs, doc, setDoc, getDoc, where
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { MapPin, Save, Users, AlertTriangle, Smartphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [officeLocation, setOfficeLocation] = useState({
    latitude: '',
    longitude: '',
    radius: ''
  });
  const router = useRouter();

  // Process attendance records to group check-ins with check-outs
  const [processedAttendance, setProcessedAttendance] = useState<any[]>([]);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 0);
          return;
        }

        // Let's update the current user to make them an admin if needed
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        // If the user document doesn't exist or doesn't have isAdmin field,
        // we'll create it and set them as an admin for this demo
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            isAdmin: true,
            email: user.email,
            name: user.displayName || 'Admin User',
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
          fetchData();
          return;
        }
        
        const userData = userDoc.data();
        
        // If isAdmin field is missing, add it
        if (userData && userData.isAdmin === undefined) {
          await setDoc(userRef, { isAdmin: true }, { merge: true });
          fetchData();
          return;
        }

        if (!userData?.isAdmin) {
          Alert.alert('Unauthorized', 'You do not have access to this page');
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 100);
          return;
        }

        fetchData();
      } catch (error) {
        console.error('Error checking admin access:', error);
        Alert.alert('Error', 'Authentication error', [{
          text: 'OK',
          onPress: () => {
            setTimeout(() => {
              router.replace('/(auth)/login');
            }, 100);
          }
        }]);
      }
    };

    checkAdminAccess();
  }, []);

  // Process attendance records to pair check-ins with check-outs
  useEffect(() => {
    if (attendanceRecords.length > 0 && users.length > 0) {
      // Group records by user and sort by timestamp
      const recordsByUser: Record<string, any[]> = {};
      
      attendanceRecords.forEach(record => {
        if (!recordsByUser[record.userId]) {
          recordsByUser[record.userId] = [];
        }
        recordsByUser[record.userId].push(record);
      });
      
      // For each user, pair check-ins with check-outs
      const processed: any[] = [];
      
      Object.keys(recordsByUser).forEach(userId => {
        const userRecords = recordsByUser[userId].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Find the user
        const user = users.find(u => u.id === userId);
        
        // Process records to create pairs
        let checkInRecord = null;
        
        for (let i = 0; i < userRecords.length; i++) {
          const record = userRecords[i];
          
          if (record.type === 'check-in') {
            // Create a new entry with this check-in and no check-out
            processed.push({
              userId,
              userName: user?.name || 'Unknown',
              userEmail: user?.email || 'Unknown',
              checkIn: record,
              checkOut: null,
              date: new Date(record.timestamp).toLocaleDateString()
            });
            checkInRecord = null;
          } else if (record.type === 'check-out') {
            // Look for a check-in that doesn't have a checkout yet
            const matchingEntry = processed.find(
              p => p.userId === userId && p.checkIn && !p.checkOut &&
              new Date(p.checkIn.timestamp).toLocaleDateString() === new Date(record.timestamp).toLocaleDateString()
            );
            
            if (matchingEntry) {
              matchingEntry.checkOut = record;
            } else {
              // Orphaned check-out, create an entry with no check-in
              processed.push({
                userId,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || 'Unknown',
                checkIn: null,
                checkOut: record,
                date: new Date(record.timestamp).toLocaleDateString()
              });
            }
          }
        }
      });
      
      // Sort by date (most recent first)
      processed.sort((a, b) => {
        const dateA = a.checkIn ? new Date(a.checkIn.timestamp) : new Date(a.checkOut.timestamp);
        const dateB = b.checkIn ? new Date(b.checkIn.timestamp) : new Date(b.checkOut.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      setProcessedAttendance(processed);
    }
  }, [attendanceRecords, users]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchAttendanceRecords(),
        fetchOfficeLocation()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      // Remove the where clause to get all users, or handle users without isAdmin field
      const querySnapshot = await getDocs(usersRef);
      const usersList: any[] = [];
      querySnapshot.forEach((doc) => {
        // Skip the current admin user
        if (doc.id !== auth.currentUser?.uid) {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  const fetchOfficeLocation = async () => {
    try {
      const docRef = doc(db, 'settings', 'office_location');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOfficeLocation({
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          radius: data.radius.toString()
        });
      }
    } catch (error) {
      console.error('Error fetching office location:', error);
    }
  };

  const saveOfficeLocation = async () => {
    if (!officeLocation.latitude || !officeLocation.longitude || !officeLocation.radius) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'office_location'), {
        latitude: parseFloat(officeLocation.latitude),
        longitude: parseFloat(officeLocation.longitude),
        radius: parseFloat(officeLocation.radius)
      });
      Alert.alert('Success', 'Office location updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update office location');
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const records: any[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      {/* USERS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Users</Text>
        </View>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <Text style={styles.userName}>{user.name || 'Unknown Name'}</Text>
            <Text style={styles.userEmail}>{user.email || 'Unknown Email'}</Text>
            <Text style={styles.userStatus}>
              Status: {user.checkedIn ? 'Checked In' : 'Checked Out'}
            </Text>
            
            {/* Device Information */}
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceInfoTitle}>Device Information:</Text>
              <Text style={styles.deviceInfoText}>
                Device: {user.deviceInfo?.brand} {user.deviceInfo?.modelName}
              </Text>
              <Text style={styles.deviceInfoText}>
                OS: {user.deviceInfo?.osName} {user.deviceInfo?.osVersion}
              </Text>
              <View style={styles.imeiContainer}>
                <Smartphone size={14} color="#666" style={styles.imeiIcon} />
                <Text style={styles.deviceInfoText}>
                  IMEI/Device ID: {user.deviceInfo?.imei || user.deviceInfo?.deviceId || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Biometric Status */}
            {user.lastBiometricAttempt && !user.lastBiometricAttempt.success && (
              <View style={styles.biometricFailure}>
                <AlertTriangle size={20} color="#FF3B30" />
                <Text style={styles.biometricFailureText}>
                  Last biometric verification failed at{' '}
                  {new Date(user.lastBiometricAttempt.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* LOCATION SETTINGS */}
      <View style={styles.locationSettingsCard}>
        <View style={styles.cardHeader}>
          <MapPin size={24} color="#007AFF" />
          <Text style={styles.cardTitle}>Office Location Settings</Text>
        </View>

        {['Latitude', 'Longitude', 'Radius (meters)'].map((label, i) => {
          const key = ['latitude', 'longitude', 'radius'][i] as keyof typeof officeLocation;
          return (
            <View key={key} style={styles.inputGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={officeLocation[key]}
                onChangeText={(text) => setOfficeLocation(prev => ({ ...prev, [key]: text }))}
                keyboardType="numeric"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={saveOfficeLocation}>
          <Save size={20} color="white" />
          <Text style={styles.saveButtonText}>Save Location</Text>
        </TouchableOpacity>
      </View>

      {/* ATTENDANCE RECORDS - UPDATED DISPLAY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Attendance Records</Text>
        </View>
        
        {processedAttendance.length > 0 ? (
          processedAttendance.map((record, index) => (
            <View key={index} style={styles.attendanceRecord}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.attendanceName}>{record.userName}</Text>
                <Text style={styles.attendanceEmail}>{record.userEmail}</Text>
                <Text style={styles.attendanceDate}>{record.date}</Text>
              </View>
              
              <View style={styles.attendanceTimes}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Check In:</Text>
                  <Text style={[styles.timeValue, { color: '#34C759' }]}>
                    {record.checkIn 
                      ? new Date(record.checkIn.timestamp).toLocaleTimeString() 
                      : 'No check-in record'}
                  </Text>
                </View>
                
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Check Out:</Text>
                  <Text style={[styles.timeValue, { color: record.checkOut ? '#FF3B30' : '#FF9500' }]}>
                    {record.checkOut 
                      ? new Date(record.checkOut.timestamp).toLocaleTimeString() 
                      : 'Not checked out'}
                  </Text>
                </View>
              </View>
              
              {(record.checkIn || record.checkOut) && (
                <View style={styles.locationRow}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.locationText}>
                    {record.checkIn 
                      ? `Check-in: ${record.checkIn.location.latitude.toFixed(6)}, ${record.checkIn.location.longitude.toFixed(6)}` 
                      : record.checkOut 
                        ? `Check-out: ${record.checkOut.location.latitude.toFixed(6)}, ${record.checkOut.location.longitude.toFixed(6)}`
                        : ''}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noRecords}>No attendance records found</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  section: {
    margin: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginLeft: 10 },
  userCard: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  userName: { fontSize: 18, fontWeight: '600', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 5 },
  userStatus: { fontSize: 14, color: '#666', marginTop: 5, fontStyle: 'italic' },
  deviceInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  deviceInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  imeiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  imeiIcon: {
    marginRight: 5,
  },
  biometricFailure: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
  },
  biometricFailureText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#FF3B30',
  },
  locationSettingsCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginLeft: 10, color: '#333' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: { color: 'white', fontWeight: '600', marginLeft: 5 },
  
  // New styles for improved attendance records display
  attendanceRecord: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  attendanceHeader: {
    marginBottom: 10,
  },
  attendanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  attendanceEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  attendanceDate: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  attendanceTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  noRecords: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});