'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  UserRound,
  Bell,
  ShieldCheck,
  Store,
  HelpCircle,
  LogOut,
  Check,
  ArrowUpRight,
  Flag,
} from 'lucide-react';
import { useApp } from './provider';
import { AuthGate } from './auth-gate';
import { api } from '@/lib/api';
export function SettingsPage() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}
function Settings() {
  const { me, refresh, signOut, toast } = useApp();
  const params = useSearchParams();
  const [section, setSection] = useState(
    params.get('section') === 'help'
      ? 'Help & policies'
      : params.has('report')
        ? 'Report a space'
        : 'Your profile',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    display_name: me!.display_name,
    bio: me!.bio,
    handle: me!.handle,
  });
  const menu = [
    { label: 'Your profile', Icon: UserRound },
    { label: 'Notifications', Icon: Bell },
    { label: 'Privacy & security', Icon: ShieldCheck },
    { label: 'Your shop', Icon: Store },
    { label: 'Help & policies', Icon: HelpCircle },
    { label: 'Report a space', Icon: Flag },
  ];
  useEffect(() => {
    setProfile({ display_name: me!.display_name, bio: me!.bio, handle: me!.handle });
  }, [me]);
  const toggle = async (key: string) => {
    try {
      await api('/me', {
        method: 'PATCH',
        body: JSON.stringify({ preferences: { ...me!.preferences, [key]: !me!.preferences[key] } }),
      });
      await refresh();
      toast('Preference saved.');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <div className="page-wrap" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">THE LITTLE DETAILS</span>
          <h1>A space that works for you.</h1>
          <p>Your profile, your preferences, your peace of mind.</p>
        </div>
      </div>
      <div className="settings-grid">
        <nav className="settings-menu" aria-label="Settings sections">
          {menu.map(({ label, Icon }) => (
            <button
              key={label}
              className={section === label ? 'active' : ''}
              onClick={() => {
                setSection(label);
                setError('');
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button onClick={signOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </nav>
        <div className="panel-stack">
          {section === 'Your profile' ? (
            <form
              className="panel"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api('/me', { method: 'PATCH', body: JSON.stringify(profile) });
                  await refresh();
                  toast('Your profile is looking good.');
                  setError('');
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>The person behind the space.</h2>
              <p>A little introduction goes a long way.</p>
              <div className="form-grid">
                <label>
                  Your name
                  <input
                    required
                    value={profile.display_name}
                    maxLength={80}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  />
                </label>
                <label>
                  Your handle
                  <input
                    required
                    pattern="[a-z0-9_.]{3,30}"
                    value={profile.handle}
                    onChange={(e) =>
                      setProfile({ ...profile, handle: e.target.value.toLowerCase() })
                    }
                  />
                </label>
                <label className="full">
                  A little about you
                  <textarea
                    maxLength={600}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </label>
                <label className="full">
                  Email address
                  <input readOnly value={me!.email} />
                </label>
              </div>
              {error && <div className="error">{error}</div>}
              <button className="button primary" disabled={busy}>
                <Check size={15} />
                Save your profile
              </button>
              <p className="fineprint">
                Your profile is public at /u/{profile.handle}. Update your storefront’s introduction
                in the editor.
              </p>
            </form>
          ) : section === 'Notifications' ? (
            <div className="panel">
              <h2>Good things, at your pace.</h2>
              <p>
                Choose what you’d like to hear about. Email delivery is not configured in this local
                preview.
              </p>
              {[
                {
                  key: 'order_updates',
                  title: 'Order updates',
                  description: 'Keep your order activity visible in the app.',
                },
                {
                  key: 'shop_updates',
                  title: 'Shops you follow',
                  description: 'Remember your preference for future shop updates.',
                },
                {
                  key: 'newsletter',
                  title: 'A little inspiration',
                  description: 'Save your opt-in for the future Lilac newsletter.',
                },
              ].map((x) => (
                <div className="toggle-row" key={x.key}>
                  <div>
                    <h3>{x.title}</h3>
                    <p>{x.description}</p>
                  </div>
                  <button
                    className={`switch ${me!.preferences[x.key] ? 'on' : ''}`}
                    role="switch"
                    aria-checked={!!me!.preferences[x.key]}
                    aria-label={x.title}
                    onClick={() => void toggle(x.key)}
                  >
                    <span />
                  </button>
                </div>
              ))}
            </div>
          ) : section === 'Privacy & security' ? (
            <div className="panel">
              <h2>Your little peace of mind.</h2>
              <p>Local development authentication. Connect Supabase Auth before a pilot release.</p>
              <div className="toggle-row">
                <div>
                  <h3>Reduced motion</h3>
                  <p>
                    Remember your preference. System reduced-motion settings are always respected.
                  </p>
                </div>
                <button
                  className={`switch ${me!.preferences.reduced_motion ? 'on' : ''}`}
                  role="switch"
                  aria-checked={!!me!.preferences.reduced_motion}
                  aria-label="Reduced motion"
                  onClick={() => void toggle('reduced_motion')}
                >
                  <span />
                </button>
              </div>
              <div className="sandbox-note">
                <ShieldCheck size={18} />
                <span>
                  Your drafts and unpublished images are private to your account. Published
                  storefronts and product photos are visible to visitors.
                </span>
              </div>
              <button className="button outline" onClick={signOut}>
                <LogOut size={15} />
                Sign out on this device
              </button>
              <p className="fineprint">
                Account deletion, password recovery, session revocation and privacy requests require
                the configured identity provider and launch runbook. See the project’s
                pilot-readiness notes.
              </p>
            </div>
          ) : section === 'Your shop' ? (
            <div className="panel">
              <h2>A home for your good ideas.</h2>
              <p>
                {me!.shop.name} ·{' '}
                {me!.seller_enabled ? 'Sandbox selling enabled' : 'Personal space'}
              </p>
              <div className="sandbox-note">
                <Store size={17} />
                <span>
                  Selling is a capability on your account. Live payments and seller payouts require
                  provider approval and a legal review before activation.
                </span>
              </div>
              <ShopSettings />
              <div className="button-row">
                <Link className="button primary" href="/me/edit">
                  Customize your storefront <ArrowUpRight size={14} />
                </Link>
                <Link className="button outline" href="/me/products">
                  Manage products
                </Link>
                <Link className="button outline" href="/me/orders">
                  Shop orders
                </Link>
              </div>
              <p className="fineprint">
                Currency: MYR · Domestic Malaysia shipping · One seller per checkout
              </p>
            </div>
          ) : section === 'Report a space' ? (
            <form
              className="panel"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  await api('/reports', {
                    method: 'POST',
                    body: JSON.stringify({
                      target_type: f.get('target_type'),
                      target_id: f.get('target_id'),
                      reason: f.get('reason'),
                    }),
                  });
                  toast('Your report is saved for moderator review.');
                  e.currentTarget?.reset();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Keep this corner kind.</h2>
              <p>
                Reports are saved to the moderator queue. This local preview does not provide
                emergency support.
              </p>
              <label>
                What are you reporting?
                <select name="target_type">
                  <option value="shop">Shop / space</option>
                  <option value="product">Product</option>
                  <option value="profile">Profile</option>
                </select>
              </label>
              <label>
                Resource ID
                <input
                  name="target_id"
                  defaultValue={params.get('report') || ''}
                  required
                  maxLength={120}
                  placeholder="The shop, product or profile ID"
                />
              </label>
              <label>
                Tell us what happened
                <textarea name="reason" required minLength={10} maxLength={1000} />
              </label>
              {error && <p className="error">{error}</p>}
              <button className="button primary" disabled={busy}>
                <Flag size={15} />
                Submit report
              </button>
            </form>
          ) : (
            <div className="panel help-details">
              <h2>A few little answers.</h2>
              <p>How this sandbox preview works.</p>
              <details open>
                <summary>Is this a live marketplace?</summary>
                <p>
                  This is a development preview with a fictional seed catalog. Checkout is fully
                  sandboxed. No real money is collected, and no sample products are shipped.
                </p>
              </details>
              <details>
                <summary>How do I create my own space?</summary>
                <p>
                  Open My Space, choose Customize, and start with one of eight editable themes. Add
                  your images, words and products. Your draft saves automatically. Publish when it
                  feels like you.
                </p>
              </details>
              <details>
                <summary>What happens to my unpublished changes?</summary>
                <p>
                  Drafts are stored privately in the database. Offline edits stay on your device
                  until you reconnect. If another device changes the draft, you’ll choose how to
                  recover your edits.
                </p>
              </details>
              <details>
                <summary>Shipping and returns</summary>
                <p>
                  Each shop sets a domestic flat rate. The complete quote is shown before checkout.
                  The sample policy accepts unused-item return requests within 7 days of delivery.
                  Sandbox orders do not ship.
                </p>
              </details>
              <details>
                <summary>Privacy and account data</summary>
                <p>
                  Your email, shipping information, saved items, and drafts are restricted to
                  authorized account flows. Public shop content is visible to visitors. Retention,
                  deletion, consent, processor notices and Malaysian PDPA review remain required
                  before launch.
                </p>
              </details>
              <details>
                <summary>Community guidelines</summary>
                <p>
                  Physical goods only. No illegal, counterfeit or unsafe goods. Don’t impersonate
                  another person or shop. Use the report form to bring a concern to the moderator
                  queue.
                </p>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopSettings() {
  const { me, refresh, toast } = useApp();
  const shop = me!.shop as NonNullable<typeof me>['shop'] & {
    shipping_minor?: number;
    return_policy?: string;
  };
  const [busy, setBusy] = useState(false);
  return (
    <form
      style={{ marginBottom: 25 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          await api(`/shops/${shop.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: f.get('name'),
              bio: f.get('bio'),
              location: f.get('location'),
              shipping_minor: Math.round(Number(f.get('shipping')) * 100),
              return_policy: f.get('returns'),
            }),
          });
          await refresh();
          toast('Your shop details are saved.');
        } catch (e) {
          toast((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Shop name
          <input name="name" defaultValue={shop.name} required maxLength={100} />
        </label>
        <label>
          Your location
          <input name="location" defaultValue={shop.location} maxLength={100} />
        </label>
        <label className="full">
          Shop introduction
          <textarea name="bio" defaultValue={shop.bio} maxLength={600} />
        </label>
        <label>
          Domestic flat-rate shipping (RM)
          <input
            name="shipping"
            type="number"
            min={0}
            max={1000}
            step="0.01"
            defaultValue={(shop.shipping_minor ?? 800) / 100}
            required
          />
        </label>
        <label className="full">
          Return policy
          <textarea
            name="returns"
            defaultValue={
              shop.return_policy ||
              'Contact the shop within 7 days of delivery to request a return. Items must be unused.'
            }
            minLength={10}
            maxLength={1000}
            required
          />
        </label>
      </div>
      <button className="button soft" disabled={busy}>
        Save shop details
      </button>
    </form>
  );
}
