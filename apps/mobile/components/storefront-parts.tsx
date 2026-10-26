import { memo, useState, type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { gradientStops, type Style } from '@lilac/schema';
import type { Product } from '@lilac/api-client';
import { contrastRatio, money } from '@lilac/renderer';
import { ProductCard } from './cards';
import { ProductStage } from './stage';
import { Marquee } from './motion';
import { font as appFont } from './fonts';

type Colors = {
  background: string;
  surface: string;
  text: string;
  accent: string;
  muted: string;
};
type Source = { uri: string; headers?: Record<string, string> };
const ios = Platform.OS === 'ios';
const fill = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const;

/* ------------------------------------------------------------------ fonts */

/**
 * Seller font names to native families. Custom faces ship as one file per weight, so `single`
 * tells the caller to render them with fontWeight 'normal' instead of asking for a faux bold.
 */
export function nativeFont(
  name: string | undefined,
  weight = 400,
): { family?: string; single: boolean } {
  switch (name) {
    case 'Georgia':
      return { family: ios ? 'Georgia' : 'serif', single: false };
    case 'Courier New':
      return { family: ios ? 'CourierNewPSMT' : 'monospace', single: false };
    case 'Arial':
      return { family: ios ? 'Arial' : 'sans-serif', single: false };
    case 'Trebuchet MS':
      return { family: ios ? 'TrebuchetMS' : 'sans-serif', single: false };
    case 'Caprasimo':
      return { family: appFont.display, single: true };
    case 'Caveat':
      return { family: weight >= 600 ? appFont.hand : appFont.handMedium, single: true };
    case 'DM Serif Display':
      return { family: appFont.serif, single: true };
    case 'Archivo Black':
      return { family: appFont.heavy, single: true };
    case 'Space Mono':
      return { family: weight >= 600 ? appFont.monoBold : appFont.mono, single: true };
    default:
      return { single: false };
  }
}
/** fontFamily and fontWeight that belong together for a seller font. */
export function face(
  name: string | undefined,
  weight = 400,
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  const f = nativeFont(name, weight);
  return {
    fontFamily: f.family,
    fontWeight: f.single ? 'normal' : (String(weight) as TextStyle['fontWeight']),
  };
}

/* ---------------------------------------------------------------- helpers */

/** `color` (#RRGGBB) at the given opacity; anything else is returned untouched. */
export function withAlpha(color: string, alpha: number) {
  return /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)
    ? color.slice(0, 7) +
        Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
    : color;
}
/** White or near-black, whichever reads better on `background`. */
export function readableOn(background: string) {
  if (!/^#[0-9a-f]{6}$/i.test(background)) return '#FFFFFF';
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#1B1722', background)
    ? '#FFFFFF'
    : '#1B1722';
}
/** width / height for an aspect-ratio token, or 0 for "auto". */
export function ratioOf(aspect?: string) {
  if (!aspect || aspect === 'auto') return 0;
  const [x, y] = aspect.split(':').map(Number);
  return x > 0 && y > 0 ? x / y : 0;
}
function gradientOf(name?: string) {
  return name && name !== 'none'
    ? (gradientStops as Record<string, [string, string]>)[name] || null
    : null;
}

/* --------------------------------------------------------------- surfaces */

type Band = { colors: [string, string, ...string[]]; locations: [number, number, ...number[]] };
/** Hard-edged repeating bands: `on` px of colour at the start of every `period` px, over `length`. */
function bands(color: string, on: number, period: number, length: number): Band {
  const clear = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)
    ? color.slice(0, 7) + '00'
    : 'transparent';
  const colors: string[] = [];
  const locations: number[] = [];
  const at = (x: number) => Math.min(1, x / length);
  for (let i = 0; i * period < length; i++) {
    const a = at(i * period);
    const b = at(i * period + on);
    const c = at((i + 1) * period);
    colors.push(color, color, clear, clear);
    locations.push(a, b, b, c);
  }
  return {
    colors: colors as Band['colors'],
    locations: locations as Band['locations'],
  };
}
/** A cell size at least `base`, grown so the box holds at most `max` cells. */
function cellFor(w: number, h: number, base: number, max: number) {
  return (w / base) * (h / base) > max ? Math.sqrt((w * h) / max) : base;
}
const PatternFill = memo(function PatternFill({
  pattern,
  color,
  w,
  h,
}: {
  pattern: string;
  color: string;
  w: number;
  h: number;
}) {
  if (w < 1 || h < 1) return null;
  if (pattern === 'stripes') {
    // a square keeps the gradient at exactly 45 degrees; the parent clips the overhang
    const side = Math.max(w, h);
    const line = side * Math.SQRT2;
    const period = Math.max(20, line / 90);
    const b = bands(color, period * 0.4, period, line);
    return (
      <LinearGradient
        {...b}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: (w - side) / 2,
          top: (h - side) / 2,
          width: side,
          height: side,
        }}
      />
    );
  }
  if (pattern === 'grid') {
    const across = bands(color, 1, Math.max(28, w / 100), w);
    const down = bands(color, 1, Math.max(28, h / 100), h);
    return (
      <>
        <LinearGradient {...across} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fill} />
        <LinearGradient {...down} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={fill} />
      </>
    );
  }
  if (pattern === 'dots' || pattern === 'checker') {
    const dots = pattern === 'dots';
    // checker only draws every other square, so it can afford twice the cells
    const cell = dots ? cellFor(w, h, 24, 150) : cellFor(w, h, 32, 300);
    const size = Math.min(8, (4 * cell) / 24);
    const items: ReactNode[] = [];
    for (let r = 0; r * cell < h; r++) {
      for (let c = 0; c * cell < w; c++) {
        if (!dots && (r + c) % 2) continue;
        items.push(
          <View
            key={`${r}_${c}`}
            style={
              dots
                ? {
                    position: 'absolute',
                    left: c * cell + (cell - size) / 2,
                    top: r * cell + (cell - size) / 2,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                  }
                : {
                    position: 'absolute',
                    left: c * cell,
                    top: r * cell,
                    width: cell,
                    height: cell,
                    backgroundColor: color,
                  }
            }
          />,
        );
      }
    }
    return <>{items}</>;
  }
  return null;
});
/** A texture drawn over the surface it sits in. It never takes touches and sits behind content. */
function PatternLayer({
  pattern,
  color,
  radius,
}: {
  pattern?: string;
  color: string;
  radius?: number;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  if (!pattern || pattern === 'none') return null;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[fill, { overflow: 'hidden', borderRadius: radius }]}
    >
      <PatternFill pattern={pattern} color={color} w={box.w} h={box.h} />
    </View>
  );
}
/**
 * A block (or section) background: its colour, a named gradient and a pattern, with `bg` layers
 * (such as a full-bleed photo) and then the content on top.
 */
