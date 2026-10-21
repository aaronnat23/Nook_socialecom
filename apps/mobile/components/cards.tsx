import { Image, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Product, Shop } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../lib';
import { useApp } from './provider';
import { Text } from './text';
import { font } from './fonts';
import { Reveal, usePop } from './motion';
import { hardShadow, ui, C } from './ui';

const tilts = [-1.6, 1.2, -0.8, 1.8];
const tones = [C.butter, C.lilac, C.pink, C.mint, C.sky, C.peach];
const imageTones = ['#FFE9B0', '#E3D6FF', '#FFD6E3', '#D3F0DD', '#D6E8FF', '#FFDCC4'];

export function initials(name: string) {
  return name
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
}

function stockNote(p: Product) {
  if (!p.variants?.length) return null;
  const left = p.variants.reduce((sum, v) => sum + v.stock, 0);
  if (left === 0) return 'Sold out';
  if (left <= 4) return `Only ${left} left`;
  return null;
}

export function ProductCard({
  product: p,
  colors,
  index = 0,
}: {
  product: Product;
  /** Passed inside a seller's own storefront, so the card follows their theme instead of Nook's. */
  colors?: Document['theme']['colors'];
  index?: number;
}) {
  const { me, requireAuth, refresh, notify } = useApp();
  const saved = me?.favorites.includes(p.id);
  const heart = usePop();
  const plain = !!colors;
  const note = stockNote(p);
  const label = !plain && index === 0 ? 'NOOK PICK' : note ? note.toUpperCase() : null;
  const card = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressable
        onPress={() => router.push(`/product/${p.slug}`)}
        accessibilityLabel={`View ${p.title}`}
      >
        <View
          style={
            plain
              ? { borderRadius: 16, overflow: 'hidden', backgroundColor: '#EDE5F5' }
              : {
                  borderWidth: 2,
                  borderColor: C.ink,
                  borderRadius: 22,
                  overflow: 'hidden',
                  backgroundColor: imageTones[index % imageTones.length],
                  transform: [{ rotate: `${tilts[index % tilts.length]}deg` }],
                }
          }
        >
          <Image source={{ uri: imageUri(p.image) }} style={{ width: '100%', aspectRatio: 0.8 }} />
          {label && (
            <View
              style={{
                position: 'absolute',
                left: 8,
                bottom: 10,
                backgroundColor: note ? C.pink : C.butter,
                borderWidth: 1.5,
                borderColor: C.ink,
                borderRadius: 20,
                paddingHorizontal: 9,
                paddingVertical: 3,
                transform: [{ rotate: '-3deg' }],
              }}
            >
              <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: C.ink }}>
                {label}
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors?.text || C.ink,
            marginTop: 14,
            lineHeight: 20,
            letterSpacing: -0.2,
          }}
        >
          {p.title}
        </Text>
        {plain ? (
          <Text style={[ui.price, { fontSize: 14, marginTop: 5, color: colors?.accent || C.ink }]}>
            {money(p.price_minor)}
          </Text>
        ) : (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 7,
              backgroundColor: C.butter,
              borderWidth: 2,
              borderColor: C.ink,
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 1,
              transform: [{ rotate: '1.5deg' }],
              ...hardShadow(2, 2),
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>
              {money(p.price_minor)}
            </Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, fontWeight: '600', color: colors?.muted || C.ink2, marginTop: 9 }}
        >
          {p.shop_name} ↗
        </Text>
      </Pressable>
      <Animated.View style={[{ position: 'absolute', top: 8, right: 8 }, heart.style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Unsave ${p.title}` : `Save ${p.title}`}
          onPress={async () => {
            if (!requireAuth()) return;
            try {
              await api(`/products/${p.id}/favorite`, { method: saved ? 'DELETE' : 'POST' });
              if (!saved) heart.pop();
              await refresh();
            } catch (e) {
              notify((e as Error).message);
            }
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: saved ? C.persimmon : C.card,
            borderWidth: 2,
            borderColor: C.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={C.ink} />
        </Pressable>
      </Animated.View>
    </View>
  );
  return plain ? (
    card
  ) : (
    <Reveal style={{ flex: 1, minWidth: 0 }} delay={(index % 2) * 90}>
      {card}
    </Reveal>
  );
}

export const SHOP_CARD_WIDTH = 252;

/** A shop is a nook: an arched window onto the place, with a little name plate under it. */
export function ShopCard({ shop: s, index = 0 }: { shop: Shop; index?: number }) {
  const { me, requireAuth, refresh, notify } = useApp();
  const followed = me?.following.includes(s.id);
  const follow = usePop();
  const inner = SHOP_CARD_WIDTH - 28;
  return (
    <Reveal
      pop
      delay={index * 70}
      style={{ width: SHOP_CARD_WIDTH, paddingBottom: 5, paddingRight: 4 }}
    >
      <View
        style={{
          position: 'absolute',
          left: 4,
          right: 0,
          top: 5,
          bottom: 0,
          borderRadius: 30,
          backgroundColor: C.ink,
        }}
      />
      <View
        style={{
          backgroundColor: tones[index % tones.length],
          borderWidth: 2,
          borderColor: C.ink,
          borderRadius: 30,
          padding: 12,
        }}
      >
        <Pressable
          onPress={() => router.push(`/shop/${s.slug}`)}
          accessibilityLabel={`Visit ${s.name}`}
        >
          <View style={{ width: inner, height: inner * 1.1 }}>
            <View
              style={{
                width: inner,
                height: inner * 1.1,
                borderTopLeftRadius: inner / 2,
                borderTopRightRadius: inner / 2,
                borderBottomLeftRadius: 14,
                borderBottomRightRadius: 14,
                borderWidth: 2,
                borderColor: C.ink,
                overflow: 'hidden',
                backgroundColor: C.card,
              }}
            >
              <Image
                source={{ uri: imageUri(s.cover) }}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                left: -4,
                top: 18,
                backgroundColor: C.card,
                borderWidth: 2,
                borderColor: C.ink,
                borderRadius: 20,
                paddingHorizontal: 11,
                paddingVertical: 3,
                transform: [{ rotate: '-5deg' }],
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{s.category}</Text>
            </View>
            <View
              style={{
                position: 'absolute',
                right: 10,
                bottom: 10,
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: C.persimmon,
                borderWidth: 2,
                borderColor: C.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="arrow-up-outline"
                size={18}
                color={C.ink}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.card,
                borderWidth: 2,
                borderColor: C.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: font.display, fontSize: 17, color: C.ink }}>
                {initials(s.name)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 44 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.2 }}
              >
                {s.name}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 12.5, color: C.ink, opacity: 0.8, marginTop: 1 }}
              >
                {s.location}
              </Text>
            </View>
          </View>
          <Text
            numberOfLines={2}
            style={{ fontSize: 14, lineHeight: 20, color: C.ink, marginTop: 10 }}
          >
            {s.bio}
          </Text>
        </Pressable>
        <Animated.View
          style={[{ position: 'absolute', right: 12, top: inner * 1.1 + 22 }, follow.style]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${followed ? 'Unfollow' : 'Follow'} ${s.name}`}
            onPress={async () => {
              if (!requireAuth()) return;
              try {
                await api(`/shops/${s.id}/follow`, { method: followed ? 'DELETE' : 'POST' });
                if (!followed) follow.pop();
                await refresh();
              } catch (e) {
                notify((e as Error).message);
              }
            }}
            style={{
              borderRadius: 21,
              backgroundColor: followed ? C.ink : C.card,
              borderWidth: 2,
              borderColor: C.ink,
              width: 42,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={followed ? 'checkmark' : 'add'}
              size={20}
              color={followed ? C.paper : C.ink}
            />
          </Pressable>
        </Animated.View>
      </View>
    </Reveal>
  );
}
