'use client';
import { ArrowUpRight } from 'lucide-react';
import { useApp } from './provider';
import { NookMark } from './brand';
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { me, loading, openAuth } = useApp();
  if (loading)
    return (
      <div className="empty-state" role="status">
        <NookMark size={56} className="hopping" />
        <p>Opening your space…</p>
      </div>
    );
  if (!me)
    return (
      <div className="empty-state auth-needed" id="page-content">
        <NookMark size={84} className="hopping" />
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>
          A little corner.
          <br />
          All your own.
        </h1>
        <p>
          Sign in to save the things you love, follow your favorite makers, and decorate a space
          that feels like you.
        </p>
        <button className="button primary big" onClick={openAuth}>
          Open your space <ArrowUpRight size={17} />
        </button>
        <span className="fineprint">Try the demo account to explore the full editor.</span>
      </div>
    );
  return <>{children}</>;
}
