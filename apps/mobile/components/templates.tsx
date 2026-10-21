import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { themes, templateDetails, personalizeTemplate } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { Sheet } from './sheet';
import { Storefront } from './storefront';
import { Button, C, ui } from './ui';
import { Reveal } from './motion';
import { font } from './fonts';

type Theme = (typeof themes)[number];
export function TemplateArtwork({
  theme,
  shop,
  products,
}: {
  theme: Theme;
  shop: Shop;
  products: Product[];
}) {
  const [frameWidth, setFrameWidth] = useState(252);
  const published = products.filter((p) => p.status === 'published');
  const document = personalizeTemplate(
    theme.document,
    shop,
    published.map((p) => p.id),
  );
  return (
    <View
      onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      style={{
        height: 260,
        overflow: 'hidden',
        backgroundColor: theme.document.theme.colors.background,
      }}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1000,
          transform: [{ scale: frameWidth / 1000 }],
          transformOrigin: 'left top',
        }}
      >
        <Storefront document={document} shop={shop} products={published} width={1000} thumbnail />
      </View>
    </View>
  );
}

export function TemplateGallery({ shop, products }: { shop: Shop; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const theme = themes.find((t) => t.id === selected);
  const featured = ['minimal-studio', 'dark-editorial', 'botanical', 'y2k-diary'].map(
    (id) => themes.find((t) => t.id === id)!,
  );
  const preview = (id: string) => {
    setSelected(id);
    setOpen(true);
  };
  return (
    <View>
      <View
        style={[
          ui.row,
          {
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 28,
            marginBottom: 18,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={ui.eyebrow}>REDECORATE</Text>
          <Text style={[ui.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
            Try on a new look.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Browse all templates"
          onPress={() => {
            setSelected(null);
            setOpen(true);
          }}
          style={styles.all}
        >
          <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>All 8</Text>
          <Ionicons name="arrow-forward" size={14} color={C.primary} />
        </TouchableOpacity>
      </View>
      <Text style={[ui.muted, { marginBottom: 18 }]}>
        Different layouts. Every block is yours to customize.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={266}
        contentContainerStyle={{ gap: 14, paddingBottom: 12 }}
      >
        {featured.map((t, i) => (
          <Reveal key={t.id} delay={i * 70}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Preview ${t.name} template`}
              onPress={() => preview(t.id)}
              activeOpacity={0.88}
              style={styles.card}
            >
              <TemplateArtwork theme={t} shop={shop} products={products} />
              <View style={styles.caption}>
                <Text style={styles.mood}>{templateDetails[t.id].mood.toUpperCase()}</Text>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.name}>{t.name}</Text>
                  <View style={styles.arrow}>
                    <Ionicons name="arrow-forward" size={16} color={C.primary} />
                  </View>
                </View>
                <Text style={styles.detail}>{t.description}</Text>
                <View style={styles.swatches}>
                  {Object.values(t.document.theme.colors)
                    .slice(0, 4)
                    .map((c, n) => (
                      <View key={n} style={[styles.swatch, { backgroundColor: c }]} />
                    ))}
                  <Text style={styles.preview}>Preview design</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Reveal>
        ))}
      </ScrollView>
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={theme ? theme.name : 'A space for every story.'}
        eyebrow={theme ? 'TEMPLATE PREVIEW' : 'THE TEMPLATE COLLECTION'}
        subtitle={
          theme
            ? templateDetails[theme.id].audience
            : 'Eight distinct looks. Your products, your personality.'
        }
        footer={
          theme ? (
            <View style={{ gap: 10 }}>
              <Button
                title={`Customize ${theme.name} ↗`}
                onPress={() => {
                  setOpen(false);
                  router.push({ pathname: '/editor', params: { template: theme.id } });
                }}
              />
              <Text style={[ui.fine, { textAlign: 'center', marginTop: 0 }]}>
                Choose colors only or a new layout in the editor.
              </Text>
            </View>
          ) : undefined
        }
      >
        <ScrollView
          key={selected || 'gallery'}
          contentContainerStyle={theme ? { paddingBottom: 20 } : ui.content}
          showsVerticalScrollIndicator={false}
        >
          {theme ? (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSelected(null)}
                style={{ padding: 20, flexDirection: 'row', gap: 8, alignItems: 'center' }}
              >
                <Ionicons name="arrow-back" size={16} color={C.primary} />
                <Text style={{ fontSize: 12, color: C.primary }}>All templates</Text>
              </TouchableOpacity>
              <View style={[ui.wrap, { paddingHorizontal: 20, paddingBottom: 20 }]}>
                {templateDetails[theme.id].features.map((f) => (
                  <Text key={f} style={ui.pill}>
                    {f}
                  </Text>
                ))}
              </View>
              <View pointerEvents="none" accessibilityElementsHidden>
                <Storefront
                  document={personalizeTemplate(
                    theme.document,
                    shop,
                    products.filter((p) => p.status === 'published').map((p) => p.id),
                  )}
                  shop={shop}
                  products={products.filter((p) => p.status === 'published')}
                />
              </View>
            </>
          ) : (
            themes.map((t) => (
              <TouchableOpacity
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${t.name} template`}
                onPress={() => setSelected(t.id)}
                style={[ui.card, { padding: 8, overflow: 'hidden' }]}
              >
                <TemplateArtwork theme={t} shop={shop} products={products} />
                <View style={{ padding: 14 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={[ui.muted, { marginTop: 6 }]}>{t.description}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
  },
  card: {
    width: 252,
    borderRadius: 26,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    overflow: 'hidden',
    shadowColor: C.ink,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  art: { overflow: 'hidden' },
  miniNav: {
    height: 35,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniDot: { width: 6, height: 6, borderRadius: 4 },
  miniHero: { marginHorizontal: 13, padding: 16, flex: 1, overflow: 'hidden' },
  caption: { padding: 18 },
  mood: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: C.persimmonDeep,
    marginBottom: 9,
  },
  name: { fontFamily: font.display, fontSize: 22, color: C.ink, letterSpacing: -0.2 },
  detail: { fontSize: 13, lineHeight: 19, color: C.ink2, marginTop: 7, minHeight: 38 },
  arrow: {
    width: 29,
    height: 29,
    borderRadius: 20,
    backgroundColor: C.butter,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatches: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 7, borderWidth: 1, borderColor: '#35214618' },
  preview: { fontSize: 12.5, color: C.ink, marginLeft: 'auto', fontWeight: '700' },
});
