import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Logo } from '../../components/brand';
import { Text } from '../../components/text';
import { useReducedMotion } from '../../components/motion';
import { C } from '../../components/ui';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const icons = {
  index: ['compass', 'compass-outline'],
  me: ['grid', 'grid-outline'],
  settings: ['settings', 'settings-outline'],
} as const;

/** A floating ink dock. A persimmon pill springs between the three destinations. */
function NookTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const itemWidth = width ? (width - 12) / state.routes.length : 0;
  useEffect(() => {
    if (!itemWidth) return;
    const target = state.index * itemWidth;
    x.value = reduced ? target : withSpring(target, { damping: 15, stiffness: 190, mass: 0.8 });
  }, [state.index, itemWidth, reduced, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 4 }}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          padding: 6,
          backgroundColor: C.ink,
          borderRadius: 999,
          shadowColor: C.ink,
          shadowOpacity: 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 6,
                top: 6,
                bottom: 6,
                width: itemWidth,
                borderRadius: 999,
                backgroundColor: C.persimmon,
              },
              pill,
            ]}
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const [on, off] = icons[route.name as keyof typeof icons] || icons.index;
          const label = (options.title as string) || route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 9 }}
            >
              <Ionicons name={focused ? on : off} size={21} color={focused ? C.ink : C.paper} />
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: focused ? C.ink : C.paper }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Layout() {
  const reduced = useReducedMotion();
  return (
    <Tabs
      tabBar={(props) => <NookTabBar {...props} />}
      screenOptions={{
        animation: reduced === false ? 'shift' : 'none',
        headerStyle: { backgroundColor: C.paper },
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitle: () => <Logo size={32} />,
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Shopping bag"
            onPress={() => router.push('/cart')}
            style={{
              marginRight: 16,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: C.card,
              borderWidth: 2,
              borderColor: C.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="bag-outline" size={20} color={C.ink} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover' }} />
      <Tabs.Screen name="me" options={{ title: 'My Space' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
