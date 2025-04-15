import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { auth } from '../config/firebase';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (auth.currentUser?.email) {
      setUserName(auth.currentUser.email.split('@')[0]);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {userName}!</Text>
      <Text style={styles.subtitle}>Track your work time and location</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});