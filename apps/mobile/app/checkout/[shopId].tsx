import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Order } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api } from '../../lib';
import type { CartGroup } from '../cart';
import { AuthGate, useApp } from '../../components/provider';
import { Button, Field, Loading, ui, C } from '../../components/ui';
export default function Page() {
  return (
    <AuthGate>
      <Checkout />
    </AuthGate>
  );
}
function Checkout() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { me } = useApp();
  const [group, setGroup] = useState<CartGroup | null>(null);
  const [quote, setQuote] = useState<{
    subtotal_minor: number;
    shipping_minor: number;
    total_minor: number;
    return_policy: string;
  } | null>(null);
  const [name, setName] = useState(me!.display_name);
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(() => `native-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    api<{ groups: CartGroup[] }>('/cart')
      .then(async (r) => {
        const g = r.groups.find((g) => g.shop.id === shopId);
        if (!g) throw new Error('No items from this shop in your bag.');
        setGroup(g);
        setQuote(
          await api('/checkout/quote', {
            method: 'POST',
            body: JSON.stringify({
              items: g.items.map((i) => ({ variant_id: i.variant.id, quantity: i.quantity })),
            }),
          }),
        );
      })
      .catch((e) => setError(e.message));
  }, [shopId]);
  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={ui.eyebrow}>THE LAST LITTLE STEP</Text>
      <Text style={ui.title}>Almost yours.</Text>
      <Text style={[ui.pill, { alignSelf: 'flex-start', marginTop: 15 }]}>
        SANDBOX · NO REAL CHARGE
      </Text>
      {error && <Text style={ui.error}>{error}</Text>}
      {quote && group ? (
        <>
          <View style={[ui.card, { marginTop: 20 }]}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Where should your finds go?</Text>
            <Field label="Full name" value={name} onChangeText={setName} />
            <Field label="Street address" value={line1} onChangeText={setLine1} />
            <Field label="City" value={city} onChangeText={setCity} />
            <Field
              label="Postcode · 5 digits"
              value={postcode}
              onChangeText={setPostcode}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={ui.fine}>
              Domestic Malaysia delivery. Use sample address details for this test.
            </Text>
          </View>
          <View style={ui.card}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Your little collection.</Text>
            {group.items.map((i) => (
              <View
                key={i.variant.id}
                style={[ui.row, { justifyContent: 'space-between', marginTop: 16 }]}
              >
                <Text style={[ui.muted, { flex: 1 }]}>
                  {i.product.title} × {i.quantity}
                </Text>
                <Text style={ui.price}>{money(i.variant.price_minor * i.quantity)}</Text>
              </View>
            ))}
            <View style={ui.divider} />
            <Text style={ui.muted}>Domestic shipping {money(quote.shipping_minor)}</Text>
            <Text style={[ui.price, { fontSize: 22, marginVertical: 18 }]}>
              Total {money(quote.total_minor)}
            </Text>
            <Text style={ui.fine}>{quote.return_policy}</Text>
            <View style={[ui.row, { marginVertical: 20 }]}>
              <Switch
                accessibilityLabel="Accept sandbox checkout and return policy"
                value={accepted}
                onValueChange={setAccepted}
                trackColor={{ true: '#A27BC7', false: '#DDD1E8' }}
              />
              <Text style={[ui.fine, { margin: 0, flex: 1 }]}>
                I understand this is a sandbox purchase and have read the return policy.
              </Text>
            </View>
            <Button
              title={busy ? 'Placing your test order…' : 'Place sandbox order →'}
              disabled={
                busy ||
                !accepted ||
                name.length < 2 ||
                line1.length < 3 ||
                city.length < 2 ||
                !/^\d{5}$/.test(postcode)
              }
              onPress={async () => {
                setBusy(true);
                setError('');
                try {
                  const o = await api<Order>('/checkout/session', {
                    method: 'POST',
                    headers: { 'Idempotency-Key': key },
                    body: JSON.stringify({
                      items: group.items.map((i) => ({
                        variant_id: i.variant.id,
                        quantity: i.quantity,
                      })),
                      address: { name, line1, city, postcode, country: 'MY' },
                    }),
                  });
                  await api(`/orders/${o.id}/sandbox-pay`, { method: 'POST' });
                  router.replace(`/order/${o.id}`);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Text style={ui.fine}>
              No card details. No real charge. Prices and inventory are verified by the service.
            </Text>
          </View>
        </>
      ) : (
        !error && <Loading />
      )}
    </ScrollView>
  );
}
