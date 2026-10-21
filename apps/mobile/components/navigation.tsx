import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { C } from './ui';

/** The same three destinations as the main dock, shown on nested screens. */
export function NestedNavigation() {
  const path = usePathname();
  const inset = useSafeAreaInsets();
  // product pages dock their own buy bar where the navigation would be
  if (['/', '/me', '/settings'].includes(path) || path.startsWith('/product/')) return null;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
        paddingBottom: Math.max(inset.bottom, 12),
        backgroundColor: C.paper,
        borderTopWidth: 2,
        borderColor: C.ink,
      }}
    >
      {(
        [
          { label: 'Discover', href: '/', icon: 'compass-outline' },
          { label: 'My Space', href: '/me', icon: 'grid-outline' },
          { label: 'Settings', href: '/settings', icon: 'settings-outline' },
        ] as const
      ).map((t) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t.label}
          key={t.href}
          onPress={() => router.replace(t.href)}
          style={{
            alignItems: 'center',
            gap: 3,
            minWidth: 72,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Ionicons name={t.icon} color={C.ink} size={22} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.ink }}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
