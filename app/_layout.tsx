import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';

function useProtectedRoute(user: any, ready: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      // If user is not authenticated and not in auth group, redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Check if user is admin
      const checkUserRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            // If user document doesn't exist, sign out
            await auth.signOut();
            router.replace('/(auth)/login');
            return;
          }

          const userData = userDoc.data();
          const isInAdminRoute = segments[0] === 'admin';

          if (userData?.isAdmin && !isInAdminRoute) {
            router.replace('/admin');
          } else if (!userData?.isAdmin && isInAdminRoute) {
            // If not admin but trying to access admin route
            router.replace('/(tabs)');
          } else if (inAuthGroup) {
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          // If there's an error checking the role, sign out the user
          await auth.signOut();
          router.replace('/(auth)/login');
        }
      };

      checkUserRole();
    }
  }, [user, segments, ready]);
}

export default function RootLayout() {
  useFrameworkReady();
  const [user, setUser] = useState<any>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setInitialLoad(false);
    });

    return unsubscribe;
  }, []);

  useProtectedRoute(user, !initialLoad);

  if (initialLoad) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}