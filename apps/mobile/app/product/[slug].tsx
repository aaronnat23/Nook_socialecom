import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import type { Product, Variant } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api, origin } from '../../lib';
import { useApp } from '../../components/provider';
import { Text } from '../../components/text';
import { font } from '../../components/fonts';
import { Key, Reveal, RevealScroll } from '../../components/motion';
import { ProductStage } from '../../components/stage';
import { Loading, Panel, Ring, RoundButton, lift, ui, C } from '../../components/ui';

const TABS = ['Description', 'Details', 'Shipping & returns'] as const;
const label = (v: Variant) => Object.values(v.options).join(' / ') || v.sku;

export default function Page() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [p, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Description');
  const { me, requireAuth, refresh, notify } = useApp();
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const [slide, setSlide] = useState(0);
  const pager = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    api<Product>(`/products/${slug}`)
      .then((found) => {
        setProduct(found);
        setVariant(found.variants[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[ui.error, { margin: 22, marginTop: inset.top + 22 }]}>{error}</Text>
      </>
    );
  if (!p)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading />
      </>
    );

  const v = p.variants.find((x) => x.id === variant);
  const staged = !!p.stage?.cutout;
  const slides = staged ? 2 : 1;
  const saved = !!me?.favorites.includes(p.id);
  const unit = v?.price_minor ?? p.price_minor;
  const heroWidth = width - 28;
  const heroHeight = Math.min(heroWidth * 1.14, 560);

  const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setSlide(Math.round(e.nativeEvent.contentOffset.x / heroWidth));

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <RevealScroll
        contentContainerStyle={{ paddingBottom: 150 + inset.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 14, paddingTop: inset.top + 8 }}>
          <Reveal pop from={18}>
            <View
              style={{
                height: heroHeight,
                borderRadius: 34,
                borderWidth: 3,
                borderColor: C.ink,
                overflow: 'hidden',
                backgroundColor: C.paper2,
              }}
            >
              <Animated.ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={slides > 1}
                onMomentumScrollEnd={onPage}
                decelerationRate="fast"
                style={{ width: heroWidth - 6 }}
              >
                <View style={{ width: heroWidth - 6, height: heroHeight - 6 }}>
                  <ProductStage
                    stage={p.stage}
                    image={p.image}
                    ratio={(heroWidth - 6) / (heroHeight - 6)}
                    animate
                    alt={p.title}
                  />
                </View>
                {staged && (
                  <View style={{ width: heroWidth - 6, height: heroHeight - 6 }}>
                    <ProductStage
                      stage={null}
                      image={p.image}
                      ratio={(heroWidth - 6) / (heroHeight - 6)}
                      alt={`${p.title}, original photo`}
                    />
                  </View>
                )}
              </Animated.ScrollView>
              <Ring width={6} opacity={0.7} radius={31} />
            </View>
          </Reveal>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 28,
              right: 28,
              top: inset.top + 22,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <RoundButton icon="arrow-back" label="Back" onPress={() => router.back()} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <RoundButton
                icon="share-outline"
                label="Share this find"
                onPress={() =>
                  void Share.share({
                    message: `${p.title} from ${p.shop_name} on Nook`,
                    url: `${origin}/product/${p.slug}`,
                  })
                }
              />
              <RoundButton
                icon={saved ? 'heart' : 'heart-outline'}
                active={saved}
                label={saved ? `Unsave ${p.title}` : `Save ${p.title}`}
                onPress={async () => {
                  if (!requireAuth()) return;
                  try {
                    await api(`/products/${p.id}/favorite`, { method: saved ? 'DELETE' : 'POST' });
                    await refresh();
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </View>
          </View>
          {slides > 1 && (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: inset.top + 8 + heroHeight - 40,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: 'rgba(33,26,46,0.78)',
                }}
              >
                {Array.from({ length: slides }, (_, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={
                      i === 0 ? 'Show the styled view' : 'Show the original photo'
                    }
                    hitSlop={8}
                    onPress={() => {
                      pager.current?.scrollTo({ x: i * (heroWidth - 6), animated: true });
                      setSlide(i);
                    }}
                  >
                    <Dot active={slide === i} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 22, marginTop: 24 }}>
          <Reveal>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Visit ${p.shop_name}`}
                onPress={() => router.push(`/shop/${p.shop_slug}`)}
                style={styles.shopPill}
              >
                <View style={styles.shopDot}>
                  <Text style={{ fontFamily: font.display, fontSize: 13, color: C.ink }}>
                    {p.shop_name.slice(0, 1)}
                  </Text>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.ink }}>
                  {p.shop_name}
                </Text>
                <Ionicons
                  name="arrow-up-outline"
                  size={13}
                  color={C.ink}
                  style={{ transform: [{ rotate: '45deg' }] }}
                />
              </Pressable>
              <View style={styles.catChip}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.ink }}>
                  {p.category}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontFamily: font.display,
                fontSize: 36,
                lineHeight: 39,
                letterSpacing: -0.7,
                color: C.ink,
                marginTop: 16,
              }}
            >
              {p.title}
            </Text>
            {v && (
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink2, marginTop: 6 }}>
                {label(v)}
              </Text>
            )}
          </Reveal>

          <Reveal style={{ marginTop: 22 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="tablist"
              style={{ marginHorizontal: -22 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}
            >
              {TABS.map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t }}
                  onPress={() => setTab(t)}
                  style={[styles.tab, tab === t && { backgroundColor: C.ink }]}
                >
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: tab === t ? C.paper : C.ink,
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Panel tone={C.card} radius={26} ring={4} style={{ marginTop: 14, padding: 20 }}>
              {tab === 'Description' && (
                <Text style={{ fontSize: 15.5, lineHeight: 24, color: C.ink2 }}>
                  {p.description}
                </Text>
              )}
              {tab === 'Details' &&
                (
                  [
                    ['Shop', p.shop_name],
                    ['Category', p.category],
                    ['Option', v ? label(v) : 'Original'],
                    ['Availability', v && v.stock > 0 ? `${v.stock} in stock` : 'Sold out'],
                  ] as const
                ).map(([k, val], i) => (
                  <View
                    key={k}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 11,
                      borderTopWidth: i ? 1.5 : 0,
                      borderColor: C.border,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: C.muted }}>{k}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{val}</Text>
                  </View>
                ))}
              {tab === 'Shipping & returns' && (
                <View style={{ gap: 16 }}>
                  <Policy
                    icon="car-outline"
                    title="Sent with care, from Malaysia"
                    text={`Domestic flat-rate shipping${p.shipping_minor !== undefined ? ' · ' + money(p.shipping_minor) : ''}. Final quote shown at checkout.`}
                  />
                  <Policy
                    icon="shield-checkmark-outline"
                    title="A little peace of mind"
                    text={p.return_policy || 'See this shop’s return policy at checkout.'}
                  />
                </View>
              )}
            </Panel>
          </Reveal>

          <Reveal style={{ marginTop: 26 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: C.ink }}>
              CHOOSE YOUR FINISH
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 }}>
              {p.variants.map((x) => {
                const on = x.id === variant;
                return (
                  <Pressable
                    key={x.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: x.stock === 0 }}
                    disabled={x.stock === 0}
                    onPress={() => {
                      setVariant(x.id);
                      setQty(1);
                      setAdded(false);
                    }}
                    style={[
                      styles.chip,
                      on && { backgroundColor: C.ink },
                      x.stock === 0 && { opacity: 0.45 },
                    ]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: on ? C.paper : C.ink }}>
                      {label(x)}
                      {x.stock === 0 ? ' · Sold out' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <View style={styles.qty}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  hitSlop={6}
                  onPress={() => setQty(Math.max(1, qty - 1))}
                  style={styles.qtyButton}
                >
                  <Ionicons name="remove" size={18} color={C.ink} />
                </Pressable>
                <Text
                  style={{
                    minWidth: 22,
                    textAlign: 'center',
                    fontSize: 16,
                    fontWeight: '800',
                    color: C.ink,
                  }}
                >
                  {qty}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  accessibilityState={{ disabled: qty >= (v?.stock || 0) }}
                  hitSlop={6}
                  disabled={qty >= (v?.stock || 0)}
                  onPress={() => setQty(qty + 1)}
                  style={[styles.qtyButton, qty >= (v?.stock || 0) && { opacity: 0.35 }]}
                >
                  <Ionicons name="add" size={18} color={C.ink} />
                </Pressable>
              </View>
              <Text style={{ flex: 1, fontSize: 13.5, color: C.muted, lineHeight: 19 }}>
                {v && v.stock > 0
                  ? v.stock <= 4
                    ? `Only ${v.stock} left`
                    : `${v.stock} available`
                  : 'This little find is sold out.'}
              </Text>
            </View>
            <View style={styles.sandbox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.ink} />
              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: C.ink }}>
                Sample catalog · Sandbox checkout. This preview does not charge real money.
              </Text>
            </View>
            {added && (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/cart')}
                style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text
                  style={{
                    fontSize: 14.5,
                    fontWeight: '800',
                    color: C.ink,
                    textDecorationLine: 'underline',
                  }}
                >
                  Take a look at your bag
                </Text>
                <Ionicons name="arrow-forward" size={14} color={C.ink} />
              </Pressable>
            )}
          </Reveal>
        </View>
      </RevealScroll>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(inset.bottom, 12) }}
      >
        <View style={[styles.buyBar, lift(1.4)]}>
          <View style={{ paddingLeft: 12 }}>
            <Text style={{ fontSize: 12, color: C.paper, opacity: 0.7 }}>Price</Text>
            <Text
              style={{ fontFamily: font.display, fontSize: 28, lineHeight: 31, color: C.paper }}
            >
              {money(unit * qty)}
            </Text>
          </View>
          <Key
            accessibilityRole="button"
            accessibilityLabel={added ? 'Added to your bag' : 'Add to bag'}
            accessibilityState={{ disabled: busy || !v || v.stock === 0 }}
            disabled={busy || !v || v.stock === 0}
            color={C.paper}
            borderColor={C.paper}
            borderWidth={0}
            onPress={async () => {
              if (!requireAuth()) return;
              setBusy(true);
              try {
                await api(`/cart/items/${variant}`, {
                  method: 'PUT',
                  body: JSON.stringify({ quantity: qty }),
                });
                setAdded(true);
                notify('A good find, added to your bag.');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            innerStyle={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 7,
              paddingLeft: 22,
              paddingRight: 7,
            }}
          >
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: C.ink }}>
              {!v || v.stock === 0 ? 'Sold out' : busy ? 'Adding…' : added ? 'Added' : 'Add to bag'}
            </Text>
            <View style={styles.cta}>
              <Ionicons name={added ? 'checkmark' : 'bag-handle-outline'} size={19} color={C.ink} />
            </View>
          </Key>
        </View>
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    w.value = withSpring(active ? 1 : 0, { damping: 12, stiffness: 180 });
  }, [active, w]);
  const a = useAnimatedStyle(() => ({
    width: 8 + w.value * 14,
    opacity: 0.45 + w.value * 0.55,
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: C.paper }, a]} />;
}

function Policy({
  icon,
  title,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 13 }}>
      <View style={styles.policyIcon}>
        <Ionicons name={icon} size={18} color={C.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{title}</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: C.ink2, marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
  },
  shopDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.butter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: C.lilac,
  },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.card,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.card,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.card,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sandbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 18,
    padding: 13,
    borderRadius: 18,
    backgroundColor: C.butter,
  },
  policyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingLeft: 14,
    borderRadius: 999,
    backgroundColor: C.ink,
  },
  cta: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.persimmon,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
