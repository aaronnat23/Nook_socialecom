import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product, Shop } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../lib';
import { useApp } from './provider';
import { ui, C } from './ui';
export function ProductCard({
  product: p,
  colors,
}: {
  product: Product;
  colors?: Document['theme']['colors'];
}) {
  const { me, requireAuth, refresh, notify } = useApp();
  const saved = me?.favorites.includes(p.id);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <TouchableOpacity
        onPress={() => router.push(`/product/${p.slug}`)}
        accessibilityLabel={`View ${p.title}`}
      >
        <Image
          source={{ uri: imageUri(p.image) }}
          style={[ui.image, { height: 195, borderRadius: 20, backgroundColor: '#EDE5F5' }]}
        />
        <Text style={{ fontSize: 9, color: colors?.muted || '#A08BAC', marginTop: 10 }}>
          {p.shop_name} ↗
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors?.text || C.text,
            marginTop: 5,
            lineHeight: 19,
          }}
        >
          {p.title}
        </Text>
        <Text
          style={[ui.price, { fontSize: 12, marginTop: 5, color: colors?.accent || C.primary }]}
        >
          {money(p.price_minor)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel={saved ? `Unsave ${p.title}` : `Save ${p.title}`}
        onPress={async () => {
          if (!requireAuth()) return;
          try {
            await api(`/products/${p.id}/favorite`, { method: saved ? 'DELETE' : 'POST' });
            await refresh();
          } catch (e) {
            notify((e as Error).message);
          }
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 38,
          height: 38,
          borderRadius: 20,
          backgroundColor: '#FFFFFFED',
          borderWidth: 1,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={17} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
}
export function ShopCard({ shop: s }: { shop: Shop }) {
  const { me, requireAuth, refresh, notify } = useApp();
  const followed = me?.following.includes(s.id);
  return (
    <View
      style={{
        width: 235,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: '#FFF',
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity onPress={() => router.push(`/shop/${s.slug}`)}>
        <Image source={{ uri: imageUri(s.cover) }} style={{ width: '100%', height: 130 }} />
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{s.name}</Text>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {s.location} · {s.category}
          </Text>
          <Text style={{ fontSize: 10, color: '#AB99B8', marginTop: 8 }} numberOfLines={1}>
            {s.bio}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel={`${followed ? 'Unfollow' : 'Follow'} ${s.name}`}
        onPress={async () => {
          if (!requireAuth()) return;
          try {
            await api(`/shops/${s.id}/follow`, { method: followed ? 'DELETE' : 'POST' });
            await refresh();
          } catch (e) {
            notify((e as Error).message);
          }
        }}
        style={{
          position: 'absolute',
          right: 10,
          top: 140,
          borderRadius: 20,
          backgroundColor: C.lilac,
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={followed ? 'checkmark' : 'add'} size={18} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
}
