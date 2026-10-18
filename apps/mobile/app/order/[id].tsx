import { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Order } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api } from '../../lib';
import { AuthGate, useApp } from '../../components/provider';
import { Button, Loading, ui } from '../../components/ui';
export default function Page() {
  return (
    <AuthGate>
      <Detail />
    </AuthGate>
  );
}
function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notify } = useApp();
  const [o, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {error && <Text style={ui.error}>{error}</Text>}
      {o ? (
        <>
          <Text style={ui.eyebrow}>A GOOD FIND. A LOVELY CHOICE.</Text>
          <Text style={ui.title}>Your little order.</Text>
          <Text style={ui.subtitle}>
            {o.shop_name} · #{o.id.slice(0, 8)}
          </Text>
          <Text style={[ui.pill, { alignSelf: 'flex-start', marginTop: 15 }]}>
            {o.state.replaceAll('_', ' ')}
          </Text>
          <View style={[ui.card, { marginTop: 25 }]}>
            {o.items.map((i) => (
              <Text key={i.variant_id} style={[ui.muted, { marginBottom: 15 }]}>
                {i.title} × {i.quantity}
                {'\n'}
                {money(i.unit_price_minor * i.quantity)}
              </Text>
            ))}
            <View style={ui.divider} />
            <Text style={ui.muted}>Shipping {money(o.shipping_minor)}</Text>
            <Text style={[ui.price, { fontSize: 23, marginVertical: 15 }]}>
              Total {money(o.total_minor)}
            </Text>
            {o.tracking && <Text style={ui.muted}>Tracking: {o.tracking}</Text>}
            <Text style={ui.fine}>Sandbox order. No real money was collected.</Text>
          </View>
          {['paid', 'pending_payment'].includes(o.state) && (
            <Button
              title={o.state === 'paid' ? 'Request sandbox refund' : 'Cancel order'}
              soft
              onPress={async () => {
                try {
                  setOrder(await api<Order>(`/orders/${o.id}/cancel-request`, { method: 'POST' }));
                  notify('Inventory returned. Your sandbox order is closed.');
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          )}
          <Button
            title="Keep discovering ↗"
            onPress={() => router.push('/')}
            style={{ marginTop: 15 }}
          />
        </>
      ) : (
        !error && <Loading />
      )}
    </ScrollView>
  );
}
