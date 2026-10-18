import { useState } from 'react';
import { ScrollView, Text, View, Switch } from 'react-native';
import { router } from 'expo-router';
import { AuthGate, useApp } from '../../components/provider';
import { Button, Field, ui, C } from '../../components/ui';
import { api } from '../../lib';
export default function Page() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}
function Settings() {
  const { me, refresh, signOut, notify } = useApp();
  const [name, setName] = useState(me!.display_name);
  const [bio, setBio] = useState(me!.bio);
  const [busy, setBusy] = useState(false);
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>THE LITTLE DETAILS</Text>
      <Text style={ui.title}>A space that works for you.</Text>
      <Text style={ui.subtitle}>Your profile, your preferences, your peace of mind.</Text>
      <View style={[ui.card, { marginTop: 25 }]}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>
          The person behind the space.
        </Text>
        <Field label="Your name" value={name} onChangeText={setName} maxLength={80} />
        <Field
          label="A little about you"
          value={bio}
          onChangeText={setBio}
          maxLength={600}
          multiline
        />
        <Field label="Email address" value={me!.email} editable={false} />
        <Button
          title={busy ? 'Saving…' : 'Save your profile'}
          disabled={busy}
          style={{ marginTop: 22 }}
          onPress={async () => {
            setBusy(true);
            try {
              await api('/me', {
                method: 'PATCH',
                body: JSON.stringify({ display_name: name, bio }),
              });
              await refresh();
              notify('Your profile is saved.');
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
      <View style={ui.card}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>
          Good things, at your pace.
        </Text>
        {['order_updates', 'shop_updates', 'newsletter'].map((key) => (
          <View style={[ui.row, { justifyContent: 'space-between', paddingTop: 18 }]} key={key}>
            <Text style={ui.muted}>{key.replaceAll('_', ' ')}</Text>
            <Switch
              accessibilityLabel={key.replaceAll('_', ' ')}
              value={!!me!.preferences[key]}
              trackColor={{ false: '#DDD1E8', true: '#A27BC7' }}
              onValueChange={async (value) => {
                try {
                  await api('/me', {
                    method: 'PATCH',
                    body: JSON.stringify({ preferences: { ...me!.preferences, [key]: value } }),
                  });
                  await refresh();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
          </View>
        ))}
        <Text style={ui.fine}>
          Preferences are saved. Email delivery is not configured in this preview.
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: C.text }}>
          Your little peace of mind.
        </Text>
        <Text style={[ui.muted, { marginTop: 12 }]}>
          This is a development preview. All checkout is sandboxed; no card details are collected or
          real money charged.
        </Text>
        <Text style={ui.fine}>
          Your drafts stay private. Publish only when your space feels like you. Privacy, retention
          and deletion policies need review before launch.
        </Text>
        <Button
          title="Your orders →"
          soft
          onPress={() => router.push('/orders')}
          style={{ marginTop: 15 }}
        />
      </View>
      <Button title="Sign out on this device" soft onPress={() => void signOut()} />
      <Text style={[ui.fine, { textAlign: 'center' }]}>
        lilac. · Independent looks good on you.
      </Text>
    </ScrollView>
  );
}
