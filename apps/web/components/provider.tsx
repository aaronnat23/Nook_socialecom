'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Me } from '@lilac/api-client';
import { api } from '@/lib/api';
import { useModal } from '@/lib/use-modal';
import { X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
interface AppContext {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  requireAuth: () => boolean;
  signOut: () => void;
  toast: (message: string) => void;
  openAuth: () => void;
}
const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing app provider');
  return value;
}
export function Provider({ children }: { children: ReactNode }) {
  const [demoAvailable, setDemoAvailable] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    if (!localStorage.getItem('lilac-token')) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      setMe(await api<Me>('/me'));
    } catch (e) {
      if (e instanceof Error && 'status' in e && e.status === 401) {
        localStorage.removeItem('lilac-token');
        setMe(null);
      } else setNotice('Unable to reach your space. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    api<{ demo_available: boolean }>('/auth/config')
      .then((r) => setDemoAvailable(r.demo_available))
      .catch(() => {});
    const hydrate = async () => {
      const rt = localStorage.getItem('lilac-refresh');
      if (rt) {
        try {
          const r = await api<{ token: string; refresh_token: string }>('/auth/session-refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: rt }),
          });
          localStorage.setItem('lilac-token', r.token);
          localStorage.setItem('lilac-refresh', r.refresh_token);
        } catch {
          localStorage.removeItem('lilac-refresh');
        }
      }
      await refresh();
    };
    void hydrate();
    const timer = setInterval(() => void hydrate(), 600000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  const signOut = () => {
    void api('/auth/logout', { method: 'POST' })
      .then(() => {
        localStorage.removeItem('lilac-token');
        localStorage.removeItem('lilac-refresh');
        setMe(null);
        setNotice('You have been signed out.');
      })
      .catch((e) => setNotice(e.message));
  };
  return (
    <Context.Provider
      value={{
        me,
        loading,
        refresh,
        requireAuth: () => {
          if (me) return true;
          if (!loading) setAuth(true);
          return false;
        },
        signOut,
        toast: setNotice,
        openAuth: () => setAuth(true),
      }}
    >
      {children}
      {auth && (
        <AuthModal
          demoAvailable={demoAvailable}
          close={() => setAuth(false)}
          done={async (token) => {
            localStorage.setItem('lilac-token', token);
            await refresh();
            setAuth(false);
            setNotice('Welcome to your little corner.');
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function AuthModal({
  close,
  done,
  demoAvailable,
}: {
  demoAvailable: boolean;
  close: () => void;
  done: (token: string) => Promise<void>;
}) {
  useModal(close);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const login = async (email: string, password: string, handle = '', display_name = '') => {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string; refresh_token?: string }>(
        register ? '/auth/register' : '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password, handle, display_name }) },
      );
      if (r.refresh_token) localStorage.setItem('lilac-refresh', r.refresh_token);
      await done(r.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="modal auth-modal"
      >
        <button className="icon-button close" onClick={close} aria-label="Close sign in">
          <X />
        </button>
        <span className="brand-mark large">
          l<span>✳</span>
        </span>
        <span className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</span>
        <h2 id="auth-title">{register ? 'Make yourself at home.' : 'Lovely to see you.'}</h2>
        <p className="muted">Discover independent shops. Create a space that feels like you.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void login(
              String(f.get('email')),
              String(f.get('password')),
              String(f.get('handle') || ''),
              String(f.get('display_name') || ''),
            );
          }}
        >
          {register && (
            <>
              <label>
                Your name
                <input name="display_name" required maxLength={80} />
              </label>
              <label>
                Choose a handle
                <input
                  name="handle"
                  required
                  pattern="[a-z0-9_.]{3,30}"
                  placeholder="your_little_space"
                />
              </label>
            </>
          )}
          <label>
            Email address
            <input type="email" name="email" autoFocus required placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              required
              minLength={10}
              placeholder="At least 10 characters"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary wide" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                {register ? 'Create your space' : 'Sign in'}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <button
          className="text-button wide"
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register ? 'Already have a space? Sign in' : 'New here? Create an account'}
        </button>
        {demoAvailable && (
          <>
            <div className="auth-divider">
              <span>EXPLORE THE WORKING DEMO</span>
            </div>
            <button
              className="button soft wide"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api<{ token: string }>('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email: 'demo@lilac.local', password: 'LilacDemo!2026' }),
                  });
                  await done(r.token);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Continue as demo shop owner <ArrowRight size={16} />
            </button>
            <p className="fineprint">Development sign-in · Sample catalog · Sandbox payments</p>
          </>
        )}
      </section>
    </div>
  );
}
