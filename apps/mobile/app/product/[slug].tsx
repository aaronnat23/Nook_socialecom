import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Product } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../../lib';
import { useApp } from '../../components/provider';
import { Button, Loading, ui, C } from '../../components/ui';
export default function Page() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [p, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { me, requireAuth, refresh, notify } = useApp();
  useEffect(() => {
    api<Product>(`/products/${slug}`)
      .then((p) => {
        setProduct(p);
        setVariant(p.variants[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [slug]);
  if (error) return <Text style={ui.error}>{error}</Text>;
  if (!p) return <Loading />;
  const v = p.variants.find((v) => v.id === variant);
  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <Image
        accessibilityLabel={p.title}
        source={{ uri: imageUri(p.image) }}
        style={{ width: '100%', height: 380 }}
      />
      <View style={ui.content}>
        <TouchableOpacity onPress={() => router.push(`/shop/${p.shop_slug}`)}>
          <Text style={ui.eyebrow}>FROM {p.shop_name} ↗</Text>
        </TouchableOpacity>
        <Text style={ui.title}>{p.title}</Text>
        <Text style={[ui.price, { fontSize: 25, marginVertical: 18 }]}>
          {money(v?.price_minor || p.price_minor)}
        </Text>
        <Text style={ui.muted}>{p.description}</Text>
        <Text style={ui.label}>Choose your finish</Text>
        <View style={ui.wrap}>
          {p.variants.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => {
                setVariant(v.id);
                setQty(1);
              }}
              style={{
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: variant === v.id ? C.primary : C.border,
                backgroundColor: variant === v.id ? C.lilac : '#FFF',
              }}
            >
              <Text style={{ fontSize: 11, color: C.primary }}>
                {Object.values(v.options).join(' / ')} · {v.stock} left
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[ui.row, { marginTop: 20 }]}>
          <Button title="−" soft onPress={() => setQty(Math.max(1, qty - 1))} />
          <Text style={ui.muted}>{qty}</Text>
          <Button
            title="+"
            soft
            disabled={qty >= (v?.stock || 0)}
            onPress={() => setQty(qty + 1)}
          />
          <Button
            title={me?.favorites.includes(p.id) ? 'Saved ♥' : 'Save ♡'}
            soft
            onPress={async () => {
              if (!requireAuth()) return;
              await api(`/products/${p.id}/favorite`, {
                method: me?.favorites.includes(p.id) ? 'DELETE' : 'POST',
              });
              await refresh();
            }}
          />
        </View>
        <Button
          title={busy ? 'Adding…' : v?.stock ? 'Add to bag →' : 'Sold out'}
          disabled={busy || !v?.stock}
          style={{ marginTop: 20 }}
          onPress={async () => {
            if (!requireAuth()) return;
            setBusy(true);
            try {
              await api(`/cart/items/${variant}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: qty }),
              });
              notify('A good find, added to your bag.');
              router.push('/cart');
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
        <Text style={ui.fine}>
          Domestic Malaysia shipping
          {p.shipping_minor !== undefined ? ` · ${money(p.shipping_minor)}` : ''}.
          {p.return_policy || 'See the return policy at checkout.'}
          {'\n'}Sample catalog · Sandbox checkout. No real charge.
        </Text>
      </View>
    </ScrollView>
  );
}
