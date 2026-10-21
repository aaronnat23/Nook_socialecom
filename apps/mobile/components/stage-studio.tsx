import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { Stage } from '@lilac/api-client';
import {
  backdropOptions,
  defaultStage,
  stageLimits,
  stagePalettes,
  withBackdropKind,
} from '@lilac/renderer';
import { api } from '../lib';
import { Text } from './text';
import { font } from './fonts';
import { ProductStage } from './stage';
import { Button, Field, Panel, RoundButton, ui, C } from './ui';

const isUpload = (id: string) => !id.startsWith('seed_');

/**
 * Where a seller sets a product's scene: pick a photo, lift the product off its background and
 * choose what sits behind it. The preview is the same component shoppers see.
 */
export function StageStudio({
  shopId,
  title,
  image,
  stage,
  onImage,
  onStage,
  onError,
}: {
  shopId: string;
  title: string;
  image: string;
  stage: Stage | null;
  onImage: (id: string) => void;
  onStage: (stage: Stage | null) => void;
  onError: (message: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [alreadyCut, setAlreadyCut] = useState(false);

  /** Picks a photo and uploads it; resolves to the new asset id, or null if the picker was closed. */
  const pick = async (keepAlpha: boolean) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError('Allow photo access in Settings to choose a picture.');
      return null;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // cropping re-encodes the picture and would flatten a transparent cut-out
      allowsEditing: !keepAlpha,
    });
    if (r.canceled) return null;
    const f = r.assets[0];
    const body = new FormData();
    body.append('file', {
      uri: f.uri,
      name: f.fileName || (keepAlpha ? 'product.png' : 'product.jpg'),
      type: f.mimeType || (keepAlpha ? 'image/png' : 'image/jpeg'),
    } as unknown as Blob);
    body.append('shop_id', shopId);
    body.append('alt', title || 'Product photo');
    body.append('keep_alpha', String(keepAlpha));
    const a = await api<{ id: string }>('/uploads', { method: 'POST', body });
    return a.id;
  };

  const patch = (next: Partial<Stage>) => stage && onStage({ ...stage, ...next });
  const colours = (a: string, b: string) =>
    stage && onStage({ ...stage, backdrop: { ...stage.backdrop, a, b } });
  const kind = stage?.backdrop.kind;

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={ui.label}>Product photo</Text>
      <Panel tone={C.paper2} radius={28} ring={5}>
        <ProductStage
          stage={stage}
          image={image}
          ratio={0.9}
          priv
          animate
          alt={title || 'Product preview'}
        />
      </Panel>
      {!stage && (
        <Text style={[ui.fine, { marginTop: 8 }]}>
          {isUpload(image)
            ? 'Cut the product out to unlock backdrops.'
            : 'Upload your own photo to start styling.'}
        </Text>
      )}

      <Step n={1} title="Your photo">
        <Button
          title={uploading ? 'Uploading…' : isUpload(image) ? 'Replace photo' : 'Choose a photo'}
          soft
          disabled={uploading || cutting}
          onPress={async () => {
            setUploading(true);
            try {
              const id = await pick(alreadyCut);
              if (!id) return;
              onImage(id);
              // a transparent upload is already a cut-out, so it goes straight onto a stage
              onStage(alreadyCut ? defaultStage(id) : null);
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setUploading(false);
            }
          }}
        />
        <Toggle
          label="My next photo is already a transparent cut-out"
          value={alreadyCut}
          onChange={setAlreadyCut}
        />
      </Step>

      <Step n={2} title="Cut it out">
        <Text style={ui.muted}>
          We lift the product off its background so you can place it on any scene.
        </Text>
        <Button
          title={cutting ? 'Cutting it out…' : stage ? 'Cut out again' : 'Remove background'}
          disabled={cutting || uploading || !isUpload(image)}
          style={{ marginTop: 12 }}
          onPress={async () => {
            setCutting(true);
            try {
              const r = await api<{ id: string }>(`/shops/${shopId}/cutouts`, {
                method: 'POST',
                body: JSON.stringify({ asset_id: image }),
              });
              onStage(defaultStage(r.id));
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setCutting(false);
            }
          }}
        />
        {cutting && <ActivityIndicator color={C.ink} style={{ marginTop: 12 }} />}
      </Step>

      {stage && (
        <Step n={3} title="Set the scene">
          <View style={ui.wrap} accessibilityRole="radiogroup">
            {backdropOptions.map((o) => {
              const on = kind === o.kind;
              return (
                <Pressable
                  key={o.kind}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityHint={o.hint}
                  onPress={() => onStage(withBackdropKind(stage, o.kind))}
                  style={[chip, on && { backgroundColor: C.ink }]}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? C.paper : C.ink }}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {kind !== 'photo' && (
            <>
              <Text style={[ui.label, { marginTop: 18 }]}>Colours</Text>
              <View style={ui.wrap}>
                {stagePalettes.map((p) => {
                  const on = stage.backdrop.a === p.a && stage.backdrop.b === p.b;
                  return (
                    <Pressable
                      key={p.name}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name} colours`}
                      accessibilityState={{ selected: on }}
                      onPress={() => colours(p.a, p.b)}
                      hitSlop={3}
                      style={[swatch, on && { borderWidth: 4 }]}
                    >
                      <View style={{ flex: 1, backgroundColor: p.a }} />
                      <View style={{ flex: 1, backgroundColor: p.b }} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {kind === 'ribbon' && (
            <Field
              label="Ribbon words"
              value={stage.backdrop.text}
              maxLength={40}
              placeholder="SMALL SHOPS"
              autoCapitalize="characters"
              onChangeText={(text) => onStage({ ...stage, backdrop: { ...stage.backdrop, text } })}
            />
          )}

          {kind === 'photo' && (
            <Button
              title={stage.backdrop.asset_id ? 'Change scene photo' : 'Choose a scene photo'}
              soft
              style={{ marginTop: 16 }}
              onPress={async () => {
                try {
                  const id = await pick(false);
                  if (id) onStage({ ...stage, backdrop: { ...stage.backdrop, asset_id: id } });
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            />
          )}

          <Text style={[ui.label, { marginTop: 18 }]}>Place it</Text>
          <Stepper
            label="Size"
            value={stage.scale}
            range={stageLimits.scale}
            onChange={(scale) => patch({ scale })}
          />
          <Stepper
            label="Left / right"
            value={stage.x}
            range={stageLimits.x}
            onChange={(x) => patch({ x })}
            signed
          />
          <Stepper
            label="Up / down"
            value={stage.y}
            range={stageLimits.y}
            onChange={(y) => patch({ y })}
            signed
          />

          <Toggle
            label="Die-cut sticker edge"
            value={stage.outline}
            onChange={(outline) => patch({ outline })}
          />
          <Toggle
            label="Soft shadow"
            value={stage.shadow}
            onChange={(shadow) => patch({ shadow })}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => onStage(null)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}
          >
            <Ionicons name="arrow-undo-outline" size={15} color={C.ink} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: C.ink,
                textDecorationLine: 'underline',
              }}
            >
              Use the plain photo instead
            </Text>
          </Pressable>
        </Step>
      )}
    </View>
  );
}

const chip = {
  paddingVertical: 9,
  paddingHorizontal: 15,
  borderRadius: 22,
  borderWidth: 2,
  borderColor: C.ink,
  backgroundColor: C.card,
};

const swatch = {
  width: 40,
  height: 40,
  borderRadius: 20,
  borderWidth: 2,
  borderColor: C.ink,
  overflow: 'hidden' as const,
  flexDirection: 'row' as const,
  transform: [{ rotate: '-45deg' }],
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, marginTop: 22 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: C.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: font.display, fontSize: 16, color: C.paper }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.display, fontSize: 21, color: C.ink, marginBottom: 10 }}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onChange(!value)}
    >
      <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: C.ink }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.ink }}
        thumbColor={value ? C.persimmon : '#FFFFFF'}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

/** Small − / + steps stand in for sliders, which Expo doesn't ship. */
function Stepper({
  label,
  value,
  range,
  onChange,
  signed = false,
}: {
  label: string;
  value: number;
  range: readonly [number, number];
  onChange: (value: number) => void;
  signed?: boolean;
}) {
  const step = 0.04;
  const set = (next: number) =>
    onChange(Math.round(Math.min(range[1], Math.max(range[0], next)) * 100) / 100);
  const pct = Math.round(value * 100);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: C.ink }}>{label}</Text>
      <RoundButton
        size={38}
        icon="remove"
        label={`Decrease ${label}`}
        onPress={() => set(value - step)}
      />
      <Text
        style={{ width: 56, textAlign: 'center', fontSize: 14.5, fontWeight: '800', color: C.ink }}
        accessibilityLabel={`${label} ${pct} percent`}
      >
        {signed && pct > 0 ? `+${pct}` : pct}%
      </Text>
      <RoundButton
        size={38}
        icon="add"
        label={`Increase ${label}`}
        onPress={() => set(value + step)}
      />
    </View>
  );
}
