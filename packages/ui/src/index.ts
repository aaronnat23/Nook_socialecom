/** Nook design tokens shared by the native app (and anything else that wants the palette). */
export const tokens = {
  colors: {
    /** warm paper the whole app sits on */
    background: '#F8F1E4',
    surface: '#FFFBF3',
    /** interactive ink; filled chips and icons use this */
    primary: '#211A2E',
    primaryDark: '#4A4158',
    lilac: '#CDB8FF',
    text: '#211A2E',
    muted: '#6B6279',
    border: '#E2D6BF',
    ink: '#211A2E',
    ink2: '#4A4158',
    paper: '#F8F1E4',
    paper2: '#F0E6D2',
    paper3: '#E6D9BE',
    card: '#FFFBF3',
    persimmon: '#FF5A36',
    persimmonDeep: '#C23A18',
    butter: '#FFD15C',
    pink: '#FFB5CC',
    mint: '#B7E4C7',
    sky: '#B8DAFF',
    peach: '#FFC9A8',
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radii: { sm: 12, md: 20, lg: 28, pill: 999 },
  motion: { fast: 150, normal: 240 },
} as const;
