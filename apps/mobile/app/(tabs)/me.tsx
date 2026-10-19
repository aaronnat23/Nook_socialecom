import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Document } from '@lilac/schema';
import type { Product } from '@lilac/api-client';
import { api } from '../../lib';
import { AuthGate, useApp } from '../../components/provider';
import { Button, ui, C } from '../../components/ui';
import { Storefront } from '../../components/storefront';
export default function Page() {
  return (
    <AuthGate>
      <Space />
    </AuthGate>
  );
}
function Space() {
  const { me, refresh, notify } = useApp();
  const [doc, setDoc] = useState<Document | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<{ document: Document }>(`/shops/${me!.shop.id}/published`)
        .then((r) => {
          if (active) setDoc(r.document);
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
  return (
    <ScrollView style={ui.screen}>
      <View style={ui.content}>
        <Text style={ui.eyebrow}>YOUR LITTLE CORNER</Text>
        <Text style={ui.title}>Make yourself at home, {me!.display_name.split(' ')[0]}.</Text>
        <Text style={ui.subtitle}>
          {me!.shop.name} · @{me!.handle}
        </Text>
        <Button
          title="Customize your space ↗"
          onPress={() => router.push('/editor')}
          style={{ marginTop: 25 }}
        />
        <View style={[ui.row, { marginTop: 14 }]}>
          <Button
            title="Your products"
            soft
            onPress={() => router.push('/products')}
            style={{ flex: 1 }}
          />
          <Button
            title="Shop orders"
            soft
            onPress={() => router.push('/orders?seller=1')}
            style={{ flex: 1 }}
          />
        </View>
        <View style={[ui.row, { marginTop: 20 }]}>
          <View style={[ui.card, { flex: 1 }]}>
            <Text style={ui.muted}>Your products</Text>
            <Text style={[ui.title, { fontSize: 25, marginTop: 10 }]}>{products.length}</Text>
          </View>
          <View style={[ui.card, { flex: 1 }]}>
            <Text style={ui.muted}>Your community</Text>
            <Text style={[ui.title, { fontSize: 25, marginTop: 10 }]}>{me!.shop.followers}</Text>
          </View>
        </View>
        {!me!.seller_enabled && (
          <View style={ui.card}>
            <Text style={ui.sectionTitle}>Your space could be a shop.</Text>
            <Text style={ui.muted}>
              Enable sandbox selling to try products and test orders. Live payments remain disabled.
            </Text>
            <Button
              title="Accept sandbox seller terms & enable"
              style={{ marginTop: 15 }}
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
        )}
        {error && <Text style={ui.error}>{error}</Text>}
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.sectionTitle}>Your published space.</Text>
          {doc && (
            <TouchableOpacity onPress={() => router.push(`/shop/${me!.shop.slug}`)}>
              <Text style={{ fontSize: 11, color: C.primary }}>View public ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {doc ? (
        <Storefront
          document={doc}
          shop={me!.shop}
          products={products.filter((p) => p.status === 'published')}
        />
      ) : (
        <View style={ui.empty}>
          <Text style={ui.muted}>Choose a theme and publish your first little corner.</Text>
        </View>
      )}
      <View style={ui.content}>
        <Button title="Your purchases →" soft onPress={() => router.push('/orders')} />
        <Text style={[ui.fine, { textAlign: 'center' }]}>SAMPLE CATALOG · SANDBOX PREVIEW</Text>
      </View>
    </ScrollView>
  );
}
