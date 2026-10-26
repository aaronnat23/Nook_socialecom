import { describe, it, expect } from 'vitest';
import {
  themes,
  validateDocument,
  makeBlock,
  personalizeTemplate,
  variantOptions,
  type Block,
} from '../packages/storefront-schema/src/index';
import {
  resolveStyle,
  resolveHeadingFont,
  moveBlock,
  resolveColumns,
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
  it('offers fourteen templates that differ in structure and style, not just colour', () => {
    const structure = (blocks: Block[]): unknown[] =>
      blocks.map((b) => ({
        type: b.type,
        variant: b.props.variant,
        columns: b.style?.columns,
        mobileColumns: b.responsive?.mobile?.style?.columns,
        children: structure(b.children || []),
      }));
    const layouts = themes.map((t) =>
      JSON.stringify(t.document.sections.map((s) => structure(s.children))),
    );
    expect(themes).toHaveLength(14);
    expect(new Set(layouts).size).toBe(14);
    expect(themes.filter((t) => t.document.sections.length > 1).length).toBeGreaterThanOrEqual(6);
  });
  it('gives every template its own look: type pairing and set of layout variants', () => {
    const looks = themes.map((t) => {
      const variants = new Set<string>();
      const walk = (blocks: Block[]) =>
        blocks.forEach((b) => {
          if (b.props.variant) variants.add(`${b.type}:${b.props.variant}`);
          if (b.children) walk(b.children);
        });
      t.document.sections.forEach((s) => walk(s.children));
      return JSON.stringify([
        t.document.theme.fontHeading,
        t.document.theme.fontBody,
        [...variants].sort(),
      ]);
    });
    expect(new Set(looks).size).toBe(14);
    // no two templates share the same colour palette either
    expect(new Set(themes.map((t) => Object.values(t.document.theme.colors).join())).size).toBe(14);
  });
  it('exercises every layout variant somewhere in the starter templates', () => {
    const used = new Set<string>();
    const walk = (blocks: Block[]) =>
      blocks.forEach((b) => {
        used.add(`${b.type}:${b.props.variant || variantOptions[b.type]?.[0].value}`);
        if (b.children) walk(b.children);
      });
    themes.forEach((t) => t.document.sections.forEach((s) => walk(s.children)));
    const missing = Object.entries(variantOptions).flatMap(([type, options]) =>
      options!.filter((o) => !used.has(`${type}:${o.value}`)).map((o) => `${type}:${o.value}`),
    );
    expect(missing).toEqual([]);
  });
  it('accepts the new style tokens and rejects unknown variants and patterns', () => {
    const d = structuredClone(themes[0].document);
    const hero = d.sections[0].children.find((b) => b.type === 'hero')!;
    hero.props.variant = 'poster';
    Object.assign(hero.style!, {
      pattern: 'checker',
      patternColor: '#112233',
      shape: 'arch',
      gradient: 'candy',
      fontFamily: 'Space Mono',
      aspectRatio: '21:9',
      fontSize: 140,
    });
    expect(validateDocument(d)).toEqual({ valid: true, errors: [] });
    hero.props.variant = 'spinning';
    expect(validateDocument(d).valid).toBe(false);
    hero.props.variant = 'poster';
    Object.assign(hero.style!, { pattern: 'plaid' });
    expect(validateDocument(d).valid).toBe(false);
    Object.assign(hero.style!, { pattern: 'dots', patternColor: 'red' });
    expect(validateDocument(d).valid).toBe(false);
  });
  it('personalizes nested profiles and product spotlights without changing the source', () => {
    const source = structuredClone(themes.find((t) => t.id === 'botanical')!.document);
    const before = JSON.stringify(source);
    const doc = personalizeTemplate(
      source,
      { id: 'shop-local', name: 'My studio', bio: 'Made here.' },
      ['product-local'],
    );
    expect(doc.shopId).toBe('shop-local');
    expect(doc.sections[0].children[0].props.headline).toBe('My studio');
    expect(doc.sections[1].children[0].props.productId).toBe('product-local');
    expect(JSON.stringify(source)).toBe(before);
  });
  it('supports explicit mobile column layouts while stacking default groups', () => {
    const group = makeBlock('columns');
    group.style = { columns: 2 };
    expect(resolveColumns(group, themes[0].document.theme, 390)).toBe(1);
    group.responsive = { mobile: { style: { columns: 2 } } };
    expect(resolveColumns(group, themes[0].document.theme, 390)).toBe(2);
    expect(resolveColumns(group, themes[0].document.theme, 1280)).toBe(2);
  });
});
