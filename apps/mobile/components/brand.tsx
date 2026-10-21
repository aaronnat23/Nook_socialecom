import { View } from 'react-native';
import { Text } from './text';
import { font } from './fonts';
import { tokens } from '@lilac/ui';

const C = tokens.colors;

/** The Nook mark: a doorway with a little lit niche and something cosy sitting in it. */
export function NookMark({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  const w = size * 0.8;
  const h = size * 0.92;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          width: w,
          height: h,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          backgroundColor: onDark ? C.paper : C.ink,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            width: size * 0.46,
            height: size * 0.62,
            borderTopLeftRadius: size * 0.23,
            borderTopRightRadius: size * 0.23,
            backgroundColor: C.butter,
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              width: size * 0.23,
              height: size * 0.23,
              borderRadius: size * 0.115,
              backgroundColor: C.persimmon,
              marginBottom: size * 0.146,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Nook"
      style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.26 }}
    >
      <NookMark size={size} />
      <Text
        style={{
          fontFamily: font.display,
          fontSize: size * 0.95,
          lineHeight: size * 1.1,
          letterSpacing: -size * 0.03,
          color: C.ink,
          paddingBottom: size * 0.06,
        }}
      >
        nook
      </Text>
    </View>
  );
}
