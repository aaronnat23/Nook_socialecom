import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product, Shop } from '@lilac/api-client';
import { api, imageUri } from '../../lib';
import { ProductCard, ShopCard, SHOP_CARD_WIDTH, initials } from '../../components/cards';
import { NookMark } from '../../components/brand';
import { font } from '../../components/fonts';
import {
  Bob,
  Key,
  Marquee,
  PopIn,
  Reveal,
  RevealScroll,
  Spin,
  Swing,
} from '../../components/motion';
import { Text } from '../../components/text';
import { Loading, hardShadow, ui, C } from '../../components/ui';

const ticker = [
  'Small shops',
  'Big personality',
  'Made by real people',
  'Decorate it your way',
  'Your corner of the internet',
  'Come on in',
];

export default function Discover() {
  const scroll = useRef<ScrollView>(null);
  const findsY = useRef(0);
  const [data, setData] = useState<{
    products: Product[];
    shops: Shop[];
    categories: string[];
  } | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All finds');
  const [results, setResults] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = () =>
    api<NonNullable<typeof data>>('/discover')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!query && category === 'All finds') {
      setResults(null);
      return;
    }
    const timer = setTimeout(
      () =>
        api<{ items: Product[] }>(
          `/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`,
        )
          .then((r) => setResults(r.items))
          .catch((e) => setError(e.message)),
      350,
    );
    return () => clearTimeout(timer);
  }, [query, category]);
  if (!data && !error) return <Loading />;
  const products = results || data?.products || [];
  const searching = query.length > 0;
  return (
    <RevealScroll
      ref={scroll as never}
      style={ui.screen}
      contentContainerStyle={{ paddingBottom: 130 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={C.ink}
        />
      }
    >
      {error ? <Text style={[ui.error, { marginHorizontal: 20 }]}>{error}</Text> : null}
      <View style={{ paddingHorizontal: 20 }}>
        <FieldSearch value={query} onChange={setQuery} />
      </View>
      {!searching && (
        <>
          <Hero
            shops={data?.shops || []}
            productCount={data?.products.length || 0}
            onBrowse={() => scroll.current?.scrollTo({ y: findsY.current, animated: true })}
          />
          <Ticker />
          <View style={{ paddingHorizontal: 20, marginTop: 56 }}>
            <Reveal>
              <Text style={ui.eyebrow}>MEET THE NEIGHBOURS</Text>
              <Text style={styles.h2}>
                Every nook has <Text style={styles.hl}>{'\u00A0someone\u00A0'}</Text> in it.
              </Text>
              <Text style={[ui.subtitle, { marginTop: 12 }]}>
                Peek through the doorway. Each shop decorates its own corner, so no two look alike.
              </Text>
            </Reveal>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SHOP_CARD_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={{
              gap: 16,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 18,
            }}
          >
            {data?.shops.map((s, i) => (
              <ShopCard key={s.id} shop={s} index={i} />
            ))}
          </ScrollView>
          <HowItWorks />
        </>
      )}
      <View
        style={{ paddingHorizontal: 20, marginTop: searching ? 24 : 56 }}
        onLayout={(e) => {
          findsY.current = e.nativeEvent.layout.y;
        }}
      >
        <Reveal>
          <Text style={ui.eyebrow}>{searching ? 'WHAT TURNED UP' : 'FRESH ON THE SHELVES'}</Text>
          <Text style={styles.h2}>
            {searching ? (
              <>
                {products.length} little{' '}
                <Text
                  style={styles.hl}
                >{`\u00A0${products.length === 1 ? 'find' : 'finds'}\u00A0`}</Text>
                .
              </>
            ) : (
              <>
                Little things worth <Text style={styles.hl}>{'\u00A0keeping\u00A0'}</Text>.
              </>
            )}
          </Text>
        </Reveal>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 9, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}
      >
        {data?.categories.map((c) => (
          <Key
            key={c}
            onPress={() => setCategory(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: c === category }}
            color={c === category ? C.ink : C.card}
            borderColor={C.ink}
            shadowColor={c === category ? C.persimmon : C.ink}
            depth={2}
            innerStyle={{ paddingVertical: 9, paddingHorizontal: 16 }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: '700', color: c === category ? C.paper : C.ink }}
            >
              {c}
            </Text>
          </Key>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
        {Array.from({ length: Math.ceil(products.length / 2) }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 16, marginBottom: 30 }}>
            <ProductCard product={products[i * 2]} index={i * 2} />
            {products[i * 2 + 1] ? (
              <ProductCard product={products[i * 2 + 1]} index={i * 2 + 1} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        ))}
        {products.length === 0 && (
          <View style={ui.empty}>
            <NookMark size={54} />
            <Text style={styles.emptyTitle}>Nothing on this shelf just yet.</Text>
            <Text style={ui.muted}>Try another search or category.</Text>
          </View>
        )}
        <Text style={[ui.fine, { textAlign: 'center', fontWeight: '600' }]}>
          Every find has a person behind it. Thanks for shopping small.
        </Text>
      </View>
      {!searching && <Finale />}
      <Text style={[ui.fine, { textAlign: 'center', marginTop: 8 }]}>
        SAMPLE CATALOG · SANDBOX PREVIEW
      </Text>
    </RevealScroll>
  );
}

