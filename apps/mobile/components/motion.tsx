import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        if (active) setReduced(true);
      });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

const springy = { damping: 13, stiffness: 150, mass: 0.9 };

/** ScrollView that tells <Reveal> children how far it has scrolled. */
const ScrollContext = createContext<{ y: SharedValue<number>; height: number } | null>(null);

export const RevealScroll = forwardRef<Animated.ScrollView, ScrollViewProps>(function RevealScroll(
  { children, onLayout, ...props },
  ref,
) {
  const y = useSharedValue(0);
  const { height } = useWindowDimensions();
  const handler = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  return (
    <ScrollContext.Provider value={{ y, height }}>
      <Animated.ScrollView
        ref={ref}
        scrollEventThrottle={16}
        {...props}
        onScroll={handler}
        onLayout={onLayout}
      >
        {children}
      </Animated.ScrollView>
    </ScrollContext.Provider>
  );
});

/**
 * Rises into place. Inside a RevealScroll it waits until it scrolls into view; anywhere else it
 * plays on mount after `delay`.
 */
export function Reveal({
  children,
  delay = 0,
  style,
  from = 28,
  pop = false,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  from?: number;
  pop?: boolean;
}) {
  const reduced = useReducedMotion();
  const scroll = useContext(ScrollContext);
  const ref = useRef<View>(null);
  const progress = useSharedValue(0);
  const top = useSharedValue(Infinity);
  const [started, setStarted] = useState(!scroll);

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      progress.value = 1;
      return;
    }
    if (!started) return;
    progress.value = withDelay(
      delay,
      withSpring(1, pop ? { damping: 11, stiffness: 120 } : springy),
    );
  }, [started, reduced, delay, progress, pop]);

  const measure = (_e?: LayoutChangeEvent) => {
    if (!scroll) return;
    // wait a frame so ancestors have settled, then store the position inside the scroll content
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        if (!Number.isFinite(y)) return;
        top.value = y + scroll.y.value + (h ? 0 : 0);
      });
    });
  };

  useAnimatedReaction(
    () => (scroll ? scroll.y.value + scroll.height * 0.94 > top.value + 24 : true),
    (visible, was) => {
      if (visible && !was) scheduleOnRN(setStarted, true);
    },
  );

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    transform: [
      { translateY: (1 - progress.value) * from },
      { scale: pop ? 0.92 + progress.value * 0.08 : 1 },
    ],
  }));
  return (
    <Animated.View ref={ref as never} onLayout={measure} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

/** Gentle looping float. */
export function Bob({
  children,
  amplitude = 8,
  duration = 3000,
  delay = 0,
  style,
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced !== false) return;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(t);
  }, [reduced, duration, delay, t]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -amplitude * t.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Swings back and forth from a pivot `drop` points above its centre, like a hanging sign. */
export function Swing({
  children,
  degrees = 6,
  duration = 2100,
  drop = 30,
  style,
}: {
  children: ReactNode;
  degrees?: number;
  duration?: number;
  drop?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(-1);
  useEffect(() => {
    if (reduced !== false) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [reduced, duration, t]);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: -drop }, { rotate: `${t.value * degrees}deg` }, { translateY: drop }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

export function Spin({
  children,
  duration = 16000,
  style,
}: {
  children: ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (reduced !== false) return;
    r.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [reduced, duration, r]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Pops in with an overshoot a moment after mount. */
export function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const s = useSharedValue(0);
  useEffect(() => {
    if (reduced === null) return;
    s.value = reduced ? 1 : withDelay(delay, withSpring(1, { damping: 8, stiffness: 140 }));
  }, [reduced, delay, s]);
  const a = useAnimatedStyle(() => ({
    opacity: Math.min(1, s.value * 2),
    transform: [{ scale: s.value }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** A band that scrolls endlessly to the left. Pass one set of content; it is repeated to loop. */
export function Marquee({
  children,
  speed = 40,
  style,
}: {
  children: ReactNode;
  speed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (reduced !== false || !width) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-width, { duration: (width / speed) * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [reduced, width, speed, x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Animated.View style={[{ flexDirection: 'row' }, a]}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row' }}
        >
          {children}
        </View>
        <View style={{ flexDirection: 'row' }}>{children}</View>
        <View style={{ flexDirection: 'row' }}>{children}</View>
      </Animated.View>
    </View>
  );
}

/**
 * A flat, outlined pressable that squashes a little under the finger and springs back on release.
 * `color` fills it; `borderColor` outlines it.
 */
export function Key({
  children,
  color,
  borderColor,
  radius = 999,
  borderWidth = 2,
  style,
  innerStyle,
  disabled,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  color: string;
  borderColor: string;
  radius?: number;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.045 }] }));
  return (
    <Animated.View style={[{ opacity: disabled ? 0.45 : 1 }, style, a]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          press.value = reduced ? 1 : withTiming(1, { duration: 80 });
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          press.value = reduced ? 0 : withSpring(0, { damping: 8, stiffness: 240 });
          rest.onPressOut?.(e);
        }}
      >
        <View
          style={[
            {
              backgroundColor: color,
              borderColor,
              borderWidth,
              borderRadius: radius,
              overflow: 'hidden',
            },
            innerStyle,
          ]}
        >
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Quick springy squash used on small tappable things such as hearts and chips. */
export function usePop() {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const pop = () => {
    s.value = withSequence(
      withTiming(0.7, { duration: 70 }),
      withSpring(1, { damping: 5, stiffness: 240 }),
    );
  };
  return { style, pop };
}
