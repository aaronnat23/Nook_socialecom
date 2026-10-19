import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { themes, templateDetails } from '@lilac/schema';
import type { Product, Shop } from '@lilac/api-client';
import { imageUri } from '../lib';
import { Sheet } from './sheet';
import { Storefront } from './storefront';
import { Button, C, ui } from './ui';
import { Reveal } from './motion';

type Theme = (typeof themes)[number];
export function TemplateArtwork({ theme, compact = false }: { theme: Theme; compact?: boolean }) {
  const { colors, fontHeading } = theme.document.theme;
  const hero = theme.document.sections.flatMap((s) => s.children).find((b) => b.type === 'hero')!;
  const dark = theme.id === 'dark-editorial';
  const bold = theme.id === 'streetwear-drop';
  return (
    <View
      style={[styles.art, { backgroundColor: colors.background, height: compact ? 195 : 244 }]}
      pointerEvents="none"
      accessibilityElementsHidden
    >
      <View style={styles.miniNav}>
        <Text style={{ color: colors.text, fontSize: 9, fontWeight: '600' }}>
          {theme.name.toLowerCase()}.
        </Text>
        <View style={[styles.miniDot, { backgroundColor: colors.accent }]} />
      </View>
      <View
        style={[
          styles.miniHero,
          {
            backgroundColor: hero.style?.backgroundColor || colors.surface,
            borderRadius: Math.min(theme.document.theme.radius, 18),
          },
        ]}
      >
        <Text
          numberOfLines={5}
          style={{
            color: colors.text,
            fontFamily: fontHeading === 'Georgia' ? 'Georgia' : undefined,
            fontWeight: bold ? '800' : '500',
            fontSize: compact ? 17 : 20,
            letterSpacing: -0.6,
            lineHeight: compact ? 20 : 23,
            maxWidth: '56%',
          }}
        >
          {hero.props.headline}
        </Text>
        <Image
          source={{ uri: imageUri(templateDetails[theme.id].cover) }}
          style={{
            width: '34%',
            height: compact ? 85 : 112,
            borderRadius: theme.document.theme.radius ? 14 : 0,
            position: 'absolute',
            right: 11,
            bottom: 14,
            opacity: dark ? 0.85 : 1,
          }}
        />
        <View
          style={{
            backgroundColor: colors.accent,
            width: 42,
            height: 5,
            borderRadius: 3,
            marginTop: 15,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 10 }}>
        {[0, 1, 2].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: compact ? 32 : 41,
              borderRadius: Math.min(theme.document.theme.radius, 8),
              backgroundColor: colors.accent + '18',
              borderTopWidth: 2,
              borderColor: colors.accent + '40',
            }}
          />
        ))}
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
          <Text style={ui.eyebrow}>A LITTLE INSPIRATION</Text>
          <Text style={[ui.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
            Find your kind of space.
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
          <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }}>All 8</Text>
          <Ionicons name="arrow-forward" size={14} color={C.primary} />
        </TouchableOpacity>
      </View>
      <Text style={[ui.muted, { marginBottom: 18 }]}>
        Beautiful starting points. Make every detail yours.
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
              <TemplateArtwork theme={t} />
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
                  document={theme.document}
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
                <TemplateArtwork theme={t} />
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
    backgroundColor: '#EEE7F8',
  },
  card: {
    width: 252,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E7DDF1',
    overflow: 'hidden',
    shadowColor: '#4C2A70',
    shadowOpacity: 0.045,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
  mood: { fontSize: 8, fontWeight: '700', letterSpacing: 1.3, color: '#7D618F', marginBottom: 9 },
  name: { fontSize: 18, fontWeight: '600', color: C.text, letterSpacing: -0.4 },
  detail: { fontSize: 11, lineHeight: 18, color: C.muted, marginTop: 7, minHeight: 36 },
  arrow: {
    width: 29,
    height: 29,
    borderRadius: 20,
    backgroundColor: '#F3EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatches: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 7, borderWidth: 1, borderColor: '#35214618' },
  preview: { fontSize: 10, color: C.primary, marginLeft: 'auto', fontWeight: '500' },
});
