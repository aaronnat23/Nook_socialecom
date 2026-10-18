'use client';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/components/auth-gate';
import { useApp } from '@/components/provider';
import { api } from '@/lib/api';
export default function Page() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  );
}
function Admin() {
  const { me, toast } = useApp();
  const [reports, setReports] = useState<
    { id: string; target_id: string; target_type: string; reason: string; status: string }[]
  >([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (me?.is_admin)
      api<{ items: typeof reports }>('/admin/reports')
        .then((r) => setReports(r.items))
        .catch((e) => setError(e.message));
  }, [me]);
  if (!me?.is_admin)
    return (
      <div className="empty-state">
        <h1>This corner is for moderators.</h1>
        <p>Your account does not have moderator access.</p>
      </div>
    );
  return (
    <div className="page-wrap">
      <div className="page-title">
        <h1>Community care.</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {reports.length === 0 ? (
        <div className="empty-state">No reports in the queue.</div>
      ) : (
        reports.map((r) => (
          <div className="panel" key={r.id} style={{ marginBottom: 15 }}>
            <h3>
              {r.target_type} · {r.status}
            </h3>
            <p>{r.reason}</p>
            <p className="fineprint">{r.target_id}</p>
            {r.target_type === 'shop' && (
              <button
                className="button danger"
                onClick={async () => {
                  try {
                    await api(`/admin/shops/${r.target_id}/suspend`, { method: 'POST' });
                    toast('Shop suspended. This action is recorded in the audit log.');
                  } catch (e) {
                    toast((e as Error).message);
                  }
                }}
              >
                Suspend shop
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
