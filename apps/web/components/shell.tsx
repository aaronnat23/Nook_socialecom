'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { useApp } from './provider';
import { Logo } from './brand';
import { Reveal, useIsoLayoutEffect } from './motion';
import { appName } from '@/lib/api';

type Tab = {
  href: string;
  label: string;
  Icon: typeof Compass;
  active: boolean;
};

/** Nav links with a single pill that slides to whichever one is active. */
function NavTabs({ tabs, className, label }: { tabs: Tab[]; className: string; label: string }) {
  const nav = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const activeHref = tabs.find((t) => t.active)?.href;
  useIsoLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const link = el.querySelector<HTMLElement>('a.active');
      if (!link) {
        el.style.setProperty('--ind-w', '0px');
        return;
      }
      el.style.setProperty('--ind-x', `${link.offsetLeft}px`);
      el.style.setProperty('--ind-w', `${link.offsetWidth}px`);
      el.style.setProperty('--ind-h', `${link.offsetHeight}px`);
      el.style.setProperty('--ind-y', `${link.offsetTop}px`);
    };
    place();
    const frame = requestAnimationFrame(() => setReady(true));
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeHref]);
  return (
    <nav ref={nav} className={`${className} ${ready ? 'is-ready' : ''}`} aria-label={label}>
      <span className="nav-indicator" aria-hidden="true" />
      {tabs.map(({ href, label: text, Icon, active }) => (
        <Link key={href} className={active ? 'active' : ''} href={href}>
          <Icon size={17} strokeWidth={2.2} />
          <span>{text}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, openAuth } = useApp();
  const [activity, setActivity] = useState(false);
  const header = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const tabs: Tab[] = [
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
  const editing = path === '/me/edit';

  useEffect(() => {
    const el = header.current;
    if (!el) return;
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      el.dataset.scrolled = y > 12 ? 'true' : 'false';
      if (y > 220 && y > last + 6) el.dataset.hidden = 'true';
      else if (y < last - 6 || y < 120) el.dataset.hidden = 'false';
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setActivity(false), [path]);

  return (
    <>
      <header ref={header} className="app-header" data-scrolled="false" data-hidden="false">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`${appName} home`}>
            <Logo size={34} />
          </Link>
          <NavTabs tabs={tabs} className="desktop-nav" label="Main navigation" />
          <form className="header-search" action="/search">
            <Search size={17} />
            <input
              ref={search}
              aria-label="Search products and shops"
              name="q"
              placeholder="Poke around for something…"
            />
            <kbd>⌘K</kbd>
          </form>
          <div className="header-actions">
            <Link href="/me?saved=1" className="icon-button saved-header" aria-label="Saved items">
              <Heart size={20} />
            </Link>
            <button
              onClick={() => setActivity(!activity)}
              className="icon-button"
              aria-label="Activity"
              aria-expanded={activity}
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
              <button className="button small-button primary join-button" onClick={openAuth}>
                Move in <ArrowUpRight size={15} />
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
      <main className={editing ? 'editor-main' : 'main-content'}>{children}</main>
      <NavTabs tabs={tabs} className="bottom-nav" label="Bottom navigation" />
      {!editing && <Footer />}
    </>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" aria-label="Nook home">
            <Logo size={40} />
          </Link>
          <p>A cosy corner of the internet where small shops move in and make it theirs.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/">Discover</Link>
          <Link href="/me">My Space</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/settings?section=help">Help</Link>
        </nav>
        <span className="sandbox-tag">SANDBOX PREVIEW</span>
      </div>
      <Reveal className="footer-giant" variant="rise">
        <span aria-hidden="true">nook</span>
      </Reveal>
    </footer>
  );
}
