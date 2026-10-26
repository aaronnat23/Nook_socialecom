import { useState, useEffect, useRef, type RefObject } from 'react';
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  Pressable,
  Linking,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { variantOptions, type Document, type Block, type Style } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { resolveStyle, resolveHeadingFont, resolveColumns, variantOf } from '@lilac/renderer';
import { apiBase, authToken, imageUri, api } from '../lib';
import { ProductCard } from './cards';
import { Button, ui } from './ui';
import { Key } from './motion';
import { font as appFont } from './fonts';
import {
  AnnouncementMarquee,
  Filmstrip,
  GlyphDivider,
  GridRows,
  NativePhoto,
  Polaroid,
  ProductLayout,
  SpotlightProduct,
  Surface,
  face,
  nativeFont,
  openProduct,
  ratioOf,
  readableOn,
  withAlpha,
} from './storefront-parts';
function nativeStyle(s: Style): ViewStyle & TextStyle {
  const f = face(s.fontFamily, s.fontWeight || 400);
  return {
    backgroundColor: s.backgroundColor,
    color: s.textColor,
    fontFamily: nativeFont(s.fontFamily, s.fontWeight).family,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight ? f.fontWeight : undefined,
    textAlign: s.textAlign,
    lineHeight: s.fontSize && s.lineHeight ? s.fontSize * s.lineHeight : undefined,
    letterSpacing: s.letterSpacing,
    paddingTop: s.paddingTop,
    paddingBottom: s.paddingBottom,
    paddingLeft: s.paddingLeft ?? 18,
    paddingRight: s.paddingRight ?? 18,
    marginTop: s.marginTop,
    marginBottom: s.marginBottom,
    borderRadius: s.borderRadius,
    borderWidth: s.borderWidth,
    borderColor: s.borderColor,
    minHeight: s.minHeight,
    maxWidth: s.maxWidth,
    width: '100%',
    alignSelf: 'center',
    display: s.visibility === 'hidden' ? 'none' : 'flex',
    shadowColor: '#302038',
    shadowOpacity: s.shadow === 'lifted' ? 0.15 : s.shadow === 'soft' ? 0.08 : 0,
    shadowRadius: s.shadow === 'lifted' ? 15 : 6,
    shadowOffset: { width: 0, height: s.shadow === 'lifted' ? 8 : 3 },
    elevation: s.shadow === 'lifted' ? 8 : s.shadow === 'soft' ? 3 : 0,
  };
}
/** The block's layout variant; an unknown or missing one falls back to the first for its type. */
function variantFor(b: Block) {
  const options = variantOptions[b.type];
  const first = options?.[0]?.value ?? '';
  const v = variantOf(b, first);
  return options?.some((o) => o.value === v) ? v : first;
}
function open(url: string, onAnchor?: (id: string) => void) {
  if (url.startsWith('#')) onAnchor?.(url.slice(1));
  else if (url.startsWith('/')) router.push(url as '/');
  else if (url.startsWith('https://')) void Linking.openURL(url);
}
export function Storefront({
  document,
  shop,
  products,
  width = 390,
  editing = false,
  selected,
  onSelect,
  onAnchor,
  onBlockLayout,
  thumbnail = false,
}: {
  document: Document;
  shop: Shop;
  products: Product[];
  width?: number;
  editing?: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onAnchor?: (id: string) => void;
  onBlockLayout?: (id: string, y: number) => void;
  thumbnail?: boolean;
}) {
  const anchorRoot = useRef<View>(null);
  const [collections, setCollections] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (thumbnail) return;
    api<{ items: { id: string; product_ids: string[] }[] }>(`/shops/${shop.id}/collections`)
      .then((r) => setCollections(Object.fromEntries(r.items.map((c) => [c.id, c.product_ids]))))
      .catch(() => {});
  }, [shop.id, thumbnail]);
  return (
    <View
      ref={anchorRoot}
      style={{ backgroundColor: document.theme.colors.background, width: '100%' }}
    >
      {document.sections.map((section) => (
        <Surface
          key={section.id}
          s={section.style || {}}
          accent={document.theme.colors.accent}
          style={[
            nativeStyle(section.style || {}),
            {
              paddingLeft: section.style?.paddingLeft || 0,
              paddingRight: section.style?.paddingRight || 0,
              maxWidth: section.style?.maxWidth || document.theme.contentWidth,
            },
          ]}
        >
          {[...section.children]
            .sort(
              (a, b) =>
                (resolveStyle(a, document.theme, width).order ?? section.children.indexOf(a)) -
                (resolveStyle(b, document.theme, width).order ?? section.children.indexOf(b)),
            )
            .map((block) => (
              <NativeBlock
                key={block.id}
                {...{
                  block,
                  document,
                  shop,
                  products,
                  width,
                  editing,
                  thumbnail,
                  selected,
                  onSelect,
                  onAnchor,
                  onBlockLayout,
                  collections,
                  anchorRoot,
                }}
              />
            ))}
        </Surface>
      ))}
    </View>
  );
}
function NativeBlock({
  block: b,
  document: d,
  shop,
  products,
  width,
  editing,
  thumbnail,
  selected,
  onSelect,
  onAnchor,
  onBlockLayout,
  collections,
  anchorRoot,
}: {
  block: Block;
  document: Document;
  shop: Shop;
  products: Product[];
  width: number;
  editing: boolean;
  thumbnail: boolean;
  selected?: string;
  onSelect?: (id: string) => void;
  onAnchor?: (id: string) => void;
  onBlockLayout?: (id: string, y: number) => void;
  collections: Record<string, string[]>;
  anchorRoot: RefObject<View | null>;
}) {
  const frame = useRef<View>(null);
  const s = resolveStyle(b, d.theme, width);
  const p = b.props;
  const v = variantFor(b);
  const { colors, radius } = d.theme;
  const accent = colors.accent;
  const headingName = resolveHeadingFont(b, d.theme, width);
  // Text sits in the theme colour unless the seller picked one; a few layouts pick their own.
  const ownText = !!(
    b.style?.textColor ||
    b.responsive?.tablet?.style?.textColor ||
    b.responsive?.mobile?.style?.textColor
  );
  const overlay = b.type === 'hero' && v === 'overlay' && !!p.imageAssetId;
  const banner = b.type === 'profileHeader' && v === 'banner';
  const band = s.backgroundColor || accent;
  const ink = ownText
    ? s.textColor || colors.text
    : banner
      ? readableOn(band)
      : overlay
        ? '#FFFFFF'
        : s.textColor || colors.text;
  const view: ViewStyle & TextStyle = {
    ...nativeStyle(s),
    ...(banner ? { backgroundColor: band } : {}),
    ...(overlay
      ? {
          minHeight: s.minHeight || 420,
          justifyContent: 'flex-end' as const,
          // the photo may bleed to the edges, the words never should
          paddingLeft: Math.max(s.paddingLeft ?? 18, 22),
          paddingRight: Math.max(s.paddingRight ?? 18, 22),
          paddingTop: Math.max(s.paddingTop ?? 0, 20),
          paddingBottom: Math.max(s.paddingBottom ?? 0, 26),
        }
      : {}),
  };
  const textStyle: TextStyle = {
    color: ink,
    ...face(s.fontFamily, s.fontWeight || 400),
    fontSize: s.fontSize || 14,
    textAlign: s.textAlign,
    letterSpacing: s.letterSpacing,
    lineHeight: (s.fontSize || 14) * (s.lineHeight || 1.5),
    textTransform: s.uppercase ? 'uppercase' : undefined,
  };
  const source = (id: string) =>
    editing && !id.startsWith('seed_')
      ? { uri: `${apiBase}/assets/${id}`, headers: { Authorization: `Bearer ${authToken}` } }
      : { uri: imageUri(id) };
  const image = (
    id: string,
    alt: string,
    key?: number,
    more: { ratio?: number; frame?: string } = {},
  ) => <NativePhoto key={key} source={source(id)} alt={alt} style={s} {...more} />;
  const title = (extra?: TextStyle) => {
    const size = s.fontSize || (b.type === 'hero' ? 34 : 24);
    return p.headline ? (
      <Text
        style={[
          textStyle,
          {
            ...face(headingName, s.fontWeight || 500),
            fontSize: size,
            lineHeight: size * (s.lineHeight || 1.15),
            marginBottom: 15,
          },
          extra,
        ]}
      >
        {p.headline}
      </Text>
    ) : null;
  };
  // with a headline, the block's text size belongs to the headline (as on web)
  const bodySize = p.headline ? Math.min(s.fontSize || 15, 16) : s.fontSize || 14;
  const bodyText = (extra?: TextStyle) =>
    p.text ? (
      <Text
        style={[
          textStyle,
          { fontSize: bodySize, lineHeight: bodySize * (s.lineHeight || 1.8) },
          extra,
        ]}
      >
        {p.text}
      </Text>
    ) : null;
  let content: React.ReactNode;
  switch (b.type) {
    case 'profileHeader': {
      const centered = v === 'centered';
      const ring = banner ? { borderWidth: 3, borderColor: '#FFFFFF' } : null;
      const avatarSize = banner || centered ? 64 : 56;
      const align = centered ? 'center' : s.textAlign;
      const name = p.headline || shop.name;
      const nameSize = s.fontSize || (banner ? 32 : v === 'minimal' ? 16 : 23);
      content = (
        <>
          {p.imageAssetId && v !== 'minimal' ? (
            <Image
              source={source(p.imageAssetId)}
              accessibilityLabel={p.alt || shop.name}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                marginBottom: 12,
                alignSelf: align === 'center' ? 'center' : 'flex-start',
                ...ring,
              }}
            />
          ) : null}
          <Text
            style={[
              textStyle,
              {
                ...face(headingName, s.fontWeight || 600),
                textAlign: align,
                fontSize: nameSize,
                lineHeight: nameSize * (s.lineHeight || 1.3),
              },
            ]}
          >
            {name}
          </Text>
          {v !== 'minimal' ? (
            <Text
              style={[
                textStyle,
                { textAlign: align, fontSize: 12, lineHeight: 20, opacity: 0.65, marginTop: 7 },
              ]}
            >
              {p.subtitle || shop.bio}
            </Text>
          ) : null}
        </>
      );
      break;
    }
    case 'hero': {
      const cta = p.cta;
      const subtitle = (extra?: TextStyle) =>
        p.subtitle ? (
          <Text
            style={[
              textStyle,
              { fontSize: 12, lineHeight: 20, opacity: overlay ? 0.9 : 0.7, marginBottom: 20 },
              extra,
            ]}
          >
            {p.subtitle}
          </Text>
        ) : null;
      const button = (extra?: ViewStyle) =>
        cta ? (
          <Button
            title={`${cta.label} ↗`}
            onPress={() => open(cta.url, onAnchor)}
            style={{ backgroundColor: accent, ...extra }}
          />
        ) : null;
      const photo = (more?: { ratio?: number }) =>
        p.imageAssetId ? image(p.imageAssetId, p.alt || '', undefined, more) : null;
      if (v === 'flip')
        content = (
          <>
            {p.imageAssetId ? <View style={{ marginBottom: 20 }}>{photo()}</View> : null}
            {title()}
            {subtitle()}
            {button({ marginTop: 0 })}
          </>
        );
      else if (v === 'centered')
        content = (
          <>
            {title({ textAlign: 'center' })}
            {subtitle({ textAlign: 'center' })}
            {button({ alignSelf: 'center', marginTop: 0, marginBottom: 24 })}
            {photo({ ratio: 16 / 9 })}
          </>
        );
      else if (v === 'overlay')
        content = (
          <>
            {title()}
            {subtitle()}
            {button({ marginTop: 0 })}
          </>
        );
      else if (v === 'poster') {
        const size = s.fontSize ? s.fontSize * 1.25 : 52;
        content = (
          <>
            {p.headline ? (
              <Text
                style={[
                  textStyle,
                  {
                    ...face(headingName, s.fontWeight || 700),
                    fontSize: size,
                    lineHeight: size * 0.95,
                    marginBottom: 18,
                  },
                ]}
              >
                {p.headline}
              </Text>
            ) : null}
            {p.imageAssetId ? (
              <View style={{ width: '60%', alignSelf: 'flex-end', marginBottom: 20 }}>
                {photo({ ratio: ratioOf(s.aspectRatio) || 0.8 })}
              </View>
            ) : null}
            {subtitle()}
            {button({ marginTop: 0 })}
          </>
        );
      } else if (v === 'stack')
        content = (
          <>
            {photo({ ratio: 3 / 4 })}
            <View style={{ marginTop: 26 }}>
              {title({ marginBottom: 18 })}
              {subtitle()}
              {button({ marginTop: 0 })}
            </View>
          </>
        );
      else
        content = (
          <>
            {title()}
            {subtitle()}
            {photo()}
            {button({ marginTop: 20 })}
          </>
        );
      break;
    }
    case 'text': {
      const nodes = p.nodes?.map((n, i) => (
        <Text
          key={i}
          onPress={n.url ? () => open(n.url!, onAnchor) : undefined}
          style={[
            textStyle,
            {
              fontSize: n.type === 'h2' ? 24 : n.type === 'h3' ? 19 : 14,
              ...face(s.fontFamily, n.type === 'bold' ? 700 : 400),
              fontStyle: n.type === 'italic' ? 'italic' : 'normal',
              marginBottom: 10,
            },
          ]}
        >
          {n.type === 'listItem' ? '• ' : ''}
          {n.text}
        </Text>
      ));
      if (v === 'quote') {
        const size = s.fontSize || 26;
        content = (
          <>
            <Text
              accessible={false}
              style={{
                ...face(headingName, 500),
                color: accent,
                fontSize: 72,
                lineHeight: 60,
                marginBottom: -4,
                textAlign: s.textAlign,
              }}
            >
              {'“'}
            </Text>
            {p.headline ? (
              <Text
                style={[
                  textStyle,
                  {
                    ...face(headingName, s.fontWeight || 500),
                    fontStyle: 'italic',
                    fontSize: size,
                    lineHeight: size * (s.lineHeight || 1.3),
                    marginBottom: 14,
                  },
                ]}
              >
                {p.headline}
              </Text>
            ) : null}
            {p.text ? (
              <Text
                style={[
                  textStyle,
                  {
                    fontSize: 11,
                    lineHeight: 18,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    opacity: 0.65,
                  },
                ]}
              >
                {p.text}
              </Text>
            ) : null}
            {nodes}
          </>
        );
      } else if (v === 'note')
        content = (
          <View
            testID="text-note"
            style={{
              marginTop: 12,
              padding: 22,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: withAlpha(ink, 0.25),
              borderRadius: radius,
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                marginLeft: -35,
                width: 70,
                height: 20,
                backgroundColor: withAlpha(accent, 0.4),
                transform: [{ rotate: '-3deg' }],
              }}
            />
            {title()}
            {bodyText()}
            {nodes}
          </View>
        );
      else if (v === 'letter') {
        const size = bodySize;
        const text = (p.text || '').trimStart();
        const [first = ''] = Array.from(text);
        content = (
          <View testID="text-letter" style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            {title({ fontStyle: 'italic', marginBottom: 8 })}
            {text ? (
              <Text
                style={[
                  textStyle,
                  { fontSize: size, lineHeight: size * 1.9, paddingTop: Math.round(size * 0.96) },
                ]}
              >
                <Text style={{ ...face(headingName, 500), fontSize: size * 3.2, color: accent }}>
                  {first}
                </Text>
                {text.slice(first.length)}
              </Text>
            ) : null}
            {nodes}
          </View>
        );
      } else
        content = (
          <>
            {title()}
            {bodyText()}
            {nodes}
          </>
        );
      break;
    }
    case 'announcement': {
      const line: TextStyle = { fontSize: s.fontSize || 11, lineHeight: 18 };
      if (v === 'marquee' && p.text)
        content = (
          <AnnouncementMarquee
            text={p.text}
            textStyle={{ ...textStyle, ...line }}
            animate={!editing && !thumbnail}
            width={width}
            bleed={Math.min(s.paddingLeft ?? 18, s.paddingRight ?? 18)}
            radius={s.borderRadius}
          />
        );
      else if (v === 'pill')
        content = (
          <View
            testID="announcement-pill"
            style={{
              alignSelf: 'center',
              borderWidth: 1.5,
              borderColor: ink,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}
          >
            <Text style={[textStyle, line, { textAlign: 'center' }]}>{p.text}</Text>
          </View>
        );
      else content = <Text style={[textStyle, line]}>{p.text}</Text>;
      break;
    }
    case 'image': {
      const id = p.imageAssetId;
      if (v === 'polaroid' && id)
        content = (
          <Polaroid
            source={source(id)}
            alt={p.alt || ''}
            caption={p.caption || p.alt}
            style={s}
            tilt={-1.5}
          />
        );
      else
        content = (
          <>
            {id ? image(id, p.alt || '', undefined, v === 'framed' ? { frame: ink } : {}) : null}
            {p.caption ? (
              <Text style={[textStyle, { fontSize: 11, marginTop: 8 }]}>{p.caption}</Text>
            ) : null}
          </>
        );
      break;
    }
    case 'gallery': {
      const gap = s.gap || 12;
      const cols = Math.min(s.columns || 2, width < 768 ? 2 : 4);
      const images = p.images || [];
      content = (
        <>
          {title()}
          {v === 'filmstrip' && images.length ? (
            <Filmstrip images={images} sourceOf={source} style={s} holes={colors.background} />
          ) : v === 'polaroid' ? (
            <GridRows
              items={images}
              cols={2}
              gap={gap}
              rowGap={24}
              render={(im, i) => (
                <Polaroid
                  source={source(im.imageAssetId)}
                  alt={im.alt}
                  caption={im.alt}
                  style={s}
                  tilt={i % 2 ? 1.5 : -2}
                  small
                />
              )}
            />
          ) : v === 'masonry' ? (
            <View testID="gallery-masonry" style={{ flexDirection: 'row', gap }}>
              {[0, 1].map((col) => (
                <View key={col} style={{ flex: 1, minWidth: 0, gap }}>
                  {images.map((im, i) =>
                    i % 2 === col
                      ? image(im.imageAssetId, im.alt, i, {
                          ratio: (Math.floor(i / 2) + col) % 2 === 0 ? 3 / 4 : 1,
                        })
                      : null,
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap }}>
              {Array.from({ length: Math.ceil(images.length / cols) }, (_, row) => (
                <View key={row} style={{ flexDirection: 'row', gap }}>
                  {images.slice(row * cols, row * cols + cols).map((im, i) => (
                    <View key={i} style={{ flex: 1, minWidth: 0 }}>
                      {image(im.imageAssetId, im.alt, i)}
                    </View>
                  ))}
                  {Array.from(
                    { length: cols - images.slice(row * cols, row * cols + cols).length },
                    (_, empty) => (
                      <View key={`empty_${empty}`} style={{ flex: 1 }} />
                    ),
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      );
      break;
    }
    case 'productGrid': {
      const ids = p.source === 'collection' ? collections[p.collectionId || ''] : undefined;
      const filtered = ids
        ? products
            .filter((x) => ids.includes(x.id))
            .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        : p.source === 'collection'
          ? []
          : products;
      const sorted = [...filtered]
        .sort(
          p.sort === 'price_asc'
            ? (a, b) => a.price_minor - b.price_minor
            : p.sort === 'price_desc'
              ? (a, b) => b.price_minor - a.price_minor
              : () => 0,
        )
        .slice(0, p.limit || 12);
      const cols = width < 360 ? 1 : Math.min(s.columns || 2, width < 768 ? 2 : 4);
      content = (
        <>
          {title()}
          {v !== 'grid' && sorted.length ? (
            <ProductLayout
              variant={v}
              products={sorted}
              colors={colors}
              heading={{
                ...face(headingName, s.fontWeight || 500),
                letterSpacing: s.letterSpacing,
                textTransform: s.uppercase ? 'uppercase' : undefined,
              }}
              gap={s.gap || 12}
              width={width}
              radius={s.borderRadius ?? radius}
            />
          ) : (
            Array.from({ length: Math.ceil(sorted.length / cols) }, (_, i) => (
              <View style={{ flexDirection: 'row', gap: s.gap || 12, marginBottom: 20 }} key={i}>
                {sorted.slice(i * cols, i * cols + cols).map((product) => (
                  <ProductCard key={product.id} product={product} colors={colors} />
                ))}
                {Array.from(
                  { length: cols - sorted.slice(i * cols, i * cols + cols).length },
                  (_, empty) => (
                    <View key={`empty_${empty}`} style={{ flex: 1 }} />
                  ),
                )}
              </View>
            ))
          )}
          {!products.length && <Text style={textStyle}>Your collection is on its way.</Text>}
        </>
      );
      break;
    }
    case 'featuredProduct': {
      const product = products.find((x) => x.id === p.productId);
      content = (
        <>
          {title()}
          {product && v === 'spotlight' ? (
            <SpotlightProduct
              product={product}
              colors={colors}
              heading={face(headingName, s.fontWeight || 500)}
              radius={s.borderRadius ?? radius}
            >
              <Button
                title="View"
                onPress={() => openProduct(product)}
                style={{ backgroundColor: accent, marginTop: 18 }}
              />
            </SpotlightProduct>
          ) : product ? (
            <ProductCard product={product} colors={colors} />
          ) : (
            <Text style={textStyle}>Choose a featured product.</Text>
          )}
        </>
      );
      break;
    }
    case 'button': {
      const label = p.label || 'Explore';
      const go = () => open(p.url || '#products', onAnchor);
      if (v === 'outline')
        content = (
          <Key
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={go}
            color="transparent"
            borderColor={accent}
            innerStyle={ui.button}
          >
            <Text
              style={[
                ui.buttonText,
                { color: accent, fontFamily: appFont.bold, fontWeight: 'normal' },
              ]}
            >
              {label}
            </Text>
          </Key>
        );
      else if (v === 'link')
        content = (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={label}
            onPress={go}
            hitSlop={8}
            style={{
              alignSelf:
                s.textAlign === 'center'
                  ? 'center'
                  : s.textAlign === 'right'
                    ? 'flex-end'
                    : 'flex-start',
              paddingVertical: 12,
            }}
          >
            <Text
              style={[
                textStyle,
                {
                  ...face(s.fontFamily, 600),
                  color: accent,
                  fontSize: 15,
                  lineHeight: 22,
                  textDecorationLine: 'underline',
                },
              ]}
            >
              {label} ↗
            </Text>
          </Pressable>
        );
      else content = <Button title={label} onPress={go} style={{ backgroundColor: accent }} />;
      break;
    }
    case 'socialLinks': {
      const chips = v === 'chips';
      content = (
        <View style={{ flexDirection: 'row', gap: chips ? 10 : 20, flexWrap: 'wrap' }}>
          {p.links?.map((l, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => open(l.url, onAnchor)}
              style={
                chips
                  ? {
                      borderWidth: 1.5,
                      borderColor: ink,
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }
                  : undefined
              }
            >
              <Text
                style={[
                  textStyle,
                  { fontSize: 12, textDecorationLine: chips ? 'none' : 'underline' },
                  chips && { lineHeight: 18 },
                ]}
              >
                {l.label} ↗
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
      break;
    }
    case 'divider': {
      const rule = s.borderColor || accent + '44';
      const thickness = s.borderWidth || 1;
      content =
        v === 'line' ? (
          <View style={{ height: thickness, backgroundColor: rule }} />
        ) : (
          <GlyphDivider
            variant={v}
            color={s.borderColor || accent}
            rule={rule}
            thickness={thickness}
          />
        );
      break;
    }
    case 'spacer':
      content = <View style={{ height: s.minHeight || 40 }} />;
      break;
    case 'columns': {
      const cols = resolveColumns(b, d.theme, width);
      const children = b.children || [];
      // wide variants make one track of the row twice as wide; only when the group isn't stacked
      const grow = (i: number) =>
        cols >= 2 && ((v === 'wideLeft' && i === 0) || (v === 'wideRight' && i === cols - 1))
          ? 2
          : 1;
      content = (
        <View style={{ gap: s.gap || 16 }}>
          {Array.from({ length: Math.ceil(children.length / cols) }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row', gap: s.gap || 16 }}>
              {children.slice(row * cols, row * cols + cols).map((c, i) => (
                <View key={c.id} style={{ flex: grow(i), minWidth: 0 }}>
                  <NativeBlock
                    key={c.id}
                    {...{
                      block: c,
                      document: d,
                      shop,
                      products,
                      width,
                      editing,
                      thumbnail,
                      selected,
                      onSelect,
                      onAnchor,
                      onBlockLayout,
                      collections,
                      anchorRoot,
                    }}
                  />
                </View>
              ))}
              {Array.from(
                { length: cols - children.slice(row * cols, row * cols + cols).length },
                (_, empty) => (
                  <View
                    key={`empty_${empty}`}
                    style={{
                      flex: grow(children.slice(row * cols, row * cols + cols).length + empty),
                    }}
                  />
                ),
              )}
            </View>
          ))}
        </View>
      );
      break;
    }
    default:
      content = <Text style={textStyle}>Update the app to view this section.</Text>;
  }
  const inner = (
    <Surface
      s={s}
      accent={accent}
      style={view}
      pointerEvents={editing && b.type !== 'columns' ? 'none' : 'auto'}
      bg={
        overlay && p.imageAssetId ? (
          <View
            testID="hero-overlay"
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: s.borderRadius }]}
          >
            <NativePhoto fill source={source(p.imageAssetId)} alt={p.alt || ''} style={s} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.46)' }]} />
          </View>
        ) : null
      }
    >
      {content}
    </Surface>
  );
  return editing ? (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={(event) => {
        event.stopPropagation();
        onSelect?.(b.id);
      }}
      accessibilityLabel={`Edit ${b.type}`}
      style={{ borderWidth: 2, borderColor: selected === b.id ? '#A074C8' : 'transparent' }}
    >
      {inner}
    </TouchableOpacity>
  ) : (
    <View
      ref={frame}
      onLayout={() => {
        if (onBlockLayout && anchorRoot.current)
          frame.current?.measureLayout(
            anchorRoot.current,
            (_x, y) => onBlockLayout(b.id, y),
            () => {},
          );
      }}
    >
      {inner}
    </View>
  );
}
