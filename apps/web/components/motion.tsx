'use client';
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react';

export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Content that is on screen when it mounts plays its entrance straight away
 * (so server-rendered HTML animates on first paint). Anything further down is
 * held back and revealed as it scrolls into view. Nothing is hidden when
 * JavaScript or motion is off.
 */
export function Reveal({
  children,
  as,
  delay = 0,
  className = '',
  style,
  variant = 'rise',
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  variant?: 'rise' | 'pop' | 'tilt';
}) {
  const Tag = (as || 'div') as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'enter' | 'armed' | 'in'>('enter');
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.92 && box.bottom > 0) return;
    setState('armed');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('in');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} is-${state} ${className}`.trim()}
      style={{ ...style, ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Counts up to a number once it is visible. */
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || value === 0) {
      setShown(value);
      return;
    }
    setShown(0);
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return <span ref={ref}>{shown}</span>;
}

/**
 * Publishes the pointer position over an element as --mx / --my (-1 to 1) and
 * the page scroll offset as --sy, so decorative layers can drift with them.
 */
export function useParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const leave = () => {
      mx = 0;
      my = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    let sRaf = 0;
    const scroll = () => {
      if (sRaf) return;
      sRaf = requestAnimationFrame(() => {
        sRaf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--sy', String(Math.max(-1, Math.min(1, -r.top / 600))));
      });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', scroll, { passive: true });
    scroll();
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', scroll);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(sRaf);
    };
  }, [ref]);
}

/** Splits a headline into words that rise one after another. */
export function Words({
  text,
  start = 0,
  step = 70,
}: {
  text: string;
  start?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="word">
            <span style={{ ['--i' as string]: start + i * step + 'ms' }}>{w}</span>
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
}
