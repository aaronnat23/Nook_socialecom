import { useState, useEffect, useRef, type RefObject } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import type { Document, Block, Style } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { resolveStyle, resolveHeadingFont, resolveColumns } from '@lilac/renderer';
import { apiBase, authToken, imageUri, api } from '../lib';
import { ProductCard } from './cards';
import { Button, ui } from './ui';
const font = (f?: string) =>
  f === 'Inter'
    ? undefined
    : f === 'Georgia'
      ? Platform.OS === 'ios'
        ? 'Georgia'
        : 'serif'
      : f === 'Courier New'
        ? Platform.OS === 'ios'
          ? 'CourierNewPSMT'
          : 'monospace'
        : f === 'Arial'
          ? Platform.OS === 'ios'
            ? 'Arial'
            : 'sans-serif'
          : f === 'Trebuchet MS'
            ? Platform.OS === 'ios'
              ? 'TrebuchetMS'
              : 'sans-serif'
            : undefined;
function nativeStyle(s: Style): ViewStyle & TextStyle {
  return {
    backgroundColor: s.backgroundColor,
    color: s.textColor,
    fontFamily: font(s.fontFamily),
    fontSize: s.fontSize,
    fontWeight: s.fontWeight ? (String(s.fontWeight) as TextStyle['fontWeight']) : undefined,
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
        <View
          key={section.id}
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
                  selected,
                  onSelect,
                  onAnchor,
                  onBlockLayout,
                  collections,
                  anchorRoot,
                }}
              />
            ))}
        </View>
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
  const view = nativeStyle(s);
  const textStyle: TextStyle = {
    color: s.textColor || d.theme.colors.text,
    fontFamily: font(s.fontFamily),
    fontSize: s.fontSize || 14,
    fontWeight: String(s.fontWeight || 400) as TextStyle['fontWeight'],
    textAlign: s.textAlign,
    letterSpacing: s.letterSpacing,
    lineHeight: (s.fontSize || 14) * (s.lineHeight || 1.5),
    textTransform: s.uppercase ? 'uppercase' : undefined,
  };
  const source = (id: string) =>
    editing && !id.startsWith('seed_')
      ? { uri: `${apiBase}/assets/${id}`, headers: { Authorization: `Bearer ${authToken}` } }
      : { uri: imageUri(id) };
  const image = (id: string, alt: string, key?: number) => (
    <NativePhoto key={key} source={source(id)} alt={alt} style={s} />
  );
  const title = p.headline ? (
    <Text
      style={[
        textStyle,
        {
          fontFamily: font(resolveHeadingFont(b, d.theme, width)),
          fontSize: s.fontSize || (b.type === 'hero' ? 34 : 24),
          lineHeight: (s.fontSize || (b.type === 'hero' ? 34 : 24)) * (s.lineHeight || 1.15),
          marginBottom: 15,
          fontWeight: String(s.fontWeight || 500) as TextStyle['fontWeight'],
        },
      ]}
    >
      {p.headline}
    </Text>
  ) : null;
  let content: React.ReactNode;
  switch (b.type) {
    case 'profileHeader':
      content = (
        <>
          {p.imageAssetId && (
            <Image
              source={source(p.imageAssetId)}
              accessibilityLabel={p.alt || shop.name}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginBottom: 12,
                alignSelf: s.textAlign === 'center' ? 'center' : 'flex-start',
              }}
            />
          )}
          <Text
            style={[
              textStyle,
              {
                fontFamily: font(resolveHeadingFont(b, d.theme, width)),
                fontSize: s.fontSize || 23,
                lineHeight: (s.fontSize || 23) * (s.lineHeight || 1.3),
                fontWeight: String(s.fontWeight || 600) as TextStyle['fontWeight'],
              },
            ]}
          >
            {p.headline || shop.name}
          </Text>
          <Text style={[textStyle, { fontSize: 12, lineHeight: 20, opacity: 0.65, marginTop: 7 }]}>
            {p.subtitle || shop.bio}
          </Text>
        </>
      );
      break;
    case 'hero':
      content = (
        <>
          {title}
          {p.subtitle && (
            <Text
              style={[textStyle, { fontSize: 12, lineHeight: 20, opacity: 0.7, marginBottom: 20 }]}
            >
              {p.subtitle}
            </Text>
          )}
          {p.imageAssetId && image(p.imageAssetId, p.alt || '')}
          {p.cta && (
            <Button
              title={`${p.cta.label} ↗`}
              onPress={() => open(p.cta!.url, onAnchor)}
              style={{ backgroundColor: d.theme.colors.accent, marginTop: 20 }}
            />
          )}
        </>
      );
      break;
    case 'text':
      content = (
        <>
          {title}
          {p.text && (
            <Text
              style={[
                textStyle,
                {
                  fontSize: s.fontSize || 14,
                  lineHeight: (s.fontSize || 14) * (s.lineHeight || 1.8),
                },
              ]}
            >
              {p.text}
            </Text>
          )}
          {p.nodes?.map((n, i) => (
            <Text
              key={i}
              onPress={n.url ? () => open(n.url!, onAnchor) : undefined}
              style={[
                textStyle,
                {
                  fontSize: n.type === 'h2' ? 24 : n.type === 'h3' ? 19 : 14,
                  fontWeight: n.type === 'bold' ? '700' : '400',
                  fontStyle: n.type === 'italic' ? 'italic' : 'normal',
                  marginBottom: 10,
                },
              ]}
            >
              {n.type === 'listItem' ? '• ' : ''}
              {n.text}
            </Text>
          ))}
        </>
      );
      break;
    case 'announcement':
      content = (
        <Text style={[textStyle, { fontSize: s.fontSize || 11, lineHeight: 18 }]}>{p.text}</Text>
      );
      break;
    case 'image':
      content = (
        <>
          {p.imageAssetId && image(p.imageAssetId, p.alt || '')}
          {p.caption && (
            <Text style={[textStyle, { fontSize: 11, marginTop: 8 }]}>{p.caption}</Text>
          )}
        </>
      );
      break;
    case 'gallery': {
      const cols = Math.min(s.columns || 2, width < 768 ? 2 : 4);
      const images = p.images || [];
      content = (
        <>
          {title}
          <View style={{ gap: s.gap || 12 }}>
            {Array.from({ length: Math.ceil(images.length / cols) }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: s.gap || 12 }}>
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
          {title}
          {Array.from({ length: Math.ceil(sorted.length / cols) }, (_, i) => (
            <View style={{ flexDirection: 'row', gap: s.gap || 12, marginBottom: 20 }} key={i}>
              {sorted.slice(i * cols, i * cols + cols).map((product) => (
                <ProductCard key={product.id} product={product} colors={d.theme.colors} />
              ))}
              {Array.from(
                { length: cols - sorted.slice(i * cols, i * cols + cols).length },
                (_, empty) => (
                  <View key={`empty_${empty}`} style={{ flex: 1 }} />
                ),
              )}
            </View>
          ))}
          {!products.length && <Text style={textStyle}>Your collection is on its way.</Text>}
        </>
      );
      break;
    }
    case 'featuredProduct': {
      const product = products.find((x) => x.id === p.productId);
      content = (
        <>
          {title}
          {product ? (
            <ProductCard product={product} colors={d.theme.colors} />
          ) : (
            <Text style={textStyle}>Choose a featured product.</Text>
          )}
        </>
      );
      break;
    }
    case 'button':
      content = (
        <Button
          title={p.label || 'Explore'}
          onPress={() => open(p.url || '#products', onAnchor)}
          style={{ backgroundColor: d.theme.colors.accent }}
        />
      );
      break;
    case 'socialLinks':
      content = (
        <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
          {p.links?.map((l, i) => (
            <TouchableOpacity key={i} onPress={() => open(l.url, onAnchor)}>
              <Text style={[textStyle, { fontSize: 12, textDecorationLine: 'underline' }]}>
                {l.label} ↗
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
      break;
    case 'divider':
      content = (
        <View
          style={{
            height: s.borderWidth || 1,
            backgroundColor: s.borderColor || d.theme.colors.accent + '44',
          }}
        />
      );
      break;
    case 'spacer':
      content = <View style={{ height: s.minHeight || 40 }} />;
      break;
    case 'columns': {
      const cols = resolveColumns(b, d.theme, width);
      const children = b.children || [];
      content = (
        <View style={{ gap: s.gap || 16 }}>
          {Array.from({ length: Math.ceil(children.length / cols) }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row', gap: s.gap || 16 }}>
              {children.slice(row * cols, row * cols + cols).map((c) => (
                <View key={c.id} style={{ flex: 1, minWidth: 0 }}>
                  <NativeBlock
                    key={c.id}
                    {...{
                      block: c,
                      document: d,
                      shop,
                      products,
                      width,
                      editing,
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
                  <View key={`empty_${empty}`} style={{ flex: 1 }} />
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
  const colors =
    s.gradient === 'lilac'
      ? ['#EFE5F9', '#DED0F2']
      : s.gradient === 'sunset'
        ? ['#F9E8D7', '#EBCCDC']
        : s.gradient === 'forest'
          ? ['#EDF2E4', '#CDDBC9']
          : null;
  const inner = colors ? (
    <LinearGradient
      colors={colors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={view}
    >
      <View pointerEvents={editing && b.type !== 'columns' ? 'none' : 'auto'}>{content}</View>
    </LinearGradient>
  ) : (
    <View pointerEvents={editing && b.type !== 'columns' ? 'none' : 'auto'} style={view}>
      {content}
    </View>
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

function NativePhoto({
  source,
  alt,
  style: s,
}: {
  source: { uri: string; headers?: Record<string, string> };
  alt: string;
  style: Style;
}) {
  const [frame, setFrame] = useState(300);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const ratio =
    s.aspectRatio && s.aspectRatio !== 'auto'
      ? Number(s.aspectRatio.split(':')[0]) / Number(s.aspectRatio.split(':')[1])
      : 0;
  const height = ratio ? frame / ratio : s.minHeight || 220;
  const scale =
    s.imageFit === 'contain'
      ? Math.min(frame / size.width, height / size.height)
      : Math.max(frame / size.width, height / size.height);
  const w = size.width * scale;
  const h = size.height * scale;
  return (
    <View
      onLayout={(e) => setFrame(e.nativeEvent.layout.width)}
      style={{ width: '100%', height, borderRadius: s.borderRadius, overflow: 'hidden' }}
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
          left: ((frame - w) * (s.focalX ?? 50)) / 100,
          top: ((height - h) * (s.focalY ?? 50)) / 100,
        }}
      />
    </View>
  );
}
