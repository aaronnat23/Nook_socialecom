import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { Stage } from '@lilac/api-client';
import { imageSource } from '../lib';
import { Text } from './text';
import { useReducedMotion } from './motion';
import { C } from './ui';

const RAYS = 24;

/** The patterns that need many small pieces get a fixed budget so a list of cards stays light. */
function Backdrop({
  kind,
  a,
  b,
  text,
  w,
  h,
  animate,
  scene,
  priv,
}: {
  kind: string;
  a: string;
  b: string;
  text: string;
  w: number;
  h: number;
  animate: boolean;
  scene: string | null;
  priv: boolean;
}) {
  if (!w || !h) return null;
  if (kind === 'gradient') {
    return (
      <LinearGradient
        colors={[a, b]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1.1 }}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      />
    );
  }
  if (kind === 'arch') {
    const bw = w * 0.74;
    return (
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
      >
        <View
          style={{
            position: 'absolute',
            left: (w - bw) / 2,
            bottom: 0,
            width: bw,
            height: h * 0.82,
            borderTopLeftRadius: bw / 2,
            borderTopRightRadius: bw / 2,
            backgroundColor: b,
          }}
        />
      </View>
    );
  }
  if (kind === 'stripes') {
    const period = w * 0.086;
    const size = Math.hypot(w, h) * 1.1;
    const count = Math.ceil(size / period);
    return (
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
      >
        <View
          style={{
            position: 'absolute',
            left: (w - size) / 2,
            top: (h - size) / 2,
            width: size,
            height: size,
            transform: [{ rotate: '28deg' }],
          }}
        >
          {Array.from({ length: count }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: i * period + w * 0.074,
                top: 0,
                bottom: 0,
                width: w * 0.012,
                backgroundColor: b,
              }}
            />
          ))}
        </View>
      </View>
    );
  }
  if (kind === 'dots') {
    const gap = w * 0.12;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    const dot = gap * 0.34;
    return (
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: c * gap + gap / 2 - dot / 2 + (r % 2 ? gap / 2 : 0) - gap / 2,
                top: r * gap + gap / 2 - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: b,
              }}
            />
          );
        })}
      </View>
    );
  }
  if (kind === 'sunburst') {
    const cx = w / 2;
    const cy = h * 0.64;
    const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.05;
    const half = Math.tan(((360 / RAYS / 2) * Math.PI) / 180) * reach;
    return (
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
      >
        {Array.from({ length: RAYS / 2 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: cx - half,
              top: cy - reach,
              width: 0,
              height: 0,
              borderLeftWidth: half,
              borderRightWidth: half,
              borderBottomWidth: reach,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: b,
              transformOrigin: '50% 100%',
              transform: [{ rotate: `${i * (720 / RAYS)}deg` }],
            }}
          />
        ))}
      </View>
    );
  }
  if (kind === 'ribbon') {
    return <Ribbons a={a} b={b} text={text} w={w} h={h} animate={animate} />;
  }
  if (kind === 'photo') {
    return (
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: C.paper2,
        }}
      >
        {scene && (
          <Image
            source={imageSource(scene, priv)}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
      </View>
    );
  }
  return (
    <View
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
    />
  );
}

const ROWS = 4;

/** Slanted bands carrying the seller's words, drifting past in opposite directions. */
function Ribbons({
  a,
  b,
  text,
  w,
  h,
  animate,
}: {
  a: string;
  b: string;
  text: string;
  w: number;
  h: number;
  animate: boolean;
}) {
  const word = (text || 'NOOK').trim().toUpperCase();
  const reps = 9;
  const line = useMemo(() => Array.from({ length: reps }, () => `${word}  ✦  `).join(''), [word]);
  const size = Math.hypot(w, h) * 1.15;
  const fontSize = w * 0.043;
  const pad = w * 0.023;
  const gap = w * 0.056;
  const rowH = fontSize + pad * 2;
  const total = ROWS * rowH + (ROWS - 1) * gap;
  return (
    <View
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: a }}
    >
      <View
        style={{
          position: 'absolute',
          left: (w - size) / 2,
          top: (h - total) / 2,
          width: size,
          height: total,
          transform: [{ rotate: '-21deg' }],
        }}
      >
        {Array.from({ length: ROWS }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: i * (rowH + gap),
              height: rowH,
              backgroundColor: b,
              overflow: 'hidden',
            }}
          >
            <Drift
              line={line}
              reps={reps}
              fontSize={fontSize}
              pad={pad}
              animate={animate}
              reverse={i % 2 === 1}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function Drift({
  line,
  reps,
  fontSize,
  pad,
  animate,
  reverse,
}: {
  line: string;
  reps: number;
  fontSize: number;
  pad: number;
  animate: boolean;
  reverse: boolean;
}) {
  const reduced = useReducedMotion();
  const [unit, setUnit] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!animate || reduced !== false || !unit) return;
    x.value = reverse ? -unit : 0;
    x.value = withRepeat(
      withTiming(reverse ? 0 : -unit, { duration: unit * 60, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [animate, reduced, unit, reverse, x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: pad, width: fontSize * 1000 }, a]}>
      <Text
        numberOfLines={1}
        onLayout={(e) => setUnit(e.nativeEvent.layout.width / reps)}
        style={{
          alignSelf: 'flex-start',
          fontSize,
          lineHeight: fontSize * 1.15,
          fontWeight: '800',
          letterSpacing: fontSize * 0.18,
          color: C.ink,
        }}
      >
        {line}
      </Text>
    </Animated.View>
  );
}

