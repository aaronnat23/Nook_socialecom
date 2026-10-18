import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from './ui';
export function NestedNavigation() {
  const path = usePathname();
  const inset = useSafeAreaInsets();
  if (['/', '/me', '/settings'].includes(path)) return null;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingBottom: Math.max(inset.bottom, 12),
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderColor: C.border,
      }}
    >
      {(
        [
          { label: 'Discover', href: '/', icon: 'compass-outline' },
          { label: 'My Space', href: '/me', icon: 'grid-outline' },
          { label: 'Settings', href: '/settings', icon: 'settings-outline' },
        ] as const
      ).map((t) => (
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityLabel={t.label}
          key={t.href}
          onPress={() => router.replace(t.href)}
          style={{ alignItems: 'center', gap: 5, minWidth: 65, minHeight: 44 }}
        >
          <Ionicons name={t.icon} color={C.primary} size={21} />
          <Text style={{ fontSize: 9, color: C.primary }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
