import { describe, it, expect } from 'vitest';
import { themes, validateDocument, makeBlock } from '../packages/storefront-schema/src/index';
import {
  resolveStyle,
  resolveHeadingFont,
  moveBlock,
} from '../packages/storefront-renderer/src/index';
describe('shared storefront contract', () => {
  it.each(themes)('validates $name on both platform contracts', (t) =>
    expect(validateDocument(t.document)).toEqual({ valid: true, errors: [] }),
  );
  it('rejects unsafe links and unknown style properties', () => {
    const d = structuredClone(themes[0].document);
    d.sections[0].children.push({
      ...makeBlock('button'),
      props: { label: 'Unsafe', url: 'javascript:alert(1)' },
    });
    expect(validateDocument(d).valid).toBe(false);
    const bad = structuredClone(themes[0].document);
    Object.assign(bad.sections[0].children[0].style!, { position: 'fixed' });
    expect(validateDocument(bad).valid).toBe(false);
  });
  it('rejects duplicate IDs and HTML', () => {
    const d = structuredClone(themes[0].document);
    d.sections[0].children.push(d.sections[0].children[0]);
    expect(validateDocument(d).valid).toBe(false);
    d.sections[0].children[1].props.headline = '<script>alert(1)</script>';
    expect(validateDocument(d).valid).toBe(false);
  });
  it('resolves the responsive cascade deterministically', () => {
    const t = themes[0].document;
    const b = makeBlock('hero');
    b.style = { fontSize: 48, paddingTop: 40 };
    b.responsive = { tablet: { style: { fontSize: 36 } }, mobile: { style: { fontSize: 24 } } };
    expect(resolveStyle(b, t.theme, 1280).fontSize).toBe(48);
    expect(resolveStyle(b, t.theme, 768).fontSize).toBe(36);
    expect(resolveStyle(b, t.theme, 320).fontSize).toBe(24);
    expect(resolveStyle(b, t.theme, 320).paddingTop).toBe(40);
  });
  it('moves a block without mutating the source', () => {
    const d = themes[0].document;
    const original = d.sections[0].children.map((b) => b.id);
    const n = moveBlock(d, 'products', -1);
    expect(n.sections[0].children[1].id).toBe('products');
    expect(d.sections[0].children.map((b) => b.id)).toEqual(original);
  });
  it('preserves custom heading fonts across theme and responsive fallbacks', () => {
    const theme = { ...themes[0].document.theme, fontHeading: 'Georgia' as const };
    const block = makeBlock('text');
    block.style = {};
    expect(resolveHeadingFont(block, theme, 1280)).toBe('Georgia');
    block.style.fontFamily = 'Arial';
    block.responsive = { mobile: { style: { fontFamily: 'Trebuchet MS' } } };
    expect(resolveHeadingFont(block, theme, 1280)).toBe('Arial');
    expect(resolveHeadingFont(block, theme, 390)).toBe('Trebuchet MS');
    expect(block.style.fontFamily).toBe('Arial');
  });
  it('uses narrow-screen single-column defaults', () => {
    expect(resolveStyle(makeBlock('productGrid'), themes[0].document.theme, 320).columns).toBe(1);
  });
});
