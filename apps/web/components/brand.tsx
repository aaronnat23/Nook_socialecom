import type { CSSProperties } from 'react';

/**
 * The Nook mark is a doorway: a dark arch around a little lit niche with
 * something cosy sitting inside it. It is drawn once here and reused for the
 * header, loading state, sign-in dialog and the favicon.
 */
export function NookMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`nook-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 44V22C5 11.5 13.5 4 24 4s19 7.5 19 18v22z" fill="#211a2e" />
      <path
        className="nook-mark-niche"
        d="M13 44V24.5C13 18.7 17.9 14 24 14s11 4.7 11 10.5V44z"
        fill="#ffd15c"
      />
      <circle className="nook-mark-lamp" cx="24" cy="35.5" r="5.5" fill="#ff5a36" />
      <circle cx="22.2" cy="33.6" r="1.4" fill="#fffbf3" opacity="0.85" />
    </svg>
  );
}

export function Logo({
  size = 34,
  className = '',
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`nook-logo ${className}`.trim()} style={style}>
      <NookMark size={size} />
      <span className="nook-wordmark" style={{ fontSize: size * 0.95 }}>
        nook
      </span>
    </span>
  );
}

/** Small decorative doodles used as stickers around the interface. */
export function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M2 8c9-9 14 7 23 0s14 7 23 0 14 7 23 0 14 7 23 0 14 7 24 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Burst({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 2l4.6 11.2L40 9l-4.2 11.4L47 24l-11.2 3.6L40 39l-11.4-4.2L24 46l-4.6-11.2L8 39l4.2-11.4L1 24l11.2-3.6L8 9l11.4 4.2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="42" height="30" viewBox="0 0 42 30" aria-hidden="true">
      <path
        d="M3 5C8 23 25 27 36 18M28 15l8 3-4 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
