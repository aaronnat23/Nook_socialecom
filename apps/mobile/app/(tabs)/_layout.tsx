import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../components/ui';
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#B19DC1',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: C.border,
          height: 83,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: C.primary,
        headerTitle: 'lilac.',
        headerTitleStyle: { fontSize: 25, fontWeight: '700', letterSpacing: -1 },
        headerRight: () => (
          <TouchableOpacity
            accessibilityLabel="Shopping bag"
            onPress={() => router.push('/cart')}
            style={{ padding: 16 }}
          >
            <Ionicons name="bag-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'My Space',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
