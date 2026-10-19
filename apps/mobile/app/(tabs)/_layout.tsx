import { Tabs, router } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../components/ui';
import { useReducedMotion } from '../../components/motion';
export default function Layout() {
  const reduced = useReducedMotion();
  return (
    <Tabs
      screenOptions={{
        animation: reduced === false ? 'shift' : 'none',
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: '#B19DC1',
        tabBarStyle: {
          backgroundColor: '#FFFEFF',
          borderTopColor: C.border,
          height: 83,
          paddingTop: 8,
          paddingBottom: 24,
          shadowColor: '#5A387E',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
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
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#EEE5FA' : 'transparent',
                width: 53,
                height: 32,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'My Space',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#EEE5FA' : 'transparent',
                width: 53,
                height: 32,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={21} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                backgroundColor: focused ? '#EEE5FA' : 'transparent',
                width: 53,
                height: 32,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={21} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
