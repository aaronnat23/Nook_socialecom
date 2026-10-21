import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from './text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from './motion';
import { C } from './ui';
import { font } from './fonts';
import { Notice, NoticeContext } from './notice';

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  eyebrow = 'NOOK STUDIO',
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
      duration: reduced ? 0 : visible ? 460 : 220,
      easing: visible ? Easing.bezier(0.22, 1, 0.36, 1) : Easing.in(Easing.cubic),
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
              backgroundColor: C.ink,
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
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
                    translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.header}>
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
                  style={({ pressed }) => [styles.close, pressed && { backgroundColor: C.butter }]}
                >
                  <Ionicons name="close" size={20} color={C.ink} />
                </Pressable>
              </View>
            </View>
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
    backgroundColor: C.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: C.ink,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    borderBottomWidth: 3,
    borderBottomColor: C.ink,
    backgroundColor: C.paper2,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 5,
    backgroundColor: C.ink,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.persimmonDeep,
    marginBottom: 8,
  },
  title: {
    fontFamily: font.display,
    fontSize: 29,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: C.ink,
  },
  subtitle: { fontSize: 14, lineHeight: 21, color: C.ink2, marginTop: 8 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: C.ink,
    backgroundColor: C.card,
  },
});
