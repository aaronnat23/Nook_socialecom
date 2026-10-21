import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@lilac/ui';
import { contrastRatio } from '@lilac/renderer';
import { Key, useReducedMotion } from './motion';
import { Text } from './text';
import { font } from './fonts';
import { NookMark } from './brand';

export const C = tokens.colors;
export { Text };

/** A soft, low shadow for things that float above the page (round buttons, bars, sheets). */
export const lift = (strength = 1) => ({
  shadowColor: C.ink,
  shadowOpacity: 0.16 * strength,
  shadowRadius: 12 * strength,
  shadowOffset: { width: 0, height: 6 * strength },
  elevation: 5 * strength,
});

/**
 * The inner white keyline that sits just inside a surface's outline. Together with the outline it
 * gives Nook's double-stroke tiles. Place it last inside a clipped parent.
 */
export function Ring({
  width = 5,
  opacity = 0.6,
  radius,
  style,
}: {
  width?: number;
  opacity?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderWidth: width,
          borderColor: `rgba(255,255,255,${opacity})`,
          borderRadius: radius,
        },
        style,
      ]}
    />
  );
}

/** A flat, pastel tile with a thick outline and a white keyline inside it. */
export function Panel({
  tone = C.card,
  radius = 28,
  ring = 6,
  style,
  children,
}: {
  tone?: string;
  radius?: number;
  ring?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: tone,
          borderWidth: 3,
          borderColor: C.ink,
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
      <Ring width={ring} radius={Math.max(0, radius - 3)} />
    </View>
  );
}

/** A round, borderless button that floats over images and bars. */
export function RoundButton({
  icon,
  label,
  onPress,
  dark = false,
  active = false,
  size = 46,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  dark?: boolean;
  active?: boolean;
  size?: number;
}) {
  const press = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.1 }] }));
  const bg = active ? C.persimmon : dark ? C.ink : C.card;
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        lift(),
        a,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => (press.value = withTiming(1, { duration: 70 }))}
        onPressOut={() => (press.value = withSpring(0, { damping: 7, stiffness: 260 }))}
        hitSlop={4}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon} size={size * 0.42} color={dark && !active ? C.paper : C.ink} />
      </Pressable>
    </Animated.View>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 22, paddingBottom: 38 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.persimmonDeep,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    fontFamily: font.display,
    fontSize: 38,
    color: C.ink,
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  subtitle: { fontSize: 15, lineHeight: 23, color: C.ink2, marginTop: 10 },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 27,
    color: C.ink,
    letterSpacing: -0.4,
    lineHeight: 31,
    marginTop: 30,
    marginBottom: 16,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  input: {
    borderWidth: 2,
    borderColor: '#CDBD9D',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.card,
    minHeight: 52,
    fontFamily: font.medium,
  },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8, marginTop: 18 },
  button: {
    minHeight: 52,
    paddingHorizontal: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { fontSize: 15, color: C.ink, fontWeight: '700' },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.persimmon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  soft: { backgroundColor: C.lilac },
  softText: { color: C.ink },
  error: {
    backgroundColor: C.pink,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
    color: C.ink,
    padding: 13,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginVertical: 12,
    overflow: 'hidden',
  },
  pill: {
    backgroundColor: C.butter,
    color: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.ink,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  image: { width: '100%', height: 190, borderRadius: 14 },
  muted: { fontSize: 14, color: C.muted, lineHeight: 21 },
  divider: { height: 2, backgroundColor: C.border, marginVertical: 18 },
  price: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 8 },
  empty: { padding: 35, alignItems: 'center', gap: 15 },
  fine: { fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 12 },
});

export function Button({
  title,
  onPress,
  soft = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  soft?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const custom = typeof style?.backgroundColor === 'string' ? style.backgroundColor : undefined;
  // The main button is ink with a persimmon arrow disc; soft and custom ones are plain pills.
  const primary = !soft && !custom;
  const background = soft ? C.lilac : custom || C.ink;
  const foreground = primary
    ? C.paper
    : /^#[\dA-Fa-f]{6}$/.test(background) && contrastRatio(C.ink, background) < 4.5
      ? '#FFFFFF'
      : C.ink;
  const { backgroundColor: _drop, ...outer } = style || {};
  return (
    <Key
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      color={background}
      borderColor={C.ink}
      style={[outer, { minHeight: style?.minHeight || 52 }]}
      innerStyle={[
        ui.button,
        { minHeight: (style?.minHeight as number) || 52 },
        primary && { paddingRight: 8 },
      ]}
    >
      <Text style={[ui.buttonText, { color: foreground }]}>{title.replace(/\s*[↗→]$/, '')}</Text>
      {primary && (
        <View style={ui.disc}>
          <Ionicons name="arrow-forward" size={16} color={C.ink} />
        </View>
      )}
    </Key>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          ui.input,
          focused && { borderColor: C.ink, backgroundColor: '#FFFFFF' },
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          props.style,
        ]}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor="#9B8FA8"
      />
    </View>
  );
}

export function Loading() {
  const reduced = useReducedMotion();
  return (
    <View style={ui.empty}>
      <NookMark size={56} />
      {reduced ? null : <ActivityIndicator color={C.ink} />}
      <Text style={ui.muted}>Opening the door…</Text>
    </View>
  );
}
