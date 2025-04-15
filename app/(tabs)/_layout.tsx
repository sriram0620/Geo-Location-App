import { Tabs } from 'expo-router';
import { Home, User, MapPin } from 'lucide-react-native';
import { useInactivityCheck } from '../../hooks/useInactivityCheck';
import BiometricPrompt from '../../components/BiometricPrompt';
import { View } from 'react-native';

export default function TabLayout() {
  const { requiresVerification, resetInactivityTimer } = useInactivityCheck();

  if (requiresVerification) {
    return (
      <View style={{ flex: 1 }}>
        <BiometricPrompt
          onSuccess={resetInactivityTimer}
          onCancel={() => {}} // Handle cancellation
        />
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="location"
            options={{
              title: 'Location',
              tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: 'Location',
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}