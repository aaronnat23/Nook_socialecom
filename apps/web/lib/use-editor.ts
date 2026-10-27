'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Document } from '@lilac/schema';
import type { Draft } from '@lilac/api-client';
import { api } from './api';
export type SaveState =
  | 'loading'
  | 'saved'
  | 'saving'
  | 'unsaved'
  | 'offline'
  | 'conflict'
  | 'error';
export function useEditor(shopId: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [revision, setRevision] = useState(1);
  const [state, setState] = useState<SaveState>('loading');
  const [error, setError] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const [futureCount, setFutureCount] = useState(0);
  const [online, setOnline] = useState(true);
  const docRef = useRef<Document | null>(null);
  const revRef = useRef(1);
  const saved = useRef('');
  const stateRef = useRef<SaveState>('loading');
  const pending = useRef<Promise<void> | null>(null);
  const history = useRef<Document[]>([]);
  const future = useRef<Document[]>([]);
  const lastGroup = useRef({ key: '', at: 0 });
  const key = `lilac-draft-${shopId}`;
  const status = useCallback((s: SaveState) => {
    stateRef.current = s;
    setState(s);
  }, []);
  const load = useCallback(
    async (ignoreLocal = false) => {
      try {
        const r = await api<Draft>(`/shops/${shopId}/draft`);
        saved.current = JSON.stringify(r.document);
        revRef.current = r.revision;
        setRevision(r.revision);
        let next = r.document;
        let nextState: SaveState = 'saved';
        const raw = localStorage.getItem(key);
        if (raw && !ignoreLocal) {
          try {
            const local = JSON.parse(raw) as { document: Document; baseRevision: number };
            if (JSON.stringify(local.document) !== saved.current) {
              next = local.document;
              nextState = local.baseRevision === r.revision ? 'unsaved' : 'conflict';
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
        if (ignoreLocal) localStorage.removeItem(key);
        docRef.current = next;
        setDocument(next);
        status(nextState);
        setError('');
        history.current = [];
        future.current = [];
        setHistoryCount(0);
        setFutureCount(0);
      } catch (e) {
        setError((e as Error).message);
        status('error');
      }
    },
    [shopId, key, status],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      if (stateRef.current === 'offline') status('unsaved');
    };
    const down = () => {
      setOnline(false);
      if (stateRef.current !== 'conflict') status('offline');
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [status]);
  const persistLocal = useCallback(
    (next: Document) => {
      try {
        localStorage.setItem(key, JSON.stringify({ document: next, baseRevision: revRef.current }));
      } catch {
        setError('Device storage is full. Keep this page open until your draft saves.');
      }
    },
    [key],
  );
  const commit = useCallback(
    (next: Document, group = '') => {
      if (!docRef.current) return;
      const t = Date.now();
      if (!group || lastGroup.current.key !== group || t - lastGroup.current.at > 700) {
        history.current = [...history.current, structuredClone(docRef.current)].slice(-50);
      }
      lastGroup.current = { key: group, at: t };
      future.current = [];
      setHistoryCount(history.current.length);
      setFutureCount(0);
      docRef.current = next;
      setDocument(next);
      persistLocal(next);
      if (stateRef.current !== 'conflict') status(navigator.onLine ? 'unsaved' : 'offline');
    },
    [persistLocal, status],
  );
  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous || !docRef.current) return;
    future.current.push(docRef.current);
    docRef.current = previous;
    setDocument(previous);
    persistLocal(previous);
    setHistoryCount(history.current.length);
    setFutureCount(future.current.length);
    if (stateRef.current !== 'conflict') status(navigator.onLine ? 'unsaved' : 'offline');
  }, [persistLocal, status]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !docRef.current) return;
    history.current.push(docRef.current);
    docRef.current = next;
    setDocument(next);
    persistLocal(next);
    setHistoryCount(history.current.length);
    setFutureCount(future.current.length);
    if (stateRef.current !== 'conflict') status(navigator.onLine ? 'unsaved' : 'offline');
  }, [persistLocal, status]);
  const save = useCallback(async (): Promise<void> => {
    if (pending.current) {
      await pending.current;
      return;
    }
    if (!docRef.current || stateRef.current === 'conflict' || !navigator.onLine) return;
    const snapshot = structuredClone(docRef.current);
    const serialized = JSON.stringify(snapshot);
    if (serialized === saved.current) {
      status('saved');
      return;
    }
    status('saving');
    const promise = (async () => {
      try {
        const r = await api<Draft>(`/shops/${shopId}/draft`, {
          method: 'PATCH',
          body: JSON.stringify({
            document: snapshot,
            baseRevision: revRef.current,
            clientMutationId: crypto.randomUUID(),
          }),
        });
        saved.current = serialized;
        revRef.current = r.revision;
        setRevision(r.revision);
        if (docRef.current) persistLocal(docRef.current);
        status(JSON.stringify(docRef.current) === serialized ? 'saved' : 'unsaved');
        setError('');
      } catch (e) {
        const err = e as Error & { status?: number };
        setError(err.message);
        status(err.status === 409 ? 'conflict' : !navigator.onLine ? 'offline' : 'error');
        throw err;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = promise;
    await promise;
  }, [persistLocal, shopId, status]);
  useEffect(() => {
    if (!document || state !== 'unsaved' || !online) return;
    const t = setTimeout(() => {
      void save().catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [document, state, online, save]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (['unsaved', 'saving', 'offline', 'conflict', 'error'].includes(stateRef.current)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, []);
  const flush = useCallback(async () => {
    if (!navigator.onLine)
      throw new Error('Reconnect before publishing. Your draft is kept on this device.');
    if (stateRef.current === 'conflict')
      throw new Error('Resolve the draft conflict before publishing.');
    if (pending.current) await pending.current;
    await save();
    if (stateRef.current === 'error') throw new Error('Save your draft before publishing.');
    if (docRef.current && JSON.stringify(docRef.current) !== saved.current) await save();
    return revRef.current;
  }, [save]);
  const downloadCopy = () => {
    if (!docRef.current) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(docRef.current, null, 2)], { type: 'application/json' }),
    );
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'my-space-draft.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  return {
    document,
    revision,
    state,
    error,
    commit,
    undo,
    redo,
    canUndo: historyCount > 0,
    canRedo: futureCount > 0,
    save,
    flush,
    reload: () => load(true),
    downloadCopy,
  };
}
