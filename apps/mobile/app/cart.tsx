import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import type { Shop, Product, Variant } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../lib';
import { AuthGate, useApp } from '../components/provider';
import { Button, Loading, ui } from '../components/ui';
export interface CartGroup {
  shop: Shop;
  items: { product: Product; variant: Variant; quantity: number }[];
}
export default function Page() {
  return (
    <AuthGate>
      <Cart />
    </AuthGate>
  );
}
function Cart() {
  const { me, notify } = useApp();
  const [groups, setGroups] = useState<CartGroup[] | null>(null);
  const [error, setError] = useState('');
  const load = () =>
    api<{ groups: CartGroup[] }>('/cart')
      .then((r) => setGroups(r.groups))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [me]);
  const change = async (id: string, quantity: number) => {
    try {
      await api(`/cart/items/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      await load();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>GOOD THINGS, KEPT CLOSE</Text>
      <Text style={ui.title}>Your little bag.</Text>
      {error && <Text style={ui.error}>{error}</Text>}
      {groups?.map((g) => (
        <View key={g.shop.id} style={[ui.card, { marginTop: 25 }]}>
          <Text style={{ fontSize: 19, fontWeight: '600' }}>{g.shop.name}</Text>
          {g.items.map((i) => (
            <View key={i.variant.id} style={[ui.row, { marginTop: 20, alignItems: 'flex-start' }]}>
              <Image
                accessibilityLabel={i.product.title}
                source={{ uri: imageUri(i.product.image) }}
                style={{ width: 65, height: 75, borderRadius: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13 }}>{i.product.title}</Text>
                <Text style={ui.price}>{money(i.variant.price_minor * i.quantity)}</Text>
                <View style={[ui.row, { marginTop: 12 }]}>
                  <Button
                    title="−"
                    soft
                    onPress={() => void change(i.variant.id, i.quantity - 1)}
                  />
                  <Text style={ui.muted}>{i.quantity}</Text>
                  <Button
                    title="+"
                    soft
                    onPress={() => void change(i.variant.id, i.quantity + 1)}
                  />
                </View>
              </View>
            </View>
          ))}
          <View style={ui.divider} />
          <Text style={[ui.price, { marginBottom: 20 }]}>
            Subtotal {money(g.items.reduce((s, i) => s + i.variant.price_minor * i.quantity, 0))}
          </Text>
          <Button
            title="Sandbox checkout →"
            onPress={() => router.push(`/checkout/${g.shop.id}`)}
          />
          <Text style={ui.fine}>One shop per checkout. No real money is collected.</Text>
        </View>
      ))}
      {groups?.length === 0 && (
        <View style={ui.empty}>
          <Text style={ui.subtitle}>A little room for something lovely.</Text>
          <Button title="Keep discovering ↗" soft onPress={() => router.push('/')} />
        </View>
      )}
      {groups === null && !error && <Loading />}
    </ScrollView>
  );
}