function Hero({
  shops,
  productCount,
  onBrowse,
}: {
  shops: Shop[];
  productCount: number;
  onBrowse: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
      <Reveal pop>
        <View style={styles.pill}>
          <View style={styles.liveDot} />
          <Text style={{ fontSize: 13.5, color: C.ink }}>
            <Text style={{ fontWeight: '800' }}>{shops.length} nooks</Text> open right now
          </Text>
        </View>
      </Reveal>
      <View style={{ marginTop: 24 }}>
        <Reveal delay={80} from={46}>
          <Text style={styles.h1}>Every shop</Text>
        </Reveal>
        <Reveal delay={170} from={46}>
          <Text style={styles.h1}>deserves a</Text>
        </Reveal>
        <Reveal delay={300} pop>
          <Text style={[styles.h1, styles.nook]}>nook.</Text>
        </Reveal>
      </View>
      <Reveal delay={420}>
        <Text style={[ui.subtitle, { fontSize: 17, lineHeight: 25, marginTop: 20 }]}>
          Nook is a cosy corner of the internet where independent sellers move in, decorate it their
          way, and show you who they really are.
        </Text>
        <View style={{ gap: 14, marginTop: 26 }}>
          <Key
            onPress={onBrowse}
            accessibilityRole="button"
            color={C.persimmon}
            borderColor={C.ink}
            innerStyle={styles.big}
          >
            <Text style={styles.bigText}>Take a look around</Text>
            <Ionicons name="arrow-down" size={18} color={C.ink} />
          </Key>
          <Key
            onPress={() => router.push('/me')}
            accessibilityRole="button"
            color={C.card}
            borderColor={C.ink}
            innerStyle={styles.big}
          >
            <Text style={styles.bigText}>Open your own nook</Text>
          </Key>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24 }}>
          <View style={{ flexDirection: 'row' }}>
            {shops.slice(0, 4).map((s, i) => (
              <View
                key={s.id}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginLeft: i ? -11 : 0,
                  borderWidth: 2,
                  borderColor: C.ink,
                  backgroundColor: [C.butter, C.lilac, C.pink, C.mint][i],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: font.display, fontSize: 15, color: C.ink }}>
                  {initials(s.name).slice(0, 1)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: C.ink2 }}>
            <Text style={{ fontWeight: '800', color: C.ink }}>{productCount} little finds</Text>,
            all from people who care how they’re made.
          </Text>
        </View>
      </Reveal>
      <Stage shops={shops} />
    </View>
  );
}

