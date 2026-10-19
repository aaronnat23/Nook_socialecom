import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from './motion';
import { C } from './ui';
import { Notice, NoticeContext } from './notice';

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  eyebrow = 'LILAC STUDIO',
  children,
  footer,
  compact = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  const inset = useSafeAreaInsets();
  const notice = useContext(NoticeContext);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? 340 : 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress, reduced]);
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#21132F',
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.46] }),
            },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss dialog"
          accessibilityRole="button"
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.position, { paddingTop: Math.max(inset.top + 12, 32) }]}
          pointerEvents="box-none"
        >
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[
              styles.panel,
              compact ? { maxHeight: '72%' } : { height: '93%' },
              {
                opacity: progress,
                transform: [
                  {
                    translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [65, 0] }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient colors={['#F2EAFF', '#FFFEFF']} style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.eyebrow}>{eyebrow}</Text>
                  <Text accessibilityRole="header" style={styles.title}>
                    {title}
                  </Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close panel"
                  onPress={onClose}
                  hitSlop={8}
                  style={({ pressed }) => [styles.close, pressed && { backgroundColor: '#E9DFF7' }]}
                >
                  <Ionicons name="close" size={20} color={C.primaryDark} />
                </Pressable>
              </View>
            </LinearGradient>
            <View style={{ flex: compact ? undefined : 1, flexShrink: 1 }}>{children}</View>
            {footer ? (
              <View style={[styles.footer, { paddingBottom: Math.max(inset.bottom, 18) }]}>
                {footer}
              </View>
            ) : (
              <View style={{ height: Math.max(inset.bottom, 14) }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
        {notice && <Notice message={notice.message} onClose={notice.onClose} />}
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  position: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#FAF8FD',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFFB0',
    shadowColor: '#28153E',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE6F4',
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 5,
    backgroundColor: '#D5C7E5',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#9472B5', marginBottom: 8 },
  title: { fontSize: 25, lineHeight: 30, letterSpacing: -0.8, fontWeight: '600', color: C.text },
  subtitle: { fontSize: 12, lineHeight: 19, color: C.muted, marginTop: 8 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#FFFFFFD9',
    borderWidth: 1,
    borderColor: '#E8DFF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: '#FFFFFFF5',
  },
});
