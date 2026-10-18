import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Modal, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Product } from '@lilac/api-client';
import { money } from '@lilac/renderer';
import { api, imageUri } from '../lib';
import { AuthGate, useApp } from '../components/provider';
import { Button, Field, Loading, ui, C } from '../components/ui';
import { Collections } from '../components/collections';
interface Form {
  title: string;
  description: string;
  price_minor: number;
  image: string;
  category: string;
  status: string;
  variants: { sku: string; options: Record<string, string>; price_minor: number; stock: number }[];
}
const blank = (): Form => ({
  title: '',
  description: '',
  price_minor: 5000,
  image: 'seed_product_0',
  category: 'Lifestyle',
  status: 'draft',
  variants: [
    { sku: `ITEM-${Date.now()}`, options: { Finish: 'Original' }, price_minor: 5000, stock: 10 },
  ],
});
export default function Page() {
  return (
    <AuthGate>
      <Products />
    </AuthGate>
  );
}
function Products() {
  const { me, notify } = useApp();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () =>
    api<{ items: Product[] }>(`/shops/${me!.shop.id}/products`)
      .then((r) => setProducts(r.items))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [me]);
  const change = (key: keyof Form, v: unknown) => setForm({ ...form!, [key]: v });
  const upload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
    });
    if (r.canceled) return;
    setBusy(true);
    try {
      const f = r.assets[0];
      const body = new FormData();
      body.append('file', {
        uri: f.uri,
        name: f.fileName || 'product.jpg',
        type: f.mimeType || 'image/jpeg',
      } as unknown as Blob);
      body.append('shop_id', me!.shop.id);
      body.append('alt', form?.title || 'Product photo');
      const a = await api<{ id: string }>('/uploads', { method: 'POST', body });
      change('image', a.id);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>YOUR SELLER STUDIO</Text>
      <Text style={ui.title}>Your little collection.</Text>
      <Button
        title="+ Add a product"
        disabled={!me!.seller_enabled}
        style={{ marginTop: 20 }}
        onPress={() => {
          setEditing(null);
          setForm(blank());
          setError('');
        }}
      />
      {!me!.seller_enabled && (
        <Text style={ui.fine}>Enable sandbox selling in My Space first.</Text>
      )}
      {error && <Text style={ui.error}>{error}</Text>}
      {products?.map((p) => (
        <View key={p.id} style={[ui.card, { marginTop: 20 }]}>
          <View style={ui.row}>
            <Image
              source={{ uri: imageUri(p.image) }}
              accessibilityLabel={p.title}
              style={{ width: 70, height: 80, borderRadius: 9 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{p.title}</Text>
              <Text style={ui.price}>{money(p.price_minor)}</Text>
              <Text style={ui.fine}>
                {p.variants.length} variants · {p.status}
              </Text>
            </View>
          </View>
          <Button
            title="Edit product"
            soft
            style={{ marginTop: 15 }}
            onPress={() => {
              setEditing(p.id);
              setForm({
                title: p.title,
                description: p.description,
                price_minor: p.price_minor,
                image: p.image,
                category: p.category,
                status: p.status,
                variants: p.variants.map((v) => ({
                  sku: v.sku,
                  options: v.options,
                  price_minor: v.price_minor,
                  stock: v.stock,
                })),
              });
              setError('');
            }}
          />
        </View>
      ))}
      {products === null && !error && <Loading />}
      {products !== null && <Collections shopId={me!.shop.id} products={products} />}
      <Modal
        visible={form !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setForm(null)}
      >
        {form && (
          <ScrollView
            style={ui.screen}
            contentContainerStyle={[ui.content, { paddingTop: 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Button title="Close product ×" soft onPress={() => setForm(null)} />
            <Text style={ui.sectionTitle}>
              {editing ? 'A little update.' : 'A new little find.'}
            </Text>
            <Field
              label="Product name"
              value={form.title}
              maxLength={160}
              onChangeText={(v) => change('title', v)}
            />
            <Field
              label="Tell its story"
              value={form.description}
              multiline
              onChangeText={(v) => change('description', v)}
            />
            <Field
              label="Base price (RM)"
              value={String(form.price_minor / 100)}
              keyboardType="decimal-pad"
              onChangeText={(v) => change('price_minor', Math.round(Number(v) * 100))}
            />
            <Text style={ui.label}>Category</Text>
            <View style={ui.wrap}>
              {['Fashion', 'Home & living', 'Art & prints', 'Jewelry', 'Beauty', 'Lifestyle'].map(
                (v) => (
                  <Button
                    key={v}
                    title={v === form.category ? `✓ ${v}` : v}
                    soft
                    onPress={() => change('category', v)}
                  />
                ),
              )}
            </View>
            <Button
              title="Choose & crop product photo"
              soft
              disabled={busy}
              style={{ marginTop: 20 }}
              onPress={() => void upload()}
            />
            <Text style={ui.sectionTitle}>Variants & inventory</Text>
            {form.variants.map((v, i) => (
              <View key={i} style={ui.card}>
                <Field
                  label="SKU"
                  value={v.sku}
                  editable={!editing}
                  onChangeText={(value) =>
                    change(
                      'variants',
                      form.variants.map((x, j) => (i === j ? { ...x, sku: value } : x)),
                    )
                  }
                />
                <Field
                  label="Finish / option"
                  value={Object.values(v.options)[0] || ''}
                  onChangeText={(value) =>
                    change(
                      'variants',
                      form.variants.map((x, j) =>
                        i === j ? { ...x, options: { Finish: value } } : x,
                      ),
                    )
                  }
                />
                <Field
                  label="Price (RM)"
                  value={String(v.price_minor / 100)}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    change(
                      'variants',
                      form.variants.map((x, j) =>
                        i === j ? { ...x, price_minor: Math.round(Number(value) * 100) } : x,
                      ),
                    )
                  }
                />
                <Field
                  label="Available stock"
                  value={String(v.stock)}
                  keyboardType="number-pad"
                  onChangeText={(value) =>
                    change(
                      'variants',
                      form.variants.map((x, j) => (i === j ? { ...x, stock: Number(value) } : x)),
                    )
                  }
                />
              </View>
            ))}
            <Button
              title="+ Add a variant"
              soft
              onPress={() =>
                change('variants', [
                  ...form.variants,
                  {
                    sku: `VAR-${Date.now()}`,
                    options: { Finish: 'New finish' },
                    price_minor: form.price_minor,
                    stock: 0,
                  },
                ])
              }
            />
            <Text style={ui.label}>Availability</Text>
            <View style={ui.wrap}>
              {['draft', 'published', 'archived'].map((v) => (
                <Button
                  key={v}
                  title={v === form.status ? `✓ ${v}` : v}
                  soft
                  onPress={() => change('status', v)}
                />
              ))}
            </View>
            {error && <Text style={ui.error}>{error}</Text>}
            <Button
              title={busy ? 'Saving…' : 'Save product'}
              disabled={
                busy ||
                !form.title ||
                form.variants.some(
                  (v) =>
                    !v.sku ||
                    !Number.isInteger(v.price_minor) ||
                    !Number.isInteger(v.stock) ||
                    v.stock < 0,
                )
              }
              style={{ marginTop: 25 }}
              onPress={async () => {
                setBusy(true);
                try {
                  await api(editing ? `/products/${editing}` : `/shops/${me!.shop.id}/products`, {
                    method: editing ? 'PATCH' : 'POST',
                    body: JSON.stringify(form),
                  });
                  setForm(null);
                  await load();
                  notify('Your product is saved.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Text style={ui.fine}>All selling is sandbox only in this preview.</Text>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}
