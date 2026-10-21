import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from './text';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { Me } from '@lilac/api-client';
import { api, setToken } from '../lib';
import { Button, Field, Loading, ui, C } from './ui';
import { Sheet } from './sheet';
import { NookMark } from './brand';
import { Bob } from './motion';
import { Notice, NoticeContext } from './notice';
interface ContextValue {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  requireAuth: () => boolean;
  signOut: () => Promise<void>;
  notify: (message: string) => void;
}
const Context = createContext<ContextValue | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing provider');
  return value;
}
export function Provider({ children }: { children: ReactNode }) {
  const [demoAvailable, setDemoAvailable] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dismissNotice = useCallback(() => setNotice(''), []);
  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>('/me'));
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setToken(null);
        setMe(null);
        await SecureStore.deleteItemAsync('lilac-token');
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    api<{ demo_available: boolean }>('/auth/config')
      .then((r) => setDemoAvailable(r.demo_available))
      .catch(() => {});
    SecureStore.getItemAsync('lilac-token').then(async (value) => {
      setToken(value);
      if (value) {
        const rt = await SecureStore.getItemAsync('lilac-refresh');
        if (rt) {
          try {
            const r = await api<{ token: string; refresh_token: string }>('/auth/session-refresh', {
              method: 'POST',
              body: JSON.stringify({ refresh_token: rt }),
            });
            setToken(r.token);
            await SecureStore.setItemAsync('lilac-token', r.token);
            await SecureStore.setItemAsync('lilac-refresh', r.refresh_token);
          } catch {
            await SecureStore.deleteItemAsync('lilac-refresh');
          }
        }
        await refresh();
      } else setLoading(false);
    });
  }, [refresh]);
  const login = async (demo = false) => {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string; refresh_token?: string }>(
        demo || !register ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email: demo ? 'demo@lilac.local' : email,
            password: demo ? 'LilacDemo!2026' : password,
            ...(!demo && register ? { handle, display_name: handle } : {}),
          }),
        },
      );
      setToken(r.token);
      await SecureStore.setItemAsync('lilac-token', r.token);
      if (r.refresh_token) await SecureStore.setItemAsync('lilac-refresh', r.refresh_token);
      await refresh();
      setVisible(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        me,
        loading,
        refresh,
        requireAuth: () => {
          if (me) return true;
          if (!loading) setVisible(true);
          return false;
        },
        signOut: async () => {
          try {
            await api('/auth/logout', { method: 'POST' });
            setToken(null);
            await SecureStore.deleteItemAsync('lilac-token');
            await SecureStore.deleteItemAsync('lilac-refresh');
            setMe(null);
          } catch (e) {
            setNotice((e as Error).message);
          }
        },
        notify: setNotice,
      }}
    >
      <NoticeContext.Provider value={{ message: notice, onClose: dismissNotice }}>
        {children}
        <Sheet
          visible={visible}
          onClose={() => setVisible(false)}
          title={register ? 'Find your nook.' : 'Good to see you again.'}
          eyebrow={register ? 'MOVE IN' : 'COME ON IN'}
          subtitle="Shop small, follow the makers you love, or open a corner of your own."
        >
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 5 }}>
              <NookMark size={52} />
            </View>
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Password · at least 10 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {register && (
              <Field
                label="Your handle"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
              />
            )}
            {error && <Text style={ui.error}>{error}</Text>}
            <Button
              title={busy ? 'Opening your space…' : register ? 'Create your nook' : 'Sign in'}
              disabled={busy}
              onPress={() => void login()}
              style={{ marginTop: 25 }}
            />
            <Button
              title={register ? 'Already have a nook? Sign in' : 'New here? Create an account'}
              soft
              onPress={() => setRegister(!register)}
              style={{ marginTop: 12 }}
            />
            {demoAvailable && (
              <>
                <View style={ui.divider} />
                <Button
                  title="Continue as demo shop owner →"
                  soft
                  disabled={busy}
                  onPress={() => void login(true)}
                />
                <Text style={ui.fine}>Development sign-in · Sample catalog · Sandbox payments</Text>
              </>
            )}
          </ScrollView>
        </Sheet>
        <Notice message={notice} onClose={dismissNotice} />
      </NoticeContext.Provider>
    </Context.Provider>
  );
}
export function AuthGate({ children }: { children: ReactNode }) {
  const { me, loading, requireAuth } = useApp();
  if (loading) return <Loading />;
  if (!me)
    return (
      <View style={[ui.screen, ui.empty, { justifyContent: 'center' }]}>
        <Bob amplitude={6} duration={2600}>
          <NookMark size={84} />
        </Bob>
        <Text style={ui.eyebrow}>MAKE YOURSELF AT HOME</Text>
        <Text style={[ui.title, { textAlign: 'center' }]}>A little corner. All your own.</Text>
        <Text style={[ui.subtitle, { textAlign: 'center' }]}>
          Save the things you love and decorate a space that feels like you.
        </Text>
        <Button
          title="Open your space ↗"
          onPress={() => {
            requireAuth();
          }}
        />
      </View>
    );
  return <>{children}</>;
}
