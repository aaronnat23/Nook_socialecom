import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '@lilac/ui';
import { contrastRatio } from '@lilac/renderer';
import { Key, useReducedMotion } from './motion';
import { Text } from './text';
import { font } from './fonts';
import { NookMark } from './brand';

export const C = tokens.colors;
export { Text };

/** Hard offset shadow that works on iOS; Android falls back to the outline. */
export const hardShadow = (x = 3, y = 3, color: string = C.ink) => ({
  shadowColor: color,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: x, height: y },
});

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
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    ...hardShadow(3, 4),
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
  const background = soft ? C.lilac : custom || C.persimmon;
  const foreground =
    /^#[\dA-Fa-f]{6}$/.test(background) && contrastRatio(C.ink, background) < 4.5
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
      innerStyle={[ui.button, { minHeight: (style?.minHeight as number) || 52 }]}
    >
      <Text style={[ui.buttonText, { color: foreground }]}>{title}</Text>
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
          focused && { borderColor: C.ink, backgroundColor: '#FFFFFF', ...hardShadow(0, 3) },
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
