import { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import type { Product, Shop } from '@lilac/api-client';
import { api, imageUri } from '../../lib';
import { ProductCard, ShopCard } from '../../components/cards';
import { Button, Loading, ui, C } from '../../components/ui';
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
  return (
    <ScrollView
      ref={scroll}
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={C.primary}
        />
      }
    >
      {error && <Text style={ui.error}>{error}</Text>}
      <Text style={[ui.eyebrow, { marginBottom: 17 }]}>A HOME FOR INDEPENDENT SPIRITS</Text>
      <View
        style={{
          backgroundColor: '#ECE1F6',
          borderRadius: 16,
          padding: 25,
          overflow: 'hidden',
          minHeight: 330,
        }}
      >
        <Text style={[ui.eyebrow, { fontSize: 8 }]}>SMALL SHOPS. BIG PERSONALITY.</Text>
        <Text style={[ui.title, { fontSize: 37, lineHeight: 43, color: '#563A6C', maxWidth: 230 }]}>
          Good finds.{'\n'}Your kind of people.
        </Text>
        <Text style={[ui.subtitle, { maxWidth: 220, color: '#9A7FAA' }]}>
          Thoughtfully made things, from independent little worlds.
        </Text>
        <Button
          title="Find your next favorite ↗"
          onPress={() => scroll.current?.scrollTo({ y: findsY.current, animated: true })}
          style={{ alignSelf: 'flex-start', marginTop: 20 }}
        />
        <Image
          source={{ uri: imageUri('seed_product_0') }}
          style={{
            width: 105,
            height: 120,
            position: 'absolute',
            right: -10,
            bottom: -6,
            transform: [{ rotate: '-13deg' }],
            borderWidth: 5,
            borderColor: '#FFFBF5',
            borderRadius: 3,
          }}
        />
      </View>
      <FieldSearch value={query} onChange={setQuery} />
      <Text style={ui.sectionTitle}>Small shops. Big heart.</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
      >
        {data?.shops.map((s) => (
          <ShopCard key={s.id} shop={s} />
        ))}
      </ScrollView>
      <Text
        onLayout={(e) => {
          findsY.current = e.nativeEvent.layout.y;
        }}
        style={ui.sectionTitle}
      >
        Find your next favorite.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: 20 }}
      >
        {data?.categories.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: c === category ? C.primary : '#FFF',
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: 10, color: c === category ? '#FFF' : C.muted }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {Array.from({ length: Math.ceil(products.length / 2) }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 13, marginBottom: 24 }}>
          <ProductCard product={products[i * 2]} />
          {products[i * 2 + 1] ? (
            <ProductCard product={products[i * 2 + 1]} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      ))}
      {products.length === 0 && (
        <View style={ui.empty}>
          <Text style={ui.muted}>No finds here yet. Try another search.</Text>
        </View>
      )}
      <Text style={[ui.fine, { textAlign: 'center' }]}>
        Every find has a person behind it. Thanks for shopping small.{'\n'}SAMPLE CATALOG · SANDBOX
        PREVIEW
      </Text>
    </ScrollView>
  );
}
function FieldSearch({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <TextInput
      accessibilityLabel="Search products and shops"
      value={value}
      onChangeText={onChange}
      placeholder="Find your kind of thing…"
      placeholderTextColor="#AF9CBE"
      style={[ui.input, { marginTop: 22, backgroundColor: '#F5F0FA' }]}
    />
  );
}
