import type { Backdrop, BackdropKind, Stage } from '@lilac/schema';

export interface BackdropOption {
  kind: BackdropKind;
  label: string;
  hint: string;
  /** whether the second colour is used */
  twoColours: boolean;
}

/** The scenes a seller can put behind a product. */
export const backdropOptions: BackdropOption[] = [
  { kind: 'color', label: 'Solid', hint: 'One calm colour', twoColours: false },
  { kind: 'gradient', label: 'Glow', hint: 'Colour that melts into another', twoColours: true },
  { kind: 'arch', label: 'Arch', hint: 'A doorway behind it', twoColours: true },
  { kind: 'ribbon', label: 'Ribbon', hint: 'Bands of your own words', twoColours: true },
  { kind: 'stripes', label: 'Stripes', hint: 'Fine diagonal lines', twoColours: true },
  { kind: 'dots', label: 'Dots', hint: 'A polka-dot wall', twoColours: true },
  { kind: 'sunburst', label: 'Sunburst', hint: 'Rays from behind', twoColours: true },
  { kind: 'photo', label: 'Photo', hint: 'Your own scene', twoColours: false },
];

export interface StagePalette {
  name: string;
  a: string;
  b: string;
}

/** Colour pairs that look good together; a = the wall, b = the accent. */
export const stagePalettes: StagePalette[] = [
  { name: 'Lime', a: '#D6F56B', b: '#FFFFFF' },
  { name: 'Lilac', a: '#CDB8FF', b: '#FFFBF3' },
  { name: 'Blush', a: '#FFB5CC', b: '#FFE3EC' },
  { name: 'Butter', a: '#FFD15C', b: '#FFF1C2' },
  { name: 'Mint', a: '#B7E4C7', b: '#E6F6EC' },
  { name: 'Sky', a: '#B8DAFF', b: '#EAF3FF' },
  { name: 'Peach', a: '#FFC9A8', b: '#FFEBDD' },
  { name: 'Persimmon', a: '#FF5A36', b: '#FFD6CC' },
  { name: 'Sage', a: '#A9BBA0', b: '#DCE6D5' },
  { name: 'Cocoa', a: '#6B4A3A', b: '#D9BFAE' },
  { name: 'Paper', a: '#F0E6D2', b: '#FFFBF3' },
  { name: 'Ink', a: '#211A2E', b: '#4A4158' },
];

export function defaultBackdrop(kind: BackdropKind = 'arch'): Backdrop {
  const palette = stagePalettes[1];
  return {
    kind,
    a: palette.a,
    b: palette.b,
    text: kind === 'ribbon' ? 'SMALL SHOPS' : '',
    asset_id: null,
  };
}

export function defaultStage(cutout: string | null = null): Stage {
  return {
    v: 1,
    cutout,
    backdrop: defaultBackdrop('arch'),
    scale: 0.78,
    x: 0,
    y: 0.03,
    outline: false,
    shadow: true,
  };
}

/** Switching kinds keeps the colours the seller already chose, and adds a sensible ribbon text. */
export function withBackdropKind(stage: Stage, kind: BackdropKind): Stage {
  return {
    ...stage,
    backdrop: {
      ...stage.backdrop,
      kind,
      text: kind === 'ribbon' ? stage.backdrop.text || 'SMALL SHOPS' : stage.backdrop.text,
      asset_id: kind === 'photo' ? stage.backdrop.asset_id : null,
    },
  };
}

/** One long line of a ribbon: the words, a star, the words again... */
export function ribbonLine(text: string, repeat = 8) {
  const word = (text || 'NOOK').trim().toUpperCase();
  return Array.from({ length: repeat }, () => word).join('  \u2726  ');
}

export const stageLimits = { scale: [0.35, 1.2], x: [-0.4, 0.4], y: [-0.4, 0.4] } as const;

/** Relative luminance, used to choose readable ink on top of a backdrop colour. */
export function isDark(hex: string): boolean {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] < 0.4;
}
