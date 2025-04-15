import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}