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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Reveal } from '../../components/motion';
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
      <Reveal>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
          <Text style={[ui.eyebrow, { marginBottom: 0 }]}>INDEPENDENT LOOKS GOOD ON YOU</Text>
          <Ionicons name="sparkles-outline" size={18} color={C.primary} />
        </View>
      </Reveal>
      <Reveal delay={60}>
        <LinearGradient
          colors={['#EBE0FC', '#F1E5F6', '#F9EEE8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 25, overflow: 'hidden', minHeight: 405 }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 230,
              height: 230,
              borderRadius: 115,
              borderWidth: 1,
              borderColor: '#FFFFFF90',
              right: -45,
              top: -55,
            }}
          />
          <Text style={[ui.eyebrow, { fontSize: 8, color: '#8964A7' }]}>
            SMALL SHOPS. BIG PERSONALITY.
          </Text>
          <Text
            style={[ui.title, { fontSize: 40, lineHeight: 44, color: '#49305F', maxWidth: 245 }]}
          >
            Good finds.{'\n'}Your kind of
            <Text style={{ fontFamily: 'Georgia', fontStyle: 'italic', fontWeight: '400' }}>
              {' '}
              people.
            </Text>
          </Text>
          <Text style={[ui.subtitle, { maxWidth: 225, color: '#856D98' }]}>
            Thoughtfully made things, from independent little worlds.
          </Text>
          <Button
            title="Explore the little things ↗"
            onPress={() => scroll.current?.scrollTo({ y: findsY.current, animated: true })}
            style={{ alignSelf: 'flex-start', marginTop: 22 }}
          />
          <View pointerEvents="none" style={{ height: 106, marginTop: 20 }}>
            <View
              style={{
                position: 'absolute',
                right: -8,
                top: -4,
                transform: [{ rotate: '9deg' }],
                padding: 5,
                backgroundColor: '#FFFFFFE8',
                borderRadius: 17,
                shadowColor: '#785A91',
                shadowRadius: 12,
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Image
                source={{ uri: imageUri('seed_product_0') }}
                style={{ width: 111, height: 112, borderRadius: 12 }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                right: 105,
                top: 20,
                transform: [{ rotate: '-9deg' }],
                padding: 5,
                backgroundColor: '#FFFFFFE8',
                borderRadius: 17,
              }}
            >
              <Image
                source={{ uri: imageUri('seed_product_9') }}
                style={{ width: 81, height: 88, borderRadius: 12 }}
              />
            </View>
            <View style={{ position: 'absolute', left: 0, bottom: 9 }}>
              <Ionicons name="flower-outline" size={27} color="#A585BC" />
              <Text style={{ fontSize: 8, letterSpacing: 1, color: '#977DAA', marginTop: 8 }}>
                A LITTLE LESS{'\n'}ORDINARY
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Reveal>
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
              borderRadius: 22,
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
    <View
      style={[
        ui.row,
        {
          marginTop: 22,
          backgroundColor: '#FFF',
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 18,
          paddingHorizontal: 16,
          gap: 10,
        },
      ]}
    >
      <Ionicons name="search-outline" size={19} color="#9A83AF" />
      <TextInput
        accessibilityLabel="Search products and shops"
        value={value}
        onChangeText={onChange}
        placeholder="Find your kind of thing…"
        placeholderTextColor="#A595B2"
        style={{ flex: 1, minHeight: 53, fontSize: 13, color: C.text }}
      />
      {value ? (
        <TouchableOpacity
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          onPress={() => onChange('')}
          style={{ padding: 7 }}
        >
          <Ionicons name="close-circle" size={18} color="#B3A0C3" />
        </TouchableOpacity>
      ) : (
        <Text style={{ color: '#AE98BE', fontSize: 15 }}>⌕</Text>
      )}
    </View>
  );
}
