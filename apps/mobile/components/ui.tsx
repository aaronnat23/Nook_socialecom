import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  Animated,
  View,
  type TextInputProps,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '@lilac/ui';
import { contrastRatio } from '@lilac/renderer';
import { useReducedMotion } from './motion';
export const C = tokens.colors;
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 22, paddingBottom: 38 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#8C6BAA',
    fontWeight: '700',
    marginBottom: 10,
  },
  title: { fontSize: 32, color: C.text, fontWeight: '600', letterSpacing: -1.25, lineHeight: 39 },
  subtitle: { fontSize: 13, lineHeight: 22, color: C.muted, marginTop: 10 },
  sectionTitle: {
    fontSize: 21,
    color: C.text,
    fontWeight: '600',
    letterSpacing: -0.6,
    marginTop: 25,
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#44256A',
    shadowOpacity: 0.035,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: C.text,
    backgroundColor: '#FDFBFF',
    minHeight: 50,
  },
  label: { fontSize: 11, fontWeight: '600', color: '#78638E', marginBottom: 8, marginTop: 18 },
  button: {
    backgroundColor: C.primary,
    borderRadius: 15,
    minHeight: 48,
    paddingHorizontal: 17,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { fontSize: 12, color: '#FFF', fontWeight: '600', letterSpacing: 0.1 },
  soft: { backgroundColor: C.lilac },
  softText: { color: C.primary },
  error: {
    backgroundColor: '#FFF0F3',
    borderRadius: 8,
    color: '#AA5572',
    padding: 12,
    fontSize: 12,
    lineHeight: 19,
    marginVertical: 12,
  },
  pill: {
    backgroundColor: C.lilac,
    color: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 9,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 190, borderRadius: 10 },
  muted: { fontSize: 12, color: C.muted, lineHeight: 20 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },
  price: { fontSize: 14, fontWeight: '600', color: '#79558E', marginTop: 8 },
  empty: { padding: 35, alignItems: 'center', gap: 15 },
  fine: { fontSize: 10, color: '#A996B7', lineHeight: 17, marginTop: 12 },
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
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const background = typeof style?.backgroundColor === 'string' ? style.backgroundColor : C.primary;
  const foreground =
    /^#[\dA-Fa-f]{6}$/.test(background) && contrastRatio('#FFFFFF', background) < 4.5
      ? '#24182F'
      : '#FFFFFF';
  const animate = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 32,
      bounciness: 3,
    }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (reduced === false) animate(0.97);
        }}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [
          ui.button,
          soft && ui.soft,
          disabled && { opacity: 0.45 },
          {
            minHeight: style?.minHeight || 48,
            backgroundColor: soft
              ? pressed
                ? '#E3D6F5'
                : C.lilac
              : pressed
                ? background === C.primary
                  ? C.primaryDark
                  : background
                : style?.backgroundColor || C.primary,
            borderWidth: 1,
            borderColor: soft ? '#E6DCF3' : '#FFFFFF20',
            shadowColor: C.primaryDark,
            shadowOpacity: soft ? 0 : 0.12,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        <Text style={[ui.buttonText, { color: foreground }, soft && ui.softText]}>{title}</Text>
      </Pressable>
    </Animated.View>
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
          focused && {
            borderColor: '#B496DD',
            backgroundColor: '#FFF',
            shadowColor: C.primary,
            shadowOpacity: 0.08,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 2 },
          },
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
          props.style,
        ]}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor="#B2A2BF"
      />
    </View>
  );
}
export function Loading() {
  return (
    <View style={ui.empty}>
      <ActivityIndicator color={C.primary} />
      <Text style={ui.muted}>Opening your little corner…</Text>
    </View>
  );
}