/** Three doorways onto three shops, floating on a persimmon blob. */
function Stage({ shops }: { shops: Shop[] }) {
  const { width } = useWindowDimensions();
  const W = width - 40;
  const doors = [
    { shop: shops[0], left: W * 0.04, bottom: 78, w: W * 0.3, h: 176, delay: 0, tone: 0 },
    { shop: shops[1], left: W * 0.34, bottom: 74, w: W * 0.34, h: 250, delay: 600, tone: 1 },
    { shop: shops[2], left: W * 0.7, bottom: 22, w: W * 0.28, h: 150, delay: 1200, tone: 2 },
  ].filter((d) => d.shop);
  return (
    <View style={{ height: 380, marginTop: 40 }}>
      <View
        style={{
          position: 'absolute',
          left: W * 0.08,
          top: 8,
          width: W * 0.86,
          height: W * 0.8,
          borderRadius: W,
          backgroundColor: C.persimmon,
          borderWidth: 3,
          borderColor: C.ink,
          ...hardShadow(6, 7),
        }}
      />
      {doors.map(({ shop, left, bottom, w, h, delay }, i) => (
        <Reveal
          key={shop.id}
          delay={300 + i * 140}
          from={90}
          style={{ position: 'absolute', left, bottom, width: w, height: h + 22 }}
        >
          <Bob amplitude={9} duration={2800 + i * 700} delay={delay}>
            <Pressable
              onPress={() => router.push(`/shop/${shop.slug}`)}
              accessibilityLabel={`Visit ${shop.name}`}
            >
              <View
                style={{
                  width: w,
                  height: h,
                  borderTopLeftRadius: w / 2,
                  borderTopRightRadius: w / 2,
                  borderBottomLeftRadius: 18,
                  borderBottomRightRadius: 18,
                  borderWidth: 3,
                  borderColor: C.ink,
                  overflow: 'hidden',
                  backgroundColor: C.card,
                  ...hardShadow(5, 5),
                }}
              >
                <Image
                  source={{ uri: imageUri(shop.cover) }}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  alignSelf: 'center',
                  maxWidth: w,
                  backgroundColor: C.ink,
                  borderRadius: 20,
                  paddingHorizontal: 11,
                  paddingVertical: 3,
                  transform: [{ rotate: i % 2 ? '2deg' : '-2deg' }],
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: C.paper, fontSize: 11.5, fontWeight: '700' }}
                >
                  {shop.name}
                </Text>
              </View>
            </Pressable>
          </Bob>
        </Reveal>
      ))}
      <PopIn delay={900} style={{ position: 'absolute', right: 6, top: 0 }}>
        <Swing degrees={6} drop={32}>
          <View style={{ width: 3, height: 26, backgroundColor: C.ink, alignSelf: 'center' }} />
          <View
            style={{
              backgroundColor: C.butter,
              borderWidth: 3,
              borderColor: C.ink,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingTop: 6,
              paddingBottom: 4,
              alignItems: 'center',
              ...hardShadow(3, 4),
            }}
          >
            <Text style={{ fontFamily: font.display, fontSize: 24, color: C.ink }}>OPEN</Text>
            <Text style={{ fontFamily: font.hand, fontSize: 15, color: C.ink, marginTop: -2 }}>
              come on in
            </Text>
          </View>
        </Swing>
      </PopIn>
      <PopIn delay={1100} style={{ position: 'absolute', left: -2, bottom: -2 }}>
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: C.lilac,
            borderWidth: 3,
            borderColor: C.ink,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-8deg' }],
            ...hardShadow(3, 4),
          }}
        >
          <Spin duration={22000} style={{ position: 'absolute', width: 76, height: 76 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                borderWidth: 2,
                borderColor: C.ink,
                borderStyle: 'dashed',
              }}
            />
          </Spin>
          <NookMark size={36} />
        </View>
      </PopIn>
      <Reveal delay={1000} style={{ position: 'absolute', left: 4, top: 2 }}>
        <Text
          style={{
            fontFamily: font.hand,
            fontSize: 26,
            color: C.ink,
            transform: [{ rotate: '-7deg' }],
          }}
        >
          peek inside! ↘
        </Text>
      </Reveal>
    </View>
  );
}

