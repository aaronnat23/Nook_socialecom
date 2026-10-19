import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Product } from '@lilac/api-client';
import { api } from '../lib';
import { useApp } from './provider';
import { Button, Field, ui, C } from './ui';
import { Sheet } from './sheet';

interface Collection {
  id: string;
  title: string;
  product_ids: string[];
}

export function Collections({ shopId, products }: { shopId: string; products: Product[] }) {
  const { notify } = useApp();
  const [items, setItems] = useState<Collection[]>([]);
  const [form, setForm] = useState<Collection | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setItems((await api<{ items: Collection[] }>(`/shops/${shopId}/collections`)).items);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, [shopId]);
  const move = (index: number, direction: number) => {
    if (!form) return;
    const ids = [...form.product_ids];
    const to = index + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    setForm({ ...form, product_ids: ids });
  };
  return (
    <View>
      <Text style={ui.sectionTitle}>Good things, together.</Text>
      <Text style={[ui.muted, { marginBottom: 15 }]}>
        Group products into collections for your storefront.
      </Text>
      {error && !form ? <Text style={ui.error}>{error}</Text> : null}
      {items.map((item) => (
        <View key={item.id} style={ui.card}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>{item.title}</Text>
          <Text style={[ui.muted, { marginVertical: 10 }]}>
            {item.product_ids.length} products · custom order
          </Text>
          <Button
            title={`Edit ${item.title}`}
            soft
            onPress={() => {
              setError('');
              setForm({ ...item, product_ids: [...item.product_ids] });
            }}
          />
        </View>
      ))}
      <Button
        title="+ New collection"
        soft
        onPress={() => {
          setError('');
          setForm({ id: '', title: '', product_ids: [] });
        }}
      />
      <Sheet
        visible={form !== null}
        title={form?.id ? 'Better, together.' : 'Curate a little collection.'}
        eyebrow="THE COLLECTION EDIT"
        subtitle="Bring your favorite pieces into one thoughtful group."
        onClose={() => {
          if (!busy) setForm(null);
        }}
      >
        {form ? (
          <ScrollView
            style={ui.screen}
            contentContainerStyle={ui.content}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label="Collection name"
              value={form.title}
              maxLength={160}
              onChangeText={(title) => setForm({ ...form, title })}
            />
            <Text style={[ui.muted, { marginVertical: 18 }]}>
              Choose products, then arrange their order below.
            </Text>
            {products.map((product) => {
              const checked = form.product_ids.includes(product.id);
              return (
                <TouchableOpacity
                  key={product.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={product.title}
                  onPress={() =>
                    setForm({
                      ...form,
                      product_ids: checked
                        ? form.product_ids.filter((id) => id !== product.id)
                        : [...form.product_ids, product.id],
                    })
                  }
                  style={[
                    ui.card,
                    ui.row,
                    {
                      padding: 14,
                      minHeight: 48,
                      marginBottom: 8,
                      borderColor: checked ? C.primary : C.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    color={C.primary}
                    size={23}
                  />
                  <Text style={[ui.muted, { flex: 1 }]}>{product.title}</Text>
                </TouchableOpacity>
              );
            })}
            {form.product_ids.length ? <Text style={ui.sectionTitle}>Product order</Text> : null}
            {form.product_ids.map((id, index) => {
              const title =
                products.find((product) => product.id === id)?.title || 'Unavailable product';
              return (
                <View key={id} style={ui.card}>
                  <Text style={ui.muted}>
                    {index + 1}. {title}
                  </Text>
                  <View style={[ui.row, { marginTop: 12 }]}>
                    <Button
                      title={`Move item ${index + 1} up`}
                      soft
                      disabled={index === 0 || busy}
                      onPress={() => move(index, -1)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={`Move item ${index + 1} down`}
                      soft
                      disabled={index === form.product_ids.length - 1 || busy}
                      onPress={() => move(index, 1)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              );
            })}
            {error ? <Text style={ui.error}>{error}</Text> : null}
            <Button
              title={busy ? 'Saving…' : 'Save collection'}
              disabled={busy || !form.title.trim()}
              style={{ marginTop: 20 }}
              onPress={async () => {
                setBusy(true);
                try {
                  await api(`/shops/${shopId}/collections${form.id ? `/${form.id}` : ''}`, {
                    method: form.id ? 'PATCH' : 'POST',
                    body: JSON.stringify({
                      title: form.title.trim(),
                      product_ids: form.product_ids,
                    }),
                  });
                  setForm(null);
                  await load();
                  notify('Your collection is saved.');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </ScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}
