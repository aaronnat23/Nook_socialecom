import { createContext, useContext } from 'react';
import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { font } from './fonts';

const families = new Set<string>(Object.values(font));
/** True inside another Text, where an unstyled child should inherit the parent's font. */
const Nested = createContext(false);

function familyFor(weight: unknown) {
  const n =
    typeof weight === 'number'
      ? weight
      : weight === 'bold'
        ? 700
        : weight === 'normal' || weight === undefined
          ? 400
          : parseInt(String(weight), 10) || 400;
  if (n >= 800) return font.extra;
  if (n >= 700) return font.bold;
  if (n >= 600) return font.semibold;
  if (n >= 500) return font.medium;
  return font.body;
}

/**
 * Drop-in Text that maps fontWeight onto the right Bricolage Grotesque file (custom fonts on
 * native are one family per weight). A style with its own fontFamily, like a seller's chosen
 * storefront font, is passed through untouched, and nested text without its own font settings
 * inherits from the text around it.
 */
export function Text({ style, children, ...rest }: TextProps) {
  const nested = useContext(Nested);
  const flat = StyleSheet.flatten(style) || {};
  const own = flat.fontFamily;
  const passthrough =
    (own && !families.has(own)) || (nested && !own && flat.fontWeight === undefined);
  return (
    <Nested.Provider value>
      <RNText
        {...rest}
        style={
          passthrough
            ? style
            : [style, { fontFamily: own || familyFor(flat.fontWeight), fontWeight: 'normal' }]
        }
      >
        {children}
      </RNText>
    </Nested.Provider>
  );
}
