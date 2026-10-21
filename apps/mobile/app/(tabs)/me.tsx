import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { themes, type Document } from '@lilac/schema';
import type { Order, Product } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../../lib';
import { AuthGate, useApp } from '../../components/provider';
import { Button, Panel, ui, C } from '../../components/ui';
import { TemplateGallery } from '../../components/templates';
import { Bob, Key, PopIn, Reveal, RevealScroll, useReducedMotion } from '../../components/motion';
import { NookMark } from '../../components/brand';
import { initials } from '../../components/cards';
import { font } from '../../components/fonts';
import { Text } from '../../components/text';

export default function Page() {
  return (
    <AuthGate>
      <Space />
    </AuthGate>
  );
}

/** Blend two #rrggbb colours. t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number) {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[\da-f]{6}$/i.test(a) || !/^#[\da-f]{6}$/i.test(b)) return b;
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const to = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r1, r2)}${to(g1, g2)}${to(b1, b2)}`;
}

function CountUp({ value, style }: { value: number; style?: object }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced !== false || value === 0) {
      setShown(value);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 1000);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
      if (t >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [value, reduced]);
  return <Text style={style}>{shown}</Text>;
}

function Space() {
  const { me, refresh, notify } = useApp();
  const [doc, setDoc] = useState<Document | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<{ document: Document }>(`/shops/${me!.shop.id}/published`)
        .then((r) => {
          if (active) setDoc(r.document);
        })
        .catch(() => {});
      api<{ items: Order[] }>(`/shops/${me!.shop.id}/orders`)
        .then((r) => {
          if (active) setOrders(r.items);
        })
        .catch(() => {});
      api<{ items: Product[] }>(`/shops/${me!.shop.id}/products`)
        .then((r) => {
          if (active) {
            setProducts(r.items);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
      return () => {
        active = false;
      };
    }, [me!.shop.id]),
  );
  const shop = me!.shop;
  const published = products.filter((p) => p.status === 'published');
  const sales = orders
    .filter((o) => ['paid', 'shipped', 'delivered'].includes(o.state))
    .reduce((sum, o) => sum + o.total_minor, 0);
  const template = themes.find((t) => t.id === shop.theme);
  const colors = (doc || template?.document)?.theme.colors;
  const wall = colors ? mix(colors.background, colors.accent, 0.26) : C.lilac;
  const roomText = colors?.text || C.ink;
  const firstName = me!.display_name.split(' ')[0];
  const steps = [
    { title: 'Move in', hint: 'You’re here, so that’s done.', done: true, go: () => {} },
    {
      title: 'Stock the shelves',
      hint: 'Add your first product with a photo and a price.',
      done: published.length > 0,
      go: () => router.push('/products'),
    },
    {
      title: 'Open the door',
      hint: 'Publish your space so visitors can find it.',
      done: !!doc,
      go: () => router.push('/editor'),
    },
    {
      title: 'Meet a neighbour',
      hint: 'Your first follower is a good sign.',
      done: shop.followers > 0,
      go: () => router.push(`/shop/${shop.slug}`),
    },
    {
      title: 'Make a first sale',
      hint: 'Sandbox orders count while you practise.',
      done: orders.length > 0,
      go: () => router.push(`/shop/${shop.slug}`),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);
  return (
    <RevealScroll style={ui.screen} contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Reveal pop from={30}>
          <View>
            <Panel tone={wall} radius={36} ring={6} style={{ padding: 22 }}>
              <Text style={{ fontFamily: font.hand, fontSize: 28, color: roomText }}>
                welcome home, {firstName}
              </Text>
              <View style={{ position: 'absolute', right: 18, top: 20 }}>
                <Bob amplitude={5} duration={3200}>
                  <View
                    style={{
                      width: 104,
                      height: 128,
                      borderTopLeftRadius: 52,
                      borderTopRightRadius: 52,
                      borderBottomLeftRadius: 14,
                      borderBottomRightRadius: 14,
                      borderWidth: 3,
                      borderColor: C.ink,
                      overflow: 'hidden',
                      backgroundColor: C.card,
                      transform: [{ rotate: '3deg' }],
                    }}
                  >
                    <Image
                      source={{ uri: imageUri(shop.cover) }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                </Bob>
              </View>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: C.card,
                  borderWidth: 3,
                  borderColor: C.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                }}
              >
                <Text style={{ fontFamily: font.display, fontSize: 30, color: C.ink }}>
                  {initials(shop.name)}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: font.display,
                  fontSize: 42,
                  lineHeight: 44,
                  letterSpacing: -1,
                  color: roomText,
                  marginTop: 22,
                }}
              >
                {shop.name}
              </Text>
              <Text
                style={{
                  fontSize: 14.5,
                  fontWeight: '600',
                  color: roomText,
                  opacity: 0.8,
                  marginTop: 8,
                }}
              >
                @{me!.handle} · {shop.location}
              </Text>
              <Text style={{ fontSize: 17, lineHeight: 25, color: roomText, marginTop: 18 }}>
                {shop.bio}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                {[shop.category, template ? `${template.name} look` : '', shop.location]
                  .filter(Boolean)
                  .map((chip, i) => (
                    <View
                      key={chip}
                      style={{
                        backgroundColor: C.card,
                        borderWidth: 2,
                        borderColor: C.ink,
                        borderRadius: 20,
                        paddingHorizontal: 13,
                        paddingVertical: 5,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{chip}</Text>
                    </View>
                  ))}
              </View>
              <View style={{ gap: 12, marginTop: 24 }}>
                <Button title="Customize your space ↗" onPress={() => router.push('/editor')} />
                {doc && (
                  <Key
                    accessibilityRole="button"
                    onPress={() => router.push(`/shop/${shop.slug}`)}
                    color={C.card}
                    borderColor={C.ink}
                    innerStyle={{ minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
                      View public space
                    </Text>
                  </Key>
                )}
              </View>
            </Panel>
          </View>
        </Reveal>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 30 }}>
          {[
            {
              label: 'On your shelves',
              value: published.length,
              note: 'products published',
              tone: C.lilac,
              icon: 'cube-outline',
            },
            {
              label: 'Neighbours',
              value: shop.followers,
              note: 'people following you',
              tone: C.butter,
              icon: 'people-outline',
            },
            {
              label: 'Shop orders',
              value: orders.length,
              note: 'sandbox orders only',
              tone: C.pink,
              icon: 'receipt-outline',
            },
            {
              label: 'Sandbox sales',
              text: money(sales),
              note: 'no real money collected',
              tone: C.mint,
              icon: 'heart-outline',
            },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 70} pop style={{ width: '47.6%' }}>
              <Panel
                tone={s.tone}
                radius={30}
                ring={5}
                style={{ flex: 1, padding: 16, minHeight: 176 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={s.icon as 'cube-outline'} size={19} color={C.ink} />
                </View>
                {'value' in s && s.value !== undefined ? (
                  <CountUp
                    value={s.value}
                    style={{ fontFamily: font.display, fontSize: 42, color: C.ink, marginTop: 14 }}
                  />
                ) : (
                  <Text
                    style={{ fontFamily: font.display, fontSize: 32, color: C.ink, marginTop: 18 }}
                  >
                    {s.text}
                  </Text>
                )}
                <Text
                  style={{ fontFamily: font.display, fontSize: 17, color: C.ink, marginTop: 2 }}
                >
                  {s.label}
                </Text>
                <Text style={{ fontSize: 12.5, color: C.ink, opacity: 0.75, marginTop: 4 }}>
                  {s.note}
                </Text>
              </Panel>
            </Reveal>
          ))}
        </View>

        <View style={[ui.row, { marginTop: 28 }]}>
          <Key
            accessibilityRole="button"
            accessibilityLabel="Your products"
            onPress={() => router.push('/products')}
            color={C.card}
            borderColor={C.ink}
            radius={22}
            style={{ flex: 1 }}
            innerStyle={{ padding: 16 }}
          >
            <Ionicons name="cube-outline" color={C.ink} size={22} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 10 }}>
              Your products
            </Text>
            <Text style={[ui.muted, { fontSize: 13, marginTop: 2 }]}>
              {products.length} in your collection
            </Text>
          </Key>
          <Key
            accessibilityRole="button"
            accessibilityLabel="Shop orders"
            onPress={() => router.push('/orders?seller=1')}
            color={C.card}
            borderColor={C.ink}
            radius={22}
            style={{ flex: 1 }}
            innerStyle={{ padding: 16 }}
          >
            <Ionicons name="receipt-outline" color={C.ink} size={22} />
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 10 }}>
              Shop orders
            </Text>
            <Text style={[ui.muted, { fontSize: 13, marginTop: 2 }]}>Manage your orders</Text>
          </Key>
        </View>

        {me!.seller_enabled ? (
          <Reveal pop style={{ marginTop: 40 }}>
            <View style={[ui.card, { padding: 22, marginBottom: 0 }]}>
              <Text style={ui.eyebrow}>FURNISH YOUR NOOK</Text>
              <Text
                style={{ fontFamily: font.display, fontSize: 31, lineHeight: 36, color: C.ink }}
              >
                {next === -1
                  ? 'Fully '
                  : `${steps.length - doneCount} little ${steps.length - doneCount === 1 ? 'step' : 'steps'} to `}
                <Text
                  style={{ backgroundColor: C.butter }}
                >{`\u00A0${next === -1 ? 'furnished.' : 'go.'}\u00A0`}</Text>
              </Text>
              <Progress value={doneCount / steps.length} />
              <View style={{ gap: 6, marginTop: 18 }}>
                {steps.map((s, i) => (
                  <View
                    key={s.title}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: i === next ? C.ink : 'transparent',
                      backgroundColor: i === next ? '#FFF0C4' : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: C.ink,
                        backgroundColor: s.done ? C.mint : C.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.done && (
                        <PopIn>
                          <Ionicons name="checkmark" size={16} color={C.ink} />
                        </PopIn>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: C.ink,
                          opacity: s.done ? 0.6 : 1,
                        }}
                      >
                        {s.title}
                      </Text>
                      <Text style={{ fontSize: 13.5, color: C.ink2, marginTop: 1 }}>{s.hint}</Text>
                    </View>
                    {i === next && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Do this next: ${s.title}`}
                        onPress={s.go}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: C.persimmon,
                          borderWidth: 2,
                          borderColor: C.ink,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="arrow-forward" size={17} color={C.ink} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Reveal>
        ) : (
          <Reveal pop style={{ marginTop: 40 }}>
            <View style={[ui.card, { marginBottom: 0, alignItems: 'flex-start' }]}>
              <NookMark size={52} />
              <Text style={[ui.sectionTitle, { marginTop: 14 }]}>Your space could be a shop.</Text>
              <Text style={ui.muted}>
                Enable sandbox selling to try products and test orders. Live payments remain
                disabled.
              </Text>
              <Button
                title="Accept sandbox seller terms & enable"
                style={{ marginTop: 18 }}
                onPress={async () => {
                  try {
                    await api('/me/seller-onboarding', {
                      method: 'POST',
                      body: JSON.stringify({ accepted_terms: true }),
                    });
                    await refresh();
                    notify(
                      'Sandbox selling enabled. Review legal and provider requirements before a live launch.',
                    );
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </View>
          </Reveal>
        )}
        <TemplateGallery shop={shop} products={products} />
        {error ? <Text style={ui.error}>{error}</Text> : null}
        <Reveal>
          <Text style={ui.eyebrow}>AS THE WORLD SEES IT</Text>
          <Text style={{ fontFamily: font.display, fontSize: 34, lineHeight: 40, color: C.ink }}>
            Your published <Text style={{ backgroundColor: C.butter }}>{'\u00A0nook.\u00A0'}</Text>
          </Text>
        </Reveal>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        {doc ? (
          <Reveal pop>
            <View style={{ paddingBottom: 5, paddingRight: 4 }}>
              <View
                style={{
                  position: 'absolute',
                  left: 4,
                  right: 0,
                  top: 5,
                  bottom: 0,
                  borderRadius: 26,
                  backgroundColor: C.ink,
                }}
              />
              <View
                style={{
                  backgroundColor: C.card,
                  borderWidth: 3,
                  borderColor: C.ink,
                  borderRadius: 26,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 11,
                    backgroundColor: C.paper2,
                    borderBottomWidth: 3,
                    borderColor: C.ink,
                  }}
                >
                  {[C.persimmon, C.butter, C.mint].map((c) => (
                    <View
                      key={c}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: c,
                        borderWidth: 2,
                        borderColor: C.ink,
                      }}
                    />
                  ))}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: C.card,
                      borderWidth: 2,
                      borderColor: C.ink,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12.5, fontWeight: '600', color: C.ink }}
                    >
                      <Text style={{ fontFamily: font.display, color: C.persimmonDeep }}>
                        nook{' '}
                      </Text>
                      / {shop.slug}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View your published space"
                  onPress={() => router.push(`/shop/${shop.slug}`)}
                  style={[ui.row, { padding: 14 }]}
                >
                  <Image
                    source={{ uri: imageUri(shop.cover) }}
                    style={{ width: 72, height: 85, borderRadius: 15 }}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1FA862' }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          color: C.ink2,
                          letterSpacing: 1.2,
                          fontWeight: '800',
                        }}
                      >
                        LIVE STOREFRONT
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>
                      {shop.name}
                    </Text>
                    <Text style={[ui.muted, { fontSize: 13, marginTop: 3 }]}>
                      {shop.followers} followers · View your space
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={C.ink} />
                </Pressable>
              </View>
            </View>
          </Reveal>
        ) : (
          <View style={ui.empty}>
            <NookMark size={52} />
            <Text style={ui.muted}>Choose a look and publish your first little corner.</Text>
          </View>
        )}
        <View style={{ marginTop: 26 }}>
          <Button title="Your purchases →" soft onPress={() => router.push('/orders')} />
          <Text style={[ui.fine, { textAlign: 'center' }]}>SAMPLE CATALOG · SANDBOX PREVIEW</Text>
        </View>
      </View>
    </RevealScroll>
  );
}

function Progress({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = reduced
      ? value
      : withDelay(400, withTiming(value, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      style={{
        height: 18,
        borderRadius: 9,
        marginTop: 18,
        backgroundColor: C.paper3,
        borderWidth: 2,
        borderColor: C.ink,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { height: '100%', backgroundColor: C.persimmon, borderRightWidth: 2, borderColor: C.ink },
          fill,
        ]}
      />
    </View>
  );
}
