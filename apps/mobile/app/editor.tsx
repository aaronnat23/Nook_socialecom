import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  blockTypes,
  makeBlock,
  themes,
  personalizeTemplate,
  templateDetails,
  validateDocument,
  type Block,
  type BlockType,
  type Style,
  type Font,
} from '@lilac/schema';
import type { Product, Draft } from '@lilac/api-client';
import { api } from '../lib';
import { AuthGate, useApp } from '../components/provider';
import { Storefront } from '../components/storefront';
import { Button, Field, Loading, ui, C } from '../components/ui';
import { useEditor, clone } from '../components/use-editor';
import { Sheet } from '../components/sheet';
import { TemplateArtwork } from '../components/templates';
const blockInfo: Record<
  BlockType,
  { title: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  hero: {
    title: 'Hero banner',
    description: 'Make a beautiful first impression',
    icon: 'albums-outline',
  },
  profileHeader: {
    title: 'Profile',
    description: 'The person behind the space',
    icon: 'person-circle-outline',
  },
  text: {
    title: 'Story & text',
    description: 'A few words, a little personality',
    icon: 'text-outline',
  },
  image: { title: 'Image', description: 'Let a photograph tell the story', icon: 'image-outline' },
  gallery: {
    title: 'Gallery',
    description: 'A collection of visual moments',
    icon: 'images-outline',
  },
  productGrid: {
    title: 'Product grid',
    description: 'Good things, all together',
    icon: 'grid-outline',
  },
  featuredProduct: {
    title: 'Spotlight',
    description: 'Give a favorite its moment',
    icon: 'cube-outline',
  },
  button: {
    title: 'Button',
    description: 'A clear next step',
    icon: 'arrow-forward-circle-outline',
  },
  divider: { title: 'Divider', description: 'A subtle change of chapter', icon: 'remove-outline' },
  spacer: {
    title: 'Breathing room',
    description: 'A little space between things',
    icon: 'resize-outline',
  },
  columns: { title: 'Columns', description: 'Two ideas, side by side', icon: 'copy-outline' },
  socialLinks: {
    title: 'Social links',
    description: 'Find your people everywhere',
    icon: 'link-outline',
  },
  announcement: {
    title: 'Announcement',
    description: 'Something worth sharing',
    icon: 'megaphone-outline',
  },
};
function allBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => [b, ...allBlocks(b.children || [])]);
}
function changeTree(items: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return items.map((b) =>
    b.id === id ? fn(b) : b.children ? { ...b, children: changeTree(b.children, id, fn) } : b,
  );
}
export default function Page() {
  return (
    <AuthGate>
      <Editor />
    </AuthGate>
  );
}
type EditorSheet = 'properties' | 'layers' | 'themes' | 'template' | 'add' | 'versions';
function Editor() {
  const { template: requestedTemplate } = useLocalSearchParams<{ template?: string }>();
  const { me, notify } = useApp();
  const editor = useEditor(me!.shop.id);
  const { doc } = editor;
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState('hero');
  const [sheet, setSheet] = useState<EditorSheet | null>(null);
  const [lastSheet, setLastSheet] = useState<EditorSheet>('add');
  const panel = sheet || lastSheet;
  useEffect(() => {
    if (sheet) setLastSheet(sheet);
  }, [sheet]);
  const [tab, setTab] = useState('Content');
  const [preview, setPreview] = useState(false);
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [held, setHeld] = useState('');
  const [versions, setVersions] = useState<
    { id: string; versionNo: number; note: string; created_at: string }[]
  >([]);
  const [advanced, setAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(themes[0].id);
  const [applying, setApplying] = useState(false);
  useEffect(() => {
    if (!requestedTemplate || !themes.some((t) => t.id === requestedTemplate)) return;
    setSelectedTemplate(requestedTemplate);
    const timer = setTimeout(() => setSheet('template'), 400);
    return () => clearTimeout(timer);
  }, [requestedTemplate]);
  useEffect(() => {
    api<{ items: { id: string; title: string }[] }>(`/shops/${me!.shop.id}/collections`)
      .then((r) => setCollections(r.items))
      .catch(() => {});
    api<{ items: Product[] }>(`/shops/${me!.shop.id}/products`)
      .then((r) => setProducts(r.items))
      .catch((e) => notify(e.message));
  }, [me]);
  if (!doc)
    return (
      <SafeAreaView style={ui.screen}>
        <Loading />
        {editor.error && (
          <View style={ui.content}>
            <Text style={ui.error}>{editor.error}</Text>
            <Button title="Retry" onPress={() => void editor.reload()} />
          </View>
        )}
      </SafeAreaView>
    );
  const blocks = allBlocks(doc.sections.flatMap((s) => s.children));
  const block = blocks.find((b) => b.id === selected);
  const change = (fn: (b: Block) => Block) => {
    const next = clone(doc);
    next.sections = next.sections.map((s) => ({
      ...s,
      children: changeTree(s.children, selected, fn),
    }));
    editor.commit(next);
  };
  const props = (k: string, v: unknown) => change((b) => ({ ...b, props: { ...b.props, [k]: v } }));
  const style = (k: keyof Style, v: unknown, responsive = false) =>
    change((b) =>
      responsive && breakpoint !== 'desktop'
        ? {
            ...b,
            responsive: {
              ...b.responsive,
              [breakpoint]: { style: { ...b.responsive?.[breakpoint]?.style, [k]: v } },
            },
          }
        : { ...b, style: { ...b.style, [k]: v } },
    );
  const move = (id: string, delta: number) => {
    const next = clone(doc);
    const walk = (items: Block[]): boolean => {
      const i = items.findIndex((b) => b.id === id);
      if (i >= 0) {
        const j = i + delta;
        if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]];
        return true;
      }
      return items.some((b) => b.children && walk(b.children));
    };
    for (const s of next.sections) if (walk(s.children)) break;
    editor.commit(next);
  };
  const duplicate = () => {
    if (!block) return;
    const next = clone(doc);
    const duplicateBlock = (b: Block): Block => ({
      ...clone(b),
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...(b.children ? { children: b.children.map(duplicateBlock) } : {}),
    });
    const walk = (items: Block[]): boolean => {
      const i = items.findIndex((b) => b.id === selected);
      if (i >= 0) {
        const copy = duplicateBlock(items[i]);
        items.splice(i + 1, 0, copy);
        setSelected(copy.id);
        return true;
      }
      return items.some((b) => b.children && walk(b.children));
    };
    for (const s of next.sections) if (walk(s.children)) break;
    if (validateDocument(next).valid) editor.commit(next);
    else notify('This page has reached its block or nesting limit.');
  };
  const remove = () => {
    const next = clone(doc);
    const walk = (items: Block[]): Block[] =>
      items
        .filter((b) => b.id !== selected)
        .map((b) => (b.children ? { ...b, children: walk(b.children) } : b));
    next.sections = next.sections.map((s) => ({ ...s, children: walk(s.children) }));
    editor.commit(next);
    setSheet(null);
  };
  const add = (type: BlockType, target?: string) => {
    const next = clone(doc);
    const b = makeBlock(type);
    if (type === 'featuredProduct') b.props.productId = products[0]?.id || '';
    if (!next.sections.length) next.sections.push({ id: 'main', type: 'section', children: [] });
    if (target) {
      next.sections = next.sections.map((section) => ({
        ...section,
        children: changeTree(section.children, target, (parent) => ({
          ...parent,
          children: [...(parent.children || []), b],
        })),
      }));
    } else next.sections[0].children.push(b);
    if (!validateDocument(next).valid) {
      notify('This page supports up to 80 blocks.');
      return;
    }
    editor.commit(next);
    setSelected(b.id);
    setTab('Content');
    setSheet('properties');
  };
  const upload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Allow photo access to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const item = result.assets[0];
      const form = new FormData();
      form.append('file', {
        uri: item.uri,
        name: item.fileName || 'shop-photo.jpg',
        type: item.mimeType || 'image/jpeg',
      } as unknown as Blob);
      form.append('shop_id', me!.shop.id);
      form.append('alt', block?.props.alt || block?.props.headline || 'Shop collection photo');
      const r = await api<{ id: string; alt: string }>('/uploads', { method: 'POST', body: form });
      if (block?.type === 'gallery')
        props('images', [...(block.props.images || []), { imageAssetId: r.id, alt: r.alt }]);
      else change((b) => ({ ...b, props: { ...b.props, imageAssetId: r.id, alt: r.alt } }));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const publish = async () => {
    setBusy(true);
    try {
      const revision = await editor.flush();
      await api(`/shops/${me!.shop.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          expectedRevision: revision,
          note: 'Published from the native editor',
        }),
      });
      notify('Your space is live. A good little update.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openVersions = async () => {
    try {
      const r = await api<{ items: typeof versions }>(`/shops/${me!.shop.id}/versions`);
      setVersions(r.items);
      setSheet('versions');
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const s = block?.style || {};
  const chosenTheme = themes.find((t) => t.id === selectedTemplate)!;
  const applyTemplate = async () => {
    setApplying(true);
    try {
      const revision = await editor.flush();
      await api(`/shops/${me!.shop.id}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({
          expectedRevision: revision,
          note: 'Before applying a native template',
        }),
      });
      const next = personalizeTemplate(
        chosenTheme.document,
        me!.shop,
        products.filter((p) => p.status === 'published').map((p) => p.id),
      );
      editor.commit(next);
      setSelected(
        allBlocks(next.sections.flatMap((s) => s.children)).find((b) => b.type === 'hero')?.id ||
          next.sections[0]?.children[0]?.id ||
          '',
      );
      setSheet(null);
      notify('Your new layout is ready. Publish when it feels like you.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setApplying(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <View
        style={{
          padding: 12,
          borderBottomWidth: 1,
          borderColor: C.border,
          backgroundColor: '#FFF',
        }}
      >
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <TouchableOpacity
            accessibilityLabel="Back to My Space"
            onPress={() => router.back()}
            style={{ padding: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={C.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{me!.shop.name}</Text>
            <Text
              accessibilityLiveRegion="polite"
              style={{ fontSize: 9, color: C.muted, marginTop: 4 }}
            >
              {editor.state === 'saved'
                ? '✓ All changes saved'
                : editor.state === 'offline'
                  ? 'Offline · changes on this device'
                  : editor.state === 'conflict'
                    ? 'This space changed elsewhere'
                    : editor.state === 'saving'
                      ? 'Saving your draft…'
                      : 'Draft changes'}
            </Text>
          </View>
          <Button
            title={busy ? 'Publishing…' : 'Publish ↑'}
            disabled={
              busy ||
              uploading ||
              !validateDocument(doc).valid ||
              ['offline', 'conflict'].includes(editor.state)
            }
            onPress={() => void publish()}
          />
        </View>
      </View>
      {editor.state === 'conflict' && (
        <View style={{ padding: 12, backgroundColor: '#FFF2DC' }}>
          <Text style={{ fontSize: 11, color: '#A07A42' }}>
            Your draft changed on another device.
          </Text>
          <View style={[ui.row, { marginTop: 10 }]}>
            <Button
              title="Save local as copy"
              soft
              onPress={() =>
                void Share.share({ message: editor.copy(), title: 'My space draft copy' })
              }
            />
            <Button
              title="Reload latest"
              soft
              onPress={() =>
                Alert.alert(
                  'Reload latest draft?',
                  'Save your local copy first. Reloading replaces this device’s draft.',
                  [
                    { text: 'Keep editing', style: 'cancel' },
                    { text: 'Reload latest', onPress: () => void editor.reload() },
                  ],
                )
              }
            />
          </View>
        </View>
      )}
      {editor.state === 'error' && (
        <View style={{ padding: 12 }}>
          <Text style={ui.error}>{editor.error}</Text>
          <Button
            title="Retry saving"
            soft
            onPress={() => void editor.save().catch((e) => notify(e.message))}
          />
        </View>
      )}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F0EBF5' }}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
      >
        <Text style={[ui.eyebrow, { textAlign: 'center', fontSize: 8, marginVertical: 10 }]}>
          {preview ? 'BUYER PREVIEW' : 'YOUR CREATIVE CANVAS'}
        </Text>
        <ScrollView horizontal={breakpoint !== 'mobile'} scrollEnabled={breakpoint !== 'mobile'}>
          <View
            style={{
              width: breakpoint === 'mobile' ? width - 24 : breakpoint === 'tablet' ? 768 : 1280,
            }}
          >
            <Storefront
              document={doc}
              products={products.filter((p) => p.status === 'published')}
              shop={me!.shop}
              width={breakpoint === 'mobile' ? width - 24 : breakpoint === 'tablet' ? 768 : 1280}
              editing={!preview}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setSheet('properties');
              }}
            />
          </View>
        </ScrollView>
        <Button
          title="+ Add a little something"
          soft
          style={{ marginTop: 18 }}
          onPress={() => setSheet('add')}
        />
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: '#FFF',
          paddingVertical: 9,
          borderTopWidth: 1,
          borderColor: C.border,
        }}
      >
        {[
          { label: 'Add', icon: 'add-circle-outline' as const, onPress: () => setSheet('add') },
          { label: 'Layers', icon: 'layers-outline' as const, onPress: () => setSheet('layers') },
          {
            label: 'Themes',
            icon: 'color-palette-outline' as const,
            onPress: () => setSheet('themes'),
          },
          {
            label: 'Undo',
            icon: 'arrow-undo-outline' as const,
            onPress: editor.undo,
            disabled: !editor.canUndo,
          },
          {
            label: 'Redo',
            icon: 'arrow-redo-outline' as const,
            onPress: editor.redo,
            disabled: !editor.canRedo,
          },
          {
            label: preview ? 'Edit' : 'Preview',
            icon: 'eye-outline' as const,
            onPress: () => setPreview(!preview),
          },
        ].map((t) => (
          <TouchableOpacity
            key={t.label}
            accessibilityRole="button"
            disabled={t.disabled}
            onPress={t.onPress}
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: 0,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: t.disabled ? 0.4 : 1,
            }}
          >
            <Ionicons name={t.icon} size={21} color={C.primary} />
            <Text
              maxFontSizeMultiplier={1.4}
              style={{ fontSize: 9, color: C.primary, marginTop: 5 }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Sheet
        visible={sheet !== null}
        onClose={() => {
          if (!applying) setSheet(null);
        }}
        title={
          panel === 'properties'
            ? 'Make it feel like you.'
            : panel === 'layers'
              ? 'Every little layer.'
              : panel === 'themes'
                ? 'Find your signature look.'
                : panel === 'template'
                  ? chosenTheme.name
                  : panel === 'versions'
                    ? 'Every version of you.'
                    : 'Build something beautiful.'
        }
        eyebrow={
          panel === 'properties' && block
            ? blockInfo[block.type].title.toUpperCase()
            : panel === 'template' || panel === 'themes'
              ? 'THE TEMPLATE COLLECTION'
              : 'YOUR DESIGN STUDIO'
        }
        subtitle={
          panel === 'add'
            ? 'Thoughtful building blocks for a space of your own.'
            : panel === 'themes'
              ? 'Eight starting points. Endless ways to make them yours.'
              : panel === 'layers'
                ? 'Arrange the story, one section at a time.'
                : undefined
        }
      >
        <ScrollView
          key={panel}
          contentContainerStyle={ui.content}
          keyboardShouldPersistTaps="handled"
        >
          {panel === 'properties' && block ? (
            <>
              <View style={[ui.row, { marginBottom: 18 }]}>
                {['Content', 'Style', 'Layout', 'Responsive'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={{
                      backgroundColor: tab === t ? C.primary : '#F0EAF7',
                      padding: 10,
                      borderRadius: 13,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: tab === t ? '#FFF' : C.primary }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tab === 'Content' ? (
                <>
                  {[
                    'hero',
                    'profileHeader',
                    'text',
                    'gallery',
                    'productGrid',
                    'featuredProduct',
                    'columns',
                  ].includes(block.type) && (
                    <Field
                      label="Heading"
                      value={block.props.headline || ''}
                      maxLength={200}
                      onChangeText={(v) => props('headline', v)}
                    />
                  )}
                  {['hero', 'profileHeader'].includes(block.type) && (
                    <Field
                      label="Introduction"
                      multiline
                      value={block.props.subtitle || ''}
                      maxLength={600}
                      onChangeText={(v) => props('subtitle', v)}
                    />
                  )}
                  {['text', 'announcement'].includes(block.type) && (
                    <Field
                      label="Your words"
                      multiline
                      value={block.props.text || ''}
                      maxLength={block.type === 'text' ? 6000 : 600}
                      onChangeText={(v) => props('text', v)}
                    />
                  )}
                  {['hero', 'profileHeader', 'image', 'gallery'].includes(block.type) && (
                    <>
                      <Button
                        title={uploading ? 'Preparing image…' : 'Choose & crop a photo'}
                        soft
                        disabled={uploading}
                        style={{ marginTop: 20 }}
                        onPress={() => void upload()}
                      />
                      {block.type !== 'gallery' && (
                        <Field
                          label="Image description / alt text"
                          value={block.props.alt || ''}
                          maxLength={300}
                          onChangeText={(v) => props('alt', v)}
                        />
                      )}
                      {block.type === 'gallery' &&
                        block.props.images?.map((im, i) => (
                          <View key={i}>
                            <Field
                              label={`Photo ${i + 1} description`}
                              value={im.alt}
                              maxLength={300}
                              onChangeText={(v) =>
                                props(
                                  'images',
                                  block.props.images!.map((x, j) =>
                                    i === j ? { ...x, alt: v } : x,
                                  ),
                                )
                              }
                            />
                            <Button
                              title="Remove photo"
                              soft
                              onPress={() =>
                                props(
                                  'images',
                                  block.props.images!.filter((_, j) => j !== i),
                                )
                              }
                            />
                          </View>
                        ))}
                    </>
                  )}
                  {block.type === 'socialLinks' && (
                    <>
                      {block.props.links?.map((link, i) => (
                        <View key={i} style={ui.card}>
                          <Field
                            label="Link label"
                            value={link.label}
                            onChangeText={(v) =>
                              props(
                                'links',
                                block.props.links!.map((x, j) =>
                                  i === j ? { ...x, label: v } : x,
                                ),
                              )
                            }
                          />
                          <Field
                            label="Secure URL"
                            value={link.url}
                            autoCapitalize="none"
                            onChangeText={(v) =>
                              props(
                                'links',
                                block.props.links!.map((x, j) => (i === j ? { ...x, url: v } : x)),
                              )
                            }
                          />
                          <Button
                            title="Remove link"
                            soft
                            style={{ marginTop: 12 }}
                            onPress={() =>
                              props(
                                'links',
                                block.props.links!.filter((_, j) => i !== j),
                              )
                            }
                          />
                        </View>
                      ))}
                      <Button
                        title="+ Add social link"
                        soft
                        disabled={(block.props.links?.length || 0) >= 8}
                        onPress={() =>
                          props('links', [
                            ...(block.props.links || []),
                            { label: 'Find us here', url: 'https://instagram.com' },
                          ])
                        }
                      />
                    </>
                  )}
                  {block.type === 'columns' && (
                    <>
                      <Text style={ui.muted}>
                        Up to three blocks in a column section. They stack on phones.
                      </Text>
                      <View style={[ui.wrap, { marginTop: 15 }]}>
                        {(['text', 'image', 'productGrid', 'button'] as BlockType[]).map((t) => (
                          <Button
                            key={t}
                            title={`+ ${t}`}
                            soft
                            disabled={(block.children?.length || 0) >= 3}
                            onPress={() => add(t, block.id)}
                          />
                        ))}
                      </View>
                    </>
                  )}
                  {block.type === 'text' && (
                    <>
                      <Text style={ui.label}>Rich text details</Text>
                      {block.props.nodes?.map((node, i) => (
                        <View key={i} style={ui.card}>
                          <Field
                            label={node.type}
                            value={node.text}
                            multiline
                            onChangeText={(v) =>
                              props(
                                'nodes',
                                block.props.nodes!.map((x, j) => (i === j ? { ...x, text: v } : x)),
                              )
                            }
                          />
                          {node.type === 'link' && (
                            <Field
                              label="Link URL"
                              value={node.url || ''}
                              autoCapitalize="none"
                              onChangeText={(v) =>
                                props(
                                  'nodes',
                                  block.props.nodes!.map((x, j) =>
                                    i === j ? { ...x, url: v } : x,
                                  ),
                                )
                              }
                            />
                          )}
                          <Button
                            title="Remove text detail"
                            soft
                            style={{ marginTop: 10 }}
                            onPress={() =>
                              props(
                                'nodes',
                                block.props.nodes!.filter((_, j) => i !== j),
                              )
                            }
                          />
                        </View>
                      ))}
                      <View style={ui.wrap}>
                        {(
                          ['paragraph', 'h2', 'h3', 'bold', 'italic', 'listItem', 'link'] as const
                        ).map((type) => (
                          <Button
                            key={type}
                            title={`+ ${{ paragraph: 'Paragraph', h2: 'Heading', h3: 'Subheading', bold: 'Bold text', italic: 'Italic text', listItem: 'List item', link: 'Link' }[type]}`}
                            soft
                            onPress={() =>
                              props('nodes', [
                                ...(block.props.nodes || []),
                                {
                                  type,
                                  text: 'Your words here',
                                  ...(type === 'link' ? { url: 'https://example.com' } : {}),
                                },
                              ])
                            }
                          />
                        ))}
                      </View>
                    </>
                  )}
                  {block.type === 'button' && (
                    <>
                      <Field
                        label="Button text"
                        value={block.props.label || ''}
                        onChangeText={(v) => props('label', v)}
                      />
                      <Field
                        label="Secure link or #section"
                        value={block.props.url || ''}
                        onChangeText={(v) => props('url', v)}
                        autoCapitalize="none"
                      />
                    </>
                  )}
                  {block.type === 'hero' && (
                    <>
                      <Field
                        label="Call to action"
                        value={block.props.cta?.label || ''}
                        onChangeText={(v) =>
                          props('cta', { label: v, url: block.props.cta?.url || '#products' })
                        }
                      />
                      <Field
                        label="Button link"
                        value={block.props.cta?.url || '#products'}
                        autoCapitalize="none"
                        onChangeText={(v) =>
                          props('cta', { label: block.props.cta?.label || 'Explore', url: v })
                        }
                      />
                    </>
                  )}
                  {block.type === 'featuredProduct' &&
                    products.map((p) => (
                      <Button
                        key={p.id}
                        title={`${p.id === block.props.productId ? '✓ ' : ''}${p.title}`}
                        soft
                        onPress={() => props('productId', p.id)}
                        style={{ marginTop: 10 }}
                      />
                    ))}
                  {block.type === 'productGrid' && (
                    <>
                      <Text style={ui.label}>Collection</Text>
                      <View style={ui.wrap}>
                        <Button
                          title="All products"
                          soft
                          onPress={() =>
                            change((b) => ({ ...b, props: { ...b.props, source: 'all' } }))
                          }
                        />
                        {collections.map((c) => (
                          <Button
                            title={c.title}
                            key={c.id}
                            soft
                            onPress={() =>
                              change((b) => ({
                                ...b,
                                props: { ...b.props, source: 'collection', collectionId: c.id },
                              }))
                            }
                          />
                        ))}
                      </View>
                      <Numeric
                        label="Number of products"
                        value={block.props.limit || 12}
                        min={1}
                        max={24}
                        onChange={(v) => props('limit', v)}
                      />
                    </>
                  )}
                </>
              ) : tab === 'Style' ? (
                <>
                  <Text style={ui.label}>Font family</Text>
                  <View style={ui.wrap}>
                    {(['Inter', 'Georgia', 'Arial', 'Trebuchet MS', 'Courier New'] as Font[]).map(
                      (f) => (
                        <Button
                          key={f}
                          title={`${s.fontFamily === f ? '✓ ' : ''}${f}`}
                          soft
                          onPress={() => style('fontFamily', f)}
                        />
                      ),
                    )}
                  </View>
                  <Numeric
                    label="Heading / text size"
                    value={s.fontSize || 32}
                    min={10}
                    max={96}
                    onChange={(v) => style('fontSize', v)}
                  />
                  <Text style={ui.label}>Text alignment</Text>
                  <View style={ui.row}>
                    {['left', 'center', 'right'].map((v) => (
                      <Button key={v} title={v} soft onPress={() => style('textAlign', v)} />
                    ))}
                  </View>
                  <Color
                    label="Text color"
                    value={s.textColor || doc.theme.colors.text}
                    onChange={(v) => style('textColor', v)}
                  />
                  <Color
                    label="Background color"
                    value={s.backgroundColor || doc.theme.colors.background}
                    onChange={(v) => style('backgroundColor', v)}
                  />
                  <Text style={ui.label}>Background gradient</Text>
                  <View style={ui.wrap}>
                    {['none', 'lilac', 'sunset', 'forest'].map((v) => (
                      <Button key={v} title={v} soft onPress={() => style('gradient', v)} />
                    ))}
                  </View>
                  <Text style={ui.label}>Image aspect ratio</Text>
                  <View style={ui.wrap}>
                    {['auto', '1:1', '4:3', '3:4', '16:9'].map((v) => (
                      <Button key={v} title={v} soft onPress={() => style('aspectRatio', v)} />
                    ))}
                  </View>
                  <Numeric
                    label="Rounded corners"
                    value={s.borderRadius ?? doc.theme.radius}
                    min={0}
                    max={64}
                    onChange={(v) => style('borderRadius', v)}
                  />
                  <Text style={ui.label}>Image fit</Text>
                  <View style={ui.row}>
                    {['cover', 'contain'].map((v) => (
                      <Button key={v} title={v} soft onPress={() => style('imageFit', v)} />
                    ))}
                  </View>
                  <Numeric
                    label="Image focal X"
                    value={s.focalX ?? 50}
                    min={0}
                    max={100}
                    onChange={(v) => style('focalX', v)}
                  />
                  <Numeric
                    label="Image focal Y"
                    value={s.focalY ?? 50}
                    min={0}
                    max={100}
                    onChange={(v) => style('focalY', v)}
                  />
                  <Button
                    title={advanced ? 'Less detail' : 'Advanced details'}
                    soft
                    onPress={() => setAdvanced(!advanced)}
                    style={{ marginTop: 20 }}
                  />
                  {advanced && (
                    <>
                      <Numeric
                        label="Font weight"
                        value={s.fontWeight || 500}
                        min={400}
                        max={800}
                        step={100}
                        onChange={(v) => style('fontWeight', v)}
                      />
                      <Numeric
                        label="Line height"
                        value={s.lineHeight || 1.4}
                        min={1}
                        max={2.2}
                        step={0.1}
                        onChange={(v) => style('lineHeight', v)}
                      />
                      <Numeric
                        label="Letter spacing"
                        value={s.letterSpacing || 0}
                        min={-2}
                        max={10}
                        step={0.1}
                        onChange={(v) => style('letterSpacing', v)}
                      />
                      <Numeric
                        label="Border width"
                        value={s.borderWidth || 0}
                        min={0}
                        max={8}
                        onChange={(v) => style('borderWidth', v)}
                      />
                      <Color
                        label="Border color"
                        value={s.borderColor || doc.theme.colors.accent}
                        onChange={(v) => style('borderColor', v)}
                      />
                    </>
                  )}
                  <Button
                    title="Reset block style"
                    soft
                    style={{ marginTop: 20 }}
                    onPress={() =>
                      change((b) => ({ ...b, style: { paddingTop: 20, paddingBottom: 20 } }))
                    }
                  />
                </>
              ) : tab === 'Layout' ? (
                <>
                  {(
                    [
                      'paddingTop',
                      'paddingBottom',
                      'paddingLeft',
                      'paddingRight',
                      'marginTop',
                      'marginBottom',
                      'gap',
                    ] as const
                  ).map((k) => (
                    <Numeric
                      key={k}
                      label={k.replace(/([A-Z])/g, ' $1')}
                      value={s[k] ?? 0}
                      min={0}
                      max={160}
                      onChange={(v) => style(k, v)}
                    />
                  ))}
                  <Numeric
                    label="Minimum height"
                    value={s.minHeight || 0}
                    min={0}
                    max={800}
                    onChange={(v) => style('minHeight', v)}
                  />
                  <Numeric
                    label="Maximum width"
                    value={s.maxWidth || 1100}
                    min={280}
                    max={1440}
                    onChange={(v) => style('maxWidth', v)}
                  />
                  <Numeric
                    label="Columns"
                    value={s.columns || 2}
                    min={1}
                    max={4}
                    onChange={(v) => style('columns', v)}
                  />
                </>
              ) : (
                <>
                  <Text style={ui.muted}>Override the base design at a breakpoint.</Text>
                  <View style={[ui.wrap, { marginTop: 18 }]}>
                    {(['mobile', 'tablet', 'desktop'] as const).map((v) => (
                      <Button
                        key={v}
                        title={breakpoint === v ? `✓ ${v}` : v}
                        soft
                        onPress={() => setBreakpoint(v)}
                      />
                    ))}
                  </View>
                  <Numeric
                    label="Breakpoint text size"
                    value={
                      block.responsive?.[breakpoint === 'desktop' ? 'mobile' : breakpoint]?.style
                        ?.fontSize ||
                      s.fontSize ||
                      32
                    }
                    min={10}
                    max={96}
                    onChange={(v) => style('fontSize', v, true)}
                  />
                  <Numeric
                    label="Breakpoint columns"
                    value={
                      block.responsive?.[breakpoint === 'desktop' ? 'mobile' : breakpoint]?.style
                        ?.columns || 2
                    }
                    min={1}
                    max={breakpoint === 'mobile' ? 2 : 3}
                    onChange={(v) => style('columns', v, true)}
                  />
                  <Numeric
                    label="Breakpoint order"
                    value={
                      block.responsive?.[breakpoint === 'desktop' ? 'mobile' : breakpoint]?.style
                        ?.order ?? blocks.indexOf(block)
                    }
                    min={0}
                    max={80}
                    onChange={(v) => style('order', v, true)}
                  />
                  <Button
                    title="Hide at this breakpoint"
                    soft
                    onPress={() => style('visibility', 'hidden', true)}
                    style={{ marginTop: 15 }}
                  />
                  <Button
                    title="Show at this breakpoint"
                    soft
                    onPress={() => style('visibility', 'visible', true)}
                    style={{ marginTop: 10 }}
                  />
                </>
              )}
              <View style={ui.divider} />
              <View style={ui.row}>
                <Button
                  title="↑ Move up"
                  soft
                  onPress={() => move(selected, -1)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="↓ Move down"
                  soft
                  onPress={() => move(selected, 1)}
                  style={{ flex: 1 }}
                />
              </View>
              <View style={[ui.row, { marginTop: 10 }]}>
                <Button title="Duplicate" soft onPress={duplicate} style={{ flex: 1 }} />
                <Button title="Delete block" soft onPress={remove} style={{ flex: 1 }} />
              </View>
              <View style={ui.divider} />
              <Text style={ui.sectionTitle}>Whole-space palette</Text>
              {Object.entries(doc.theme.colors).map(([key, value]) => (
                <Color
                  key={key}
                  label={key}
                  value={value}
                  onChange={(v) =>
                    editor.commit({
                      ...doc,
                      theme: { ...doc.theme, colors: { ...doc.theme.colors, [key]: v } },
                    })
                  }
                />
              ))}
              <Text style={ui.label}>Whole-space heading font</Text>
              <View style={ui.wrap}>
                {(['Inter', 'Georgia', 'Arial', 'Courier New', 'Trebuchet MS'] as Font[]).map(
                  (f) => (
                    <Button
                      key={f}
                      title={f}
                      soft
                      onPress={() =>
                        editor.commit({ ...doc, theme: { ...doc.theme, fontHeading: f } })
                      }
                    />
                  ),
                )}
              </View>
              <Text style={ui.label}>Whole-space body font</Text>
              <View style={ui.wrap}>
                {(['Inter', 'Georgia', 'Arial', 'Courier New', 'Trebuchet MS'] as Font[]).map(
                  (f) => (
                    <Button
                      key={f}
                      title={f}
                      soft
                      onPress={() =>
                        editor.commit({ ...doc, theme: { ...doc.theme, fontBody: f } })
                      }
                    />
                  ),
                )}
              </View>
            </>
          ) : panel === 'layers' ? (
            <>
              <Text style={ui.muted}>
                {held
                  ? 'Tap another layer to place the held block above it.'
                  : 'Hold a layer to move it. Or use the accessible arrows.'}
              </Text>
              {blocks.map((b) => (
                <View
                  key={b.id}
                  style={[
                    ui.card,
                    {
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: selected === b.id ? C.lilac : '#FFF',
                    },
                  ]}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${b.type} layer`}
                    accessibilityActions={[
                      { name: 'increment', label: 'Move down' },
                      { name: 'decrement', label: 'Move up' },
                    ]}
                    onAccessibilityAction={(e) =>
                      move(b.id, e.nativeEvent.actionName === 'increment' ? 1 : -1)
                    }
                    onLongPress={() => setHeld(b.id)}
                    onPress={() => {
                      if (held && held !== b.id) {
                        const i = blocks.findIndex((x) => x.id === held);
                        const j = blocks.findIndex((x) => x.id === b.id);
                        move(held, j - i);
                        setHeld('');
                      } else {
                        setSelected(b.id);
                        setSheet('properties');
                      }
                    }}
                  >
                    <Text style={{ fontSize: 13, color: C.primary, padding: 10 }}>
                      {b.props.headline || b.type}
                    </Text>
                  </TouchableOpacity>
                  <View style={ui.row}>
                    <Button title="↑ Up" soft onPress={() => move(b.id, -1)} />
                    <Button title="↓ Down" soft onPress={() => move(b.id, 1)} />
                  </View>
                </View>
              ))}
              <Button title="Published version history" soft onPress={() => void openVersions()} />
            </>
          ) : panel === 'themes' ? (
            <View style={{ gap: 16 }}>
              {themes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${t.name}`}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedTemplate(t.id);
                    setSheet('template');
                  }}
                  style={[ui.card, { padding: 8, marginBottom: 0, overflow: 'hidden' }]}
                >
                  <TemplateArtwork theme={t} shop={me!.shop} products={products} />
                  <View style={{ padding: 15 }}>
                    <Text style={{ fontSize: 19, fontWeight: '600', color: C.text }}>{t.name}</Text>
                    <Text style={[ui.muted, { marginTop: 5 }]}>{t.description}</Text>
                    <View style={[ui.row, { marginTop: 12 }]}>
                      <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }}>
                        Explore this look
                      </Text>
                      <Ionicons name="arrow-forward" color={C.primary} size={16} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : panel === 'template' ? (
            <View style={{ gap: 18 }}>
              <TemplateArtwork theme={chosenTheme} shop={me!.shop} products={products} />
              <Text style={ui.muted}>{chosenTheme.description}</Text>
              <View style={ui.wrap}>
                {templateDetails[chosenTheme.id].features.map((f) => (
                  <Text style={ui.pill} key={f}>
                    {f}
                  </Text>
                ))}
              </View>
              <View style={[ui.card, { marginBottom: 0 }]}>
                <View style={[ui.row, { marginBottom: 10 }]}>
                  <Ionicons name="color-palette-outline" size={22} color={C.primary} />
                  <Text style={{ fontSize: 16, color: C.text, fontWeight: '600' }}>
                    Just the finishing touches
                  </Text>
                </View>
                <Text style={[ui.muted, { marginBottom: 17 }]}>
                  Bring this palette and font pairing to your current layout.
                </Text>
                <Button
                  title="Apply colors & fonts"
                  disabled={applying}
                  soft
                  onPress={() => {
                    editor.commit({ ...doc, theme: clone(chosenTheme.document.theme) });
                    setSheet(null);
                    notify('A fresh palette, with your layout just as you left it.');
                  }}
                />
              </View>
              <View style={[ui.card, { marginBottom: 0, borderColor: '#D7C2EE' }]}>
                <View style={[ui.row, { marginBottom: 10 }]}>
                  <Ionicons name="sparkles-outline" size={22} color={C.primary} />
                  <Text style={{ fontSize: 16, color: C.text, fontWeight: '600' }}>
                    Start a new chapter
                  </Text>
                </View>
                <Text style={[ui.muted, { marginBottom: 17 }]}>
                  Replace your draft blocks with this complete design. Your catalog stays, and a
                  backup keeps your current draft safe.
                </Text>
                <Button
                  title={applying ? 'Preparing your new space…' : 'Use this template'}
                  disabled={applying || uploading || ['offline', 'conflict'].includes(editor.state)}
                  onPress={() => void applyTemplate()}
                />
              </View>
              <Text style={[ui.fine, { textAlign: 'center', marginTop: 0 }]}>
                Your public space changes only when you publish.
              </Text>
              <Button
                title="← Explore other templates"
                soft
                disabled={applying}
                onPress={() => setSheet('themes')}
              />
            </View>
          ) : panel === 'add' ? (
            <View style={[ui.wrap, { gap: 12 }]}>
              {blockTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${blockInfo[type].title}`}
                  activeOpacity={0.8}
                  onPress={() => add(type)}
                  style={{
                    width: '48%',
                    minHeight: 152,
                    padding: 17,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#E7DDEF',
                    backgroundColor: '#FFF',
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 13,
                      backgroundColor: '#F1EAF9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Ionicons name={blockInfo[type].icon} size={21} color={C.primary} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                    {blockInfo[type].title}
                  </Text>
                  <Text style={{ fontSize: 10, lineHeight: 16, color: C.muted, marginTop: 6 }}>
                    {blockInfo[type].description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : panel === 'versions' ? (
            <>
              <Text style={ui.muted}>
                Restore creates a draft copy. Your public page stays unchanged until you publish.
              </Text>
              {versions.map((v) => (
                <View style={[ui.card, { marginTop: 15 }]} key={v.id}>
                  <Text style={{ fontSize: 15, color: C.text }}>Version {v.versionNo}</Text>
                  <Text style={ui.fine}>
                    {v.note} · {new Date(v.created_at).toLocaleString()}
                  </Text>
                  <Button
                    title="Restore as a draft"
                    soft
                    style={{ marginTop: 15 }}
                    onPress={async () => {
                      try {
                        const rev = await editor.flush();
                        await api<Draft>(`/shops/${me!.shop.id}/restore`, {
                          method: 'POST',
                          body: JSON.stringify({ versionId: v.id, expectedRevision: rev }),
                        });
                        await editor.reload();
                        setSheet(null);
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  />
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}
function Numeric({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <View style={ui.row}>
        <Button
          title="−"
          soft
          onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        />
        <TextInput
          accessibilityLabel={label}
          style={[ui.input, { flex: 1, textAlign: 'center' }]}
          keyboardType="decimal-pad"
          value={String(value)}
          onChangeText={(v) => {
            if (v !== '' && Number.isFinite(Number(v)))
              onChange(Math.max(min, Math.min(max, Number(v))));
          }}
        />
        <Button
          title="+"
          soft
          onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
        />
      </View>
    </View>
  );
}
function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [raw, setRaw] = useState(value);
  useEffect(() => setRaw(value), [value]);
  return (
    <View>
      <Field
        label={label}
        value={raw}
        autoCapitalize="none"
        maxLength={7}
        onChangeText={(v) => {
          setRaw(v);
          if (/^#[a-f\d]{6}$/i.test(v)) onChange(v);
        }}
      />
      <View style={[ui.wrap, { marginTop: 10 }]}>
        {['#FAF9FC', '#FFFFFF', '#302A3A', '#7852B7', '#C7ADE5', '#F5DFD4', '#B7C5AE'].map((c) => (
          <TouchableOpacity
            key={c}
            accessibilityLabel={`${label} ${c}`}
            onPress={() => onChange(c)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 18,
              backgroundColor: c,
              borderWidth: 2,
              borderColor: value.toLowerCase() === c.toLowerCase() ? '#8D64B5' : '#E7DDED',
            }}
          />
        ))}
      </View>
    </View>
  );
}
