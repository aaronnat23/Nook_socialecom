import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../../components/text';
import { useLocalSearchParams } from 'expo-router';
import type { Shop, Product } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import { api } from '../../lib';
import { Storefront } from '../../components/storefront';
import { Button, Loading, ui } from '../../components/ui';
import { useApp } from '../../components/provider';
export default function ShopPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [data, setData] = useState<(Shop & { document: Document; products: Product[] }) | null>(
    null,
  );
  const [error, setError] = useState('');
  const { me, requireAuth, refresh, notify } = useApp();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    api<NonNullable<typeof data>>(`/shops/${slug}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [slug]);
  if (error) return <Text style={ui.error}>{error}</Text>;
  if (!data) return <Loading />;
  return (
    <ScrollView style={ui.screen} ref={scroll}>
      <Storefront
        document={data.document}
        shop={data}
        products={data.products}
        onBlockLayout={(id, y) => {
          positions.current[id] = y;
        }}
        onAnchor={(id) =>
          scroll.current?.scrollTo({ y: positions.current[id] || 0, animated: true })
        }
      />
      <View style={ui.content}>
        <Button
          title={me?.following.includes(data.id) ? 'Following ✓' : 'Follow this space +'}
          soft
          onPress={async () => {
            if (!requireAuth()) return;
            try {
              await api(`/shops/${data.id}/follow`, {
                method: me?.following.includes(data.id) ? 'DELETE' : 'POST',
              });
              await refresh();
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        />
        <Text style={[ui.fine, { textAlign: 'center' }]}>
          Sample space · Sandbox purchases only
        </Text>
      </View>
    </ScrollView>
  );
}
