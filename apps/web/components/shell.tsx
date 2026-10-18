'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Compass,
  LayoutGrid,
  Settings,
  Search,
  ShoppingBag,
  Heart,
  Bell,
  ArrowUpRight,
  X,
  Flower2,
} from 'lucide-react';
import { useApp } from './provider';
import { appName } from '@/lib/api';
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, openAuth } = useApp();
  const [activity, setActivity] = useState(false);
  const tabs = [
    {
      href: '/',
      label: 'Discover',
      Icon: Compass,
      active:
        path === '/' ||
        path.startsWith('/search') ||
        path.startsWith('/shop') ||
        path.startsWith('/product'),
    },
    { href: '/me', label: 'My Space', Icon: LayoutGrid, active: path.startsWith('/me') },
    { href: '/settings', label: 'Settings', Icon: Settings, active: path.startsWith('/settings') },
  ];
  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`${appName} home`}>
            <span className="brand-mark">
              <Flower2 size={28} strokeWidth={1.8} />
            </span>
            {appName}
            <span className="brand-dot">.</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {tabs.map(({ href, label, Icon, active }) => (
              <Link key={href} className={active ? 'active' : ''} href={href}>
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <form className="header-search" action="/search">
            <Search size={17} />
            <input
              aria-label="Search products and shops"
              name="q"
              placeholder="Find your kind of thing…"
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="header-actions">
            <Link href="/me?saved=1" className="icon-button saved-header" aria-label="Saved items">
              <Heart size={20} />
            </Link>
            <button
              onClick={() => setActivity(!activity)}
              className="icon-button"
              aria-label="Activity"
            >
              <Bell size={20} />
            </button>
            <Link href="/cart" className="icon-button" aria-label="Shopping bag">
              <ShoppingBag size={20} />
            </Link>
            {me ? (
              <Link href="/me" className="avatar small" aria-label="Open your space">
                {me.display_name.slice(0, 1)}
              </Link>
            ) : (
              <button className="button small-button soft" onClick={openAuth}>
                Join the space <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </div>
        {activity && (
          <div className="activity-panel">
            <div className="section-heading">
              <h3>Your activity</h3>
              <button
                className="icon-button"
                onClick={() => setActivity(false)}
                aria-label="Close activity"
              >
                <X size={16} />
              </button>
            </div>
            <p className="muted">
              Follow a shop to keep it close. Your purchases and updates live in your orders.
            </p>
            <button
              className="button soft wide"
              onClick={() => {
                setActivity(false);
                router.push('/orders');
              }}
            >
              View your orders <ArrowUpRight size={16} />
            </button>
          </div>
        )}
      </header>
      <main className={path === '/me/edit' ? 'editor-main' : 'main-content'}>{children}</main>
      <nav className="bottom-nav" aria-label="Bottom navigation">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link key={href} className={active ? 'active' : ''} href={href}>
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {path != '/me/edit' && (
        <footer className="app-footer">
          <Link className="brand" href="/">
            {appName}
            <span className="brand-dot">.</span>
          </Link>
          <span>A little more independent. A little more you.</span>
          <Link href="/settings?section=help">
            Made for creative corners <Flower2 size={15} />
          </Link>
          <span className="sandbox-tag">SANDBOX PREVIEW</span>
        </footer>
      )}
    </>
  );
}