export function Surface({
  s,
  accent,
  style,
  bg,
  pointerEvents,
  children,
}: {
  s: Style;
  accent: string;
  style: StyleProp<ViewStyle>;
  bg?: ReactNode;
  pointerEvents?: ViewProps['pointerEvents'];
  children?: ReactNode;
}) {
  const stops = gradientOf(s.gradient);
  const layers = (
    <>
      {bg}
      <PatternLayer
        pattern={s.pattern}
        color={s.patternColor || accent + '33'}
        radius={s.borderRadius}
      />
    </>
  );
  return stops ? (
    <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {layers}
      <View pointerEvents={pointerEvents}>{children}</View>
    </LinearGradient>
  ) : (
    <View pointerEvents={pointerEvents} style={style}>
      {layers}
      {children}
    </View>
  );
}

/* ----------------------------------------------------------------- photos */

type Radii = { tl: number; tr: number; br: number; bl: number };
function radiiFor(shape: string, w: number, h: number, base = 0): Radii {
  if (shape === 'arch') {
    const top = Math.min(w / 2, h);
    return { tl: top, tr: top, br: base, bl: base };
  }
  const r = shape === 'pill' ? 999 : shape === 'circle' ? w / 2 : base;
  return { tl: r, tr: r, br: r, bl: r };
}
/**
 * A seller photo cropped by hand (focal point, fit, aspect ratio) into a rectangle, arch, pill or
 * circle. `fill` makes it cover its parent instead; `frame` adds a border and an inner keyline.
 */
