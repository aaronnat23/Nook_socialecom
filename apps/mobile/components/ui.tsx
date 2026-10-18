import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '@lilac/ui';
export const C = tokens.colors;
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 35 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#9E85B2',
    fontWeight: '600',
    marginBottom: 10,
  },
  title: { fontSize: 30, color: C.text, fontWeight: '600', letterSpacing: -1.1, lineHeight: 37 },
  subtitle: { fontSize: 12, lineHeight: 20, color: C.muted, marginTop: 10 },
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
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: C.text,
    backgroundColor: '#FFF',
    minHeight: 44,
  },
  label: { fontSize: 11, fontWeight: '500', color: '#8D719F', marginBottom: 7, marginTop: 14 },
  button: {
    backgroundColor: C.primary,
    borderRadius: 8,
    minHeight: 46,
    paddingHorizontal: 17,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
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
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[ui.button, soft && ui.soft, disabled && { opacity: 0.45 }, style]}
    >
      <Text style={[ui.buttonText, soft && ui.softText]}>{title}</Text>
    </TouchableOpacity>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          ui.input,
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
