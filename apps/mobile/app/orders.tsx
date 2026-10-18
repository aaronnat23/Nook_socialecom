import { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Order } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api } from '../lib';
import { AuthGate, useApp } from '../components/provider';
import { Button, Field, Loading, ui } from '../components/ui';
export default function Page() {
  return (
    <AuthGate>
      <Orders />
    </AuthGate>
  );
}
function Orders() {
  const { seller } = useLocalSearchParams<{ seller?: string }>();
  const { me, notify } = useApp();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const load = () =>
    api<{ items: Order[] }>(seller ? `/shops/${me!.shop.id}/orders` : '/orders')
      .then((r) => setOrders(r.items))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [me, seller]);
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>{seller ? 'YOUR SELLER STUDIO' : 'GOOD FINDS, ON THEIR WAY'}</Text>
      <Text style={ui.title}>
        {seller ? 'Orders for your little shop.' : 'Your little orders.'}
      </Text>
      {error && <Text style={ui.error}>{error}</Text>}
      {orders?.map((o) => (
        <View key={o.id} style={[ui.card, { marginTop: 20 }]}>
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{o.shop_name}</Text>
          <Text style={[ui.pill, { alignSelf: 'flex-start', marginTop: 12 }]}>
            {o.state.replaceAll('_', ' ')}
          </Text>
          {o.items.map((i) => (
            <Text key={i.variant_id} style={[ui.muted, { marginTop: 12 }]}>
              {i.title} × {i.quantity} · {money(i.unit_price_minor * i.quantity)}
            </Text>
          ))}
          <Text style={[ui.price, { marginTop: 18 }]}>Total {money(o.total_minor)}</Text>
          <Text style={ui.fine}>
            {new Date(o.created_at).toLocaleDateString()} · #{o.id.slice(0, 8)} · Sandbox
          </Text>
          {o.tracking && <Text style={ui.fine}>Tracking: {o.tracking}</Text>}
          {seller && o.state === 'paid' && (
            <>
              <Field
                label="Tracking reference"
                value={tracking[o.id] || ''}
                onChangeText={(v) => setTracking({ ...tracking, [o.id]: v })}
              />
              <Button
                title="Mark as shipped"
                soft
                style={{ marginTop: 15 }}
                onPress={async () => {
                  try {
                    await api(`/shops/${me!.shop.id}/orders/${o.id}/ship`, {
                      method: 'POST',
                      body: JSON.stringify({ tracking: tracking[o.id] }),
                    });
                    await load();
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              />
            </>
          )}
          <Button
            title="View order →"
            soft
            style={{ marginTop: 15 }}
            onPress={() => router.push(`/order/${o.id}`)}
          />
        </View>
      ))}
      {orders?.length === 0 && (
        <View style={ui.empty}>
          <Text style={ui.muted}>
            Your first little order is a lovely thing. It will be waiting here.
          </Text>
        </View>
      )}
      {orders === null && !error && <Loading />}
    </ScrollView>
  );
}
