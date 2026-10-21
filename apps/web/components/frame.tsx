import type { ReactNode } from 'react';

/**
 * A little browser-style window. Every shop is a place of its own, so previews
 * of a nook sit inside one rather than being dropped bare on the page.
 */
export function NookWindow({
  address,
  tag,
  children,
}: {
  address: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="nook-window">
      <div className="nook-window-bar">
        <span className="nook-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="nook-window-address">
          <span>nook</span>
          {address}
        </span>
        {tag && <span className="nook-window-tag">{tag}</span>}
      </div>
      <div className="nook-window-body">{children}</div>
    </div>
  );
}