/** The cut-out pops onto the stage, then bobs a little, like the web hero. */
function Float({
  enabled,
  rise,
  style,
  children,
}: {
  enabled: boolean;
  rise: number;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(enabled ? 0 : 1);
  const t = useSharedValue(0);
  useEffect(() => {
    if (!enabled || reduced === null) return;
    if (reduced) {
      pop.value = 1;
      return;
    }
    pop.value = withDelay(120, withSpring(1, { damping: 11, stiffness: 110 }));
    t.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => {
      cancelAnimation(t);
    };
  }, [enabled, reduced, pop, t]);
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [
      { translateY: (1 - pop.value) * rise - t.value * rise * 0.35 },
      { scale: 0.9 + pop.value * 0.1 + t.value * 0.02 },
      { rotate: `${(t.value - 0.5) * 1.4}deg` },
    ],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

const DIAGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7, 0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [-0.7, -0.7],
];

/**
 * A product on a stage: the backdrop the seller chose with the cut-out placed on top. Without a
 * stage it just shows the photo, so every product renders the same way everywhere.
 */
export const ProductStage = memo(function ProductStage({
  stage,
  image,
  ratio = 0.8,
  priv = false,
  animate = false,
  alt,
  style,
  children,
}: {
  stage?: Stage | null;
  image: string;
  alt?: string;
  /** width / height */
  ratio?: number;
  priv?: boolean;
  /** play the drifting ribbon text */
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const staged = !!stage?.cutout;
  const w = size.w;
  const h = size.h;
  const bd = stage?.backdrop;
  const scale = stage?.scale ?? 0.78;
  const box = { w: w * scale, h: h * scale };
  const left = w / 2 + (stage?.x ?? 0) * w - box.w / 2;
  const top = h / 2 + (stage?.y ?? 0.03) * h - box.h / 2;
  const edge = w * 0.009;
  const cutoutSource = staged ? imageSource(stage!.cutout!, priv) : null;
  return (
    <View
      accessible={!!alt}
      accessibilityRole={alt ? 'image' : undefined}
      accessibilityLabel={alt}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[
        { width: '100%', aspectRatio: ratio, overflow: 'hidden', backgroundColor: C.paper2 },
        style,
      ]}
    >
      {staged && bd && cutoutSource ? (
        <>
          <Backdrop
            kind={bd.kind}
            a={bd.a}
            b={bd.b}
            text={bd.text}
            w={w}
            h={h}
            animate={animate}
            scene={bd.kind === 'photo' ? bd.asset_id : null}
            priv={priv}
          />
          {w > 0 && (
            <Float
              enabled={animate}
              rise={w * 0.07}
              style={{ position: 'absolute', left, top, width: box.w, height: box.h }}
            >
              {stage!.shadow && (
                <Image
                  source={cutoutSource}
                  resizeMode="contain"
                  blurRadius={Math.max(2, w * 0.02)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: w * 0.026,
                    width: '100%',
                    height: '100%',
                    tintColor: C.ink,
                    opacity: 0.24,
                  }}
                />
              )}
              {stage!.outline &&
                DIAGONAL.map(([dx, dy], i) => (
                  <Image
                    key={i}
                    source={cutoutSource}
                    resizeMode="contain"
                    style={{
                      position: 'absolute',
                      left: dx * edge,
                      top: dy * edge,
                      width: '100%',
                      height: '100%',
                      tintColor: '#FFFFFF',
                    }}
                  />
                ))}
              <Image
                source={cutoutSource}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              />
            </Float>
          )}
        </>
      ) : (
        <Image
          source={imageSource(image, priv)}
          resizeMode="cover"
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
        />
      )}
      {children}
    </View>
  );
});
