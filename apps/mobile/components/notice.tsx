import { createContext, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { Text } from './text';
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
      duration: reduced ? 0 : 420,
      easing: Easing.bezier(0.22, 1.2, 0.36, 1),
      useNativeDriver: true,
    }).start();
    const timeout = setTimeout(onClose, Math.max(5500, message.length * 65));
    return () => clearTimeout(timeout);
  }, [message, onClose, progress, reduced]);
  if (!message) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 18, right: 18, bottom: 112, zIndex: 100 }}
    >
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
          backgroundColor: C.ink,
          borderRadius: 26,
          paddingVertical: 15,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          shadowColor: C.ink,
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <Ionicons name="star" size={18} color={C.butter} />
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: C.paper, fontSize: 14.5, lineHeight: 20, fontWeight: '600', flex: 1 }}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name="close" size={18} color={C.paper} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