function Ticker() {
  const set = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {ticker.map((t, i) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 22 }}>
          <Text style={{ fontFamily: font.display, fontSize: 21, color: C.paper }}>{t}</Text>
          <Ionicons
            name="star"
            size={16}
            color={[C.persimmon, C.butter, C.lilac][i % 3]}
            style={{ marginLeft: 22 }}
          />
        </View>
      ))}
    </View>
  );
  return (
    <View style={{ marginTop: 8, transform: [{ rotate: '-1.4deg' }, { scale: 1.05 }] }}>
      <Marquee speed={42} style={{ backgroundColor: C.ink, paddingVertical: 14 }}>
        {set}
      </Marquee>
    </View>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Move in',
      text: 'Claim your corner. Add your name, your story and the things you make.',
      icon: 'key-outline',
      tone: C.lilac,
      tilt: -1.6,
    },
    {
      n: '02',
      title: 'Decorate it',
      text: 'Pick a look, swap the colours, change the type. Make it unmistakably yours.',
      icon: 'color-palette-outline',
      tone: C.butter,
      tilt: 1.1,
    },
    {
      n: '03',
      title: 'Open the door',
      text: 'Publish when you’re ready. Shoppers drop in, browse, follow and buy.',
      icon: 'storefront-outline',
      tone: C.mint,
      tilt: -0.8,
    },
  ] as const;
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 40 }}>
      <Reveal>
        <Text style={ui.eyebrow}>NEW HERE?</Text>
        <Text style={styles.h2}>
          Three steps to your <Text style={styles.hl}>{'\u00A0very own\u00A0'}</Text> nook.
        </Text>
      </Reveal>
      <View style={{ gap: 22, marginTop: 26 }}>
        {steps.map((s, i) => (
          <Reveal
            key={s.n}
            delay={i * 80}
            from={44}
            style={{ transform: [{ rotate: `${s.tilt}deg` }] }}
          >
            <View
              style={{
                position: 'absolute',
                left: 4,
                right: -4,
                top: 5,
                bottom: -5,
                borderRadius: 28,
                backgroundColor: C.ink,
              }}
            />
            <View
              style={{
                backgroundColor: s.tone,
                borderWidth: 2,
                borderColor: C.ink,
                borderRadius: 28,
                padding: 22,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={styles.iconSticker}>
                  <Ionicons name={s.icon} size={30} color={C.ink} />
                </View>
                <Text style={styles.stepNum}>{s.n}</Text>
              </View>
              <Text style={{ fontFamily: font.display, fontSize: 28, color: C.ink, marginTop: 16 }}>
                {s.title}
              </Text>
              <Text style={{ fontSize: 16, lineHeight: 23, color: C.ink, marginTop: 8 }}>
                {s.text}
              </Text>
            </View>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

function Finale() {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 56 }}>
      <Reveal pop>
        <View style={{ backgroundColor: C.ink, borderRadius: 34, padding: 28, overflow: 'hidden' }}>
          <Text style={[ui.eyebrow, { color: C.butter }]}>GOT A CORNER TO FILL?</Text>
          <Text style={[styles.h2, { color: C.paper }]}>
            Your story deserves a{' '}
            <Text style={{ backgroundColor: C.persimmon, color: C.ink }}>
              {'\u00A0place of its own.\u00A0'}
            </Text>
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: '#EADFCA',
              marginTop: 16,
              marginBottom: 24,
            }}
          >
            Start with a name and a few things you love. Make it a shop, make it a scrapbook, make
            it you.
          </Text>
          <Key
            onPress={() => router.push('/me')}
            accessibilityRole="button"
            color={C.persimmon}
            borderColor={C.paper}
            shadowColor={C.paper}
            style={{ alignSelf: 'flex-start' }}
            innerStyle={styles.big}
          >
            <Text style={styles.bigText}>Move in to Nook</Text>
            <Ionicons name="arrow-forward" size={18} color={C.ink} />
          </Key>
          <View
            style={{ position: 'absolute', right: 20, top: 22, transform: [{ rotate: '-8deg' }] }}
          >
            <Bob amplitude={6} duration={2600}>
              <NookMark size={52} onDark />
            </Bob>
          </View>
        </View>
      </Reveal>
    </View>
  );
}

function FieldSearch({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={19} color={C.ink} />
      <TextInput
        accessibilityLabel="Search products and shops"
        value={value}
        onChangeText={onChange}
        placeholder="Poke around for something…"
        placeholderTextColor={C.muted}
        style={{ flex: 1, minHeight: 48, fontSize: 15, color: C.ink, fontFamily: font.medium }}
      />
      {value ? (
        <TouchableOpacity
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          onPress={() => onChange('')}
          style={{ padding: 7 }}
        >
          <Ionicons name="close-circle" size={20} color={C.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: font.display,
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: -1.5,
    color: C.ink,
  },
  nook: {
    color: C.persimmon,
    textShadowColor: C.ink,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  h2: {
    fontFamily: font.display,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: C.ink,
  },
  hl: { backgroundColor: C.butter },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 14,
    transform: [{ rotate: '-1.6deg' }],
    ...hardShadow(0, 3),
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1FA862' },
  big: {
    minHeight: 58,
    paddingHorizontal: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bigText: { fontSize: 16.5, fontWeight: '700', color: C.ink },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 30,
    paddingHorizontal: 16,
  },
  iconSticker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: C.ink,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  emptyTitle: { fontFamily: font.display, fontSize: 24, color: C.ink, textAlign: 'center' },
});
