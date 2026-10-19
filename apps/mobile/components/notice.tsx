import { createContext, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from './motion';
import { C } from './ui';
export const NoticeContext = createContext<{ message: string; onClose: () => void } | null>(null);

export function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(message);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : 250,
      useNativeDriver: true,
    }).start();
    const timeout = setTimeout(onClose, Math.max(5500, message.length * 65));
    return () => clearTimeout(timeout);
  }, [message, onClose, progress, reduced]);
  if (!message) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 18, right: 18, bottom: 108, zIndex: 100 }}
    >
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
          backgroundColor: '#342344',
          borderWidth: 1,
          borderColor: '#8C6BAA',
          borderRadius: 20,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          shadowColor: '#28133C',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Ionicons name="sparkles-outline" size={20} color="#D9BDFB" />
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: '#FAF6FE', fontSize: 12, lineHeight: 19, flex: 1 }}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name="close" size={18} color="#D9BDFB" />
        </Pressable>
      </Animated.View>
    </View>
  );
}
