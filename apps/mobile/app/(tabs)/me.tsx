import { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { Document } from '@lilac/schema';
import type { Product } from '@lilac/api-client';
import { api, imageUri } from '../../lib';
import { AuthGate, useApp } from '../../components/provider';
import { Button, ui, C } from '../../components/ui';
import { TemplateGallery } from '../../components/templates';
import { Reveal } from '../../components/motion';
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
        <Reveal>
          <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
            <Text style={[ui.eyebrow, { marginBottom: 0 }]}>YOUR CREATIVE STUDIO</Text>
            <Text style={[ui.pill, { fontSize: 9 }]}>✦ Made for you</Text>
          </View>
          <Text style={ui.title}>
            Make yourself at home,{'\n'}
            {me!.display_name.split(' ')[0]}.
          </Text>
          <Text style={ui.subtitle}>A little corner of the internet. Entirely yours.</Text>
        </Reveal>
        <Reveal delay={80}>
          <LinearGradient
            colors={['#4C3074', '#6D4698', '#7B569F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 26, padding: 23, marginTop: 24, overflow: 'hidden' }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 210,
                height: 210,
                borderRadius: 105,
                borderWidth: 1,
                borderColor: '#FFFFFF18',
                right: -65,
                top: -50,
              }}
            />
            <View style={[ui.row, { gap: 12 }]}>
              <Image
                source={{ uri: imageUri(me!.shop.cover) }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: '#FFFFFF55',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>
                  {me!.shop.name}
                </Text>
                <Text style={{ color: '#E1CEEF', fontSize: 10, marginTop: 4 }}>@{me!.handle}</Text>
              </View>
              <Ionicons name="sparkles-outline" size={24} color="#E7D7FF" />
            </View>
            <Text
              style={{
                color: '#FFF',
                fontSize: 29,
                lineHeight: 34,
                letterSpacing: -1,
                marginTop: 24,
                fontWeight: '500',
              }}
            >
              Your story.{'\n'}Beautifully told.
            </Text>
            <Text
              style={{
                color: '#F2E7FC',
                fontSize: 12,
                lineHeight: 20,
                marginTop: 9,
                marginBottom: 22,
              }}
            >
              Design a space that feels like you.
            </Text>
            <Button title="Customize your space ↗" onPress={() => router.push('/editor')} soft />
          </LinearGradient>
        </Reveal>
        <Reveal delay={150}>
          <View style={[ui.row, { marginTop: 16 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Your products"
              onPress={() => router.push('/products')}
              style={[ui.card, { flex: 1, padding: 17, marginBottom: 0 }]}
            >
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Ionicons name="cube-outline" color={C.primary} size={20} />
                <Ionicons name="arrow-forward" size={14} color="#AA98BD" />
              </View>
              <Text style={{ fontSize: 25, fontWeight: '600', color: C.text, marginTop: 14 }}>
                {products.length}
              </Text>
              <Text style={[ui.muted, { fontSize: 11, marginTop: 3 }]}>Your products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Shop orders"
              onPress={() => router.push('/orders?seller=1')}
              style={[ui.card, { flex: 1, padding: 17, marginBottom: 0 }]}
            >
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Ionicons name="receipt-outline" color={C.primary} size={20} />
                <Ionicons name="arrow-forward" size={14} color="#AA98BD" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, marginTop: 18 }}>
                Shop orders
              </Text>
              <Text style={[ui.muted, { fontSize: 11, marginTop: 5 }]}>Manage your orders</Text>
            </TouchableOpacity>
          </View>
        </Reveal>
        <TemplateGallery shop={me!.shop} products={products} />
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
        <View style={{ paddingHorizontal: 22 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View your published space"
            onPress={() => router.push(`/shop/${me!.shop.slug}`)}
            style={[ui.card, ui.row, { padding: 14 }]}
          >
            <Image
              source={{ uri: imageUri(me!.shop.cover) }}
              style={{ width: 72, height: 85, borderRadius: 15 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 9,
                  color: '#6D8B70',
                  letterSpacing: 1,
                  fontWeight: '600',
                  marginBottom: 7,
                }}
              >
                ● LIVE STOREFRONT
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
                {me!.shop.name}
              </Text>
              <Text style={[ui.muted, { fontSize: 11, marginTop: 4 }]}>
                {me!.shop.followers} followers · View your space
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>
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