export function NativePhoto({
  source,
  alt,
  style: s,
  ratio,
  shape,
  radius,
  fill: cover = false,
  frame,
}: {
  source: Source;
  alt: string;
  style: Style;
  /** width / height; overrides the block's aspect ratio */
  ratio?: number;
  shape?: string;
  radius?: number;
  fill?: boolean;
  frame?: string;
}) {
  const [box, setBox] = useState({ w: 300, h: 0 });
  const [size, setSize] = useState({ width: 1, height: 1 });
  const kind = cover ? 'rect' : shape || s.shape || 'rect';
  const aspect = kind === 'circle' ? 1 : ratio || ratioOf(s.aspectRatio);
  const edge = frame ? 3 : 0;
  const height = cover ? box.h : aspect ? box.w / aspect : s.minHeight || 220;
  const iw = Math.max(1, box.w - edge * 2);
  const ih = Math.max(1, height - edge * 2);
  const scale =
    s.imageFit === 'contain'
      ? Math.min(iw / size.width, ih / size.height)
      : Math.max(iw / size.width, ih / size.height);
  const w = size.width * scale;
  const h = size.height * scale;
  const r = radiiFor(kind, box.w, height, radius ?? s.borderRadius);
  const inset = (n: number) => Math.max(0, n - edge - 6);
  return (
    <View
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[
        cover ? fill : { width: '100%', height },
        {
          overflow: 'hidden',
          borderTopLeftRadius: r.tl,
          borderTopRightRadius: r.tr,
          borderBottomRightRadius: r.br,
          borderBottomLeftRadius: r.bl,
          borderWidth: edge,
          borderColor: frame,
        },
      ]}
    >
      <Image
        accessibilityLabel={alt}
        source={source}
        onLoad={(e) =>
          setSize({
            width: e.nativeEvent.source.width || 1,
            height: e.nativeEvent.source.height || 1,
          })
        }
        style={{
          position: 'absolute',
          width: w,
          height: h,
          left: ((iw - w) * (s.focalX ?? 50)) / 100,
          top: ((ih - h) * (s.focalY ?? 50)) / 100,
        }}
      />
      {frame ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 6,
            top: 6,
            right: 6,
            bottom: 6,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.55)',
            borderTopLeftRadius: inset(r.tl),
            borderTopRightRadius: inset(r.tr),
            borderBottomRightRadius: inset(r.br),
            borderBottomLeftRadius: inset(r.bl),
          }}
        />
      ) : null}
    </View>
  );
}
/** A white instant-photo card with a hand-written caption, tilted a little. */
export function Polaroid({
  source,
  alt,
  caption,
  style: s,
  tilt = -1.5,
  ratio,
  small = false,
}: {
  source: Source;
  alt: string;
  caption?: string;
  style: Style;
  tilt?: number;
  ratio?: number;
  small?: boolean;
}) {
  return (
    <View
      testID="polaroid"
      style={{
        backgroundColor: '#FFFFFF',
        padding: small ? 8 : 12,
        paddingBottom: small ? 34 : 46,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        transform: [{ rotate: `${tilt}deg` }],
        shadowColor: '#302038',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <NativePhoto
        source={source}
        alt={alt}
        style={s}
        shape="rect"
        radius={0}
        ratio={ratio || ratioOf(s.aspectRatio) || 1}
      />
      {caption ? (
        <Text
          numberOfLines={1}
          style={{
            position: 'absolute',
            left: small ? 8 : 12,
            right: small ? 8 : 12,
            bottom: small ? 6 : 10,
            textAlign: 'center',
            fontFamily: appFont.hand,
            fontWeight: 'normal',
            fontSize: small ? 16 : 20,
            lineHeight: small ? 22 : 28,
            color: '#2B2530',
          }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- layouts */

/** Equal-width rows of `cols` cells; short rows are padded so cells keep their width. */
export function GridRows<T>({
  items,
  cols,
  gap,
  rowGap = gap,
  render,
}: {
  items: T[];
  cols: number;
  gap: number;
  rowGap?: number;
  render: (item: T, index: number) => ReactNode;
}) {
  return (
    <View style={{ gap: rowGap }}>
      {Array.from({ length: Math.ceil(items.length / cols) }, (_, row) => {
        const part = items.slice(row * cols, row * cols + cols);
        return (
          <View key={row} style={{ flexDirection: 'row', gap }}>
            {part.map((item, i) => (
              <View key={row * cols + i} style={{ flex: 1, minWidth: 0 }}>
                {render(item, row * cols + i)}
              </View>
            ))}
            {Array.from({ length: cols - part.length }, (_, k) => (
              <View key={`empty_${k}`} style={{ flex: 1 }} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
function Sprockets({ width, color }: { width: number; color: string }) {
  const count = Math.min(120, Math.max(1, Math.ceil(width / 18)));
  const step = width / count;
  return (
    <View style={{ width, height: 22 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * step + (step - 8) / 2,
            top: 6,
            width: 8,
            height: 10,
            borderRadius: 2.5,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
/** Frames in a horizontal strip of dark film with a row of sprocket holes above and below. */
export function Filmstrip({
  images,
  sourceOf,
  style: s,
  holes,
}: {
  images: { imageAssetId: string; alt: string }[];
  sourceOf: (id: string) => Source;
  style: Style;
  /** the page background, showing through the sprocket holes */
  holes: string;
}) {
  const [cw, setCw] = useState(0);
  const frame = Math.max(120, Math.round(cw * 0.72));
  const pad = 14;
  const gap = 12;
  const content = Math.max(
    cw,
    pad * 2 + images.length * frame + Math.max(0, images.length - 1) * gap,
  );
  return (
    <View
      testID="filmstrip"
      onLayout={(e) => setCw(e.nativeEvent.layout.width)}
      style={{ backgroundColor: '#14110F' }}
    >
      {cw > 0 && images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={frame + gap}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          <View style={{ width: content }}>
            <Sprockets width={content} color={holes} />
            <View style={{ flexDirection: 'row', gap, paddingHorizontal: pad, paddingVertical: 2 }}>
              {images.map((im, i) => (
                <View key={`${i}_${im.imageAssetId}`} style={{ width: frame }}>
                  <NativePhoto
                    source={sourceOf(im.imageAssetId)}
                    alt={im.alt}
                    style={s}
                    shape="rect"
                    radius={3}
                    ratio={1.5}
                  />
                </View>
              ))}
            </View>
            <Sprockets width={content} color={holes} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------- products */

const open = (p: Product) => router.push(`/product/${p.slug}`);
/** One large product: its stage with the title and price in a caption row beneath. */
function ProductTile({
  product: p,
  ratio,
  align,
  widthPct,
  colors,
  heading,
  radius,
}: {
  product: Product;
  ratio: number;
  align?: 'flex-start' | 'flex-end';
  widthPct?: `${number}%`;
  colors: Colors;
  heading: TextStyle;
  radius: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${p.title}`}
      onPress={() => open(p)}
      style={{ width: widthPct || '100%', alignSelf: align }}
    >
      <ProductStage
        stage={p.stage}
        image={p.image}
        ratio={ratio}
        style={{ borderRadius: radius }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 12,
        }}
      >
        <Text numberOfLines={2} style={[heading, { flex: 1, fontSize: 18, color: colors.text }]}>
          {p.title}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
          {money(p.price_minor)}
        </Text>
      </View>
    </Pressable>
  );
}
/** The product grid in its non-default arrangements. */
export function ProductLayout({
  variant,
  products,
  colors,
  heading,
  gap,
  width,
  radius,
}: {
  variant: string;
  products: Product[];
  colors: Colors;
  heading: TextStyle;
  gap: number;
  width: number;
  radius: number;
}) {
  const [cw, setCw] = useState(0);
  if (variant === 'list')
    return (
      <View testID="product-list" style={{ marginBottom: 12 }}>
        {products.map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${p.title}`}
            onPress={() => open(p)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 1 : 0,
              borderBottomWidth: 1,
              borderColor: withAlpha(colors.accent, 0.25),
            }}
          >
            <Text style={[heading, { width: 32, fontSize: 17, color: colors.muted }]}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <View style={{ width: 72 }}>
              <ProductStage
                stage={p.stage}
                image={p.image}
                ratio={1}
                style={{ borderRadius: Math.min(radius, 12) }}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[heading, { flex: 1, fontSize: 17, color: colors.text }]}
            >
              {p.title}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>
              {money(p.price_minor)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  if (variant === 'carousel') {
    const card = Math.round(cw * 0.72);
    return (
      <View
        testID="product-carousel"
        onLayout={(e) => setCw(e.nativeEvent.layout.width)}
        style={{ marginBottom: 12 }}
      >
        {cw > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={card + gap}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ gap }}
          >
            {products.map((p) => (
              <View key={p.id} style={{ width: card }}>
                <ProductCard product={p} colors={colors} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }
  if (variant === 'mosaic') {
    const [first, ...rest] = products;
    return (
      <View testID="product-mosaic" style={{ gap: 20, marginBottom: 20 }}>
        {first ? (
          <ProductTile
            product={first}
            ratio={1.25}
            colors={colors}
            heading={heading}
            radius={radius}
          />
        ) : null}
        <GridRows
          items={rest}
          cols={width < 360 ? 1 : 2}
          gap={gap}
          rowGap={20}
          render={(p) => <ProductCard product={p} colors={colors} />}
        />
      </View>
    );
  }
  // lookbook
  return (
    <View testID="product-lookbook" style={{ gap: 28, marginBottom: 20 }}>
      {products.map((p, i) => (
        <ProductTile
          key={p.id}
          product={p}
          ratio={0.8}
          align={i % 2 ? 'flex-end' : 'flex-start'}
          widthPct="86%"
          colors={colors}
          heading={heading}
          radius={radius}
        />
      ))}
    </View>
  );
}
/** One product, big: a square stage, the name in the heading face, the price and a View button. */
export function SpotlightProduct({
  product: p,
  colors,
  heading,
  radius,
  children,
}: {
  product: Product;
  colors: Colors;
  heading: TextStyle;
  radius: number;
  children: ReactNode;
}) {
  return (
    <View testID="spotlight">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${p.title}`}
        onPress={() => open(p)}
      >
        <ProductStage stage={p.stage} image={p.image} ratio={1} style={{ borderRadius: radius }} />
      </Pressable>
      <Text style={[heading, { fontSize: 28, lineHeight: 33, color: colors.text, marginTop: 18 }]}>
        {p.title}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent, marginTop: 6 }}>
        {money(p.price_minor)}
      </Text>
      {children}
    </View>
  );
}
export const openProduct = open;

/* ------------------------------------------------------------ small pieces */

/** One line of announcement text, repeated with sparkles between, scrolling to the left. */
export function AnnouncementMarquee({
  text,
  textStyle,
  animate,
  width,
  bleed,
  radius,
}: {
  text: string;
  textStyle: TextStyle;
  animate: boolean;
  width: number;
  /** negative side margin so the band runs edge to edge through the block's padding */
  bleed: number;
  radius?: number;
}) {
  const fontSize = textStyle.fontSize || 11;
  const unit = Math.max(40, (text.length + 3) * fontSize * 0.62);
  const copies = Math.min(10, Math.max(2, Math.ceil(width / unit) + 1));
  const items = Array.from({ length: copies }, (_, i) => (
    <Text key={i} numberOfLines={1} style={[textStyle, { flexShrink: 0 }]}>
      {text}
      {' ✦ '}
    </Text>
  ));
  const frame: ViewStyle = { marginHorizontal: -bleed, borderRadius: radius, overflow: 'hidden' };
  return (
    <View
      testID="marquee"
      accessible
      accessibilityLabel={text}
      importantForAccessibility="yes"
      style={frame}
    >
      {animate ? (
        <Marquee speed={32}>{items}</Marquee>
      ) : (
        <View style={{ flexDirection: 'row' }}>{items}</View>
      )}
    </View>
  );
}
/** The glyph dividers: a centered row of ornaments in the accent colour. */
export function GlyphDivider({
  variant,
  color,
  rule,
  thickness,
}: {
  variant: string;
  color: string;
  rule: string;
  thickness: number;
}) {
  const glyphs: Record<string, string> = {
    dots: '•   •   •',
    wave: '∿∿∿∿∿∿∿∿∿∿',
    stars: '✦   ✧   ✦',
    ornament: '❦',
  };
  const glyph = glyphs[variant];
  if (!glyph) return null;
  const mark = (
    <Text
      accessible={false}
      numberOfLines={1}
      style={{
        textAlign: 'center',
        color,
        fontSize: variant === 'ornament' ? 22 : 18,
        lineHeight: 28,
      }}
    >
      {glyph}
    </Text>
  );
  return variant === 'ornament' ? (
    <View testID="divider-ornament" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1, height: thickness, backgroundColor: rule }} />
      {mark}
      <View style={{ flex: 1, height: thickness, backgroundColor: rule }} />
    </View>
  ) : (
    <View testID={`divider-${variant}`}>{mark}</View>
  );
}
