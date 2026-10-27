import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { Document } from '@lilac/schema';
import type { Draft } from '@lilac/api-client';
import { api } from '../lib';
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function useEditor(shopId: string) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const current = useRef<Document | null>(null);
  const revision = useRef(1);
  const saved = useRef('');
  const stateRef = useRef('loading');
  const history = useRef<Document[]>([]);
  const future = useRef<Document[]>([]);
  const online = useRef(true);
  const pending = useRef<Promise<void> | null>(null);
  const key = `lilac-draft-${shopId}`;
  const status = useCallback((s: string) => {
    stateRef.current = s;
    setState(s);
  }, []);
  const persist = useCallback(
    (d: Document) =>
      AsyncStorage.setItem(key, JSON.stringify({ document: d, baseRevision: revision.current })),
    [key],
  );
  const load = useCallback(
    async (ignoreLocal = false) => {
      try {
        const r = await api<Draft>(`/shops/${shopId}/draft`);
        revision.current = r.revision;
        saved.current = JSON.stringify(r.document);
        let d = r.document;
        let s = 'saved';
        const local = await AsyncStorage.getItem(key);
        if (local && !ignoreLocal) {
          const value = JSON.parse(local) as { document: Document; baseRevision: number };
          if (JSON.stringify(value.document) !== saved.current) {
            d = value.document;
            s = value.baseRevision === r.revision ? 'unsaved' : 'conflict';
          }
        }
        if (ignoreLocal) await AsyncStorage.removeItem(key);
        current.current = d;
        setDoc(d);
        status(s);
        setError('');
      } catch (e) {
        setError((e as Error).message);
        status('error');
      }
    },
    [shopId, key, status],
  );
  useEffect(() => {
    void load();
    return NetInfo.addEventListener((s) => {
      online.current = s.isConnected !== false;
      if (!online.current && stateRef.current !== 'conflict') status('offline');
      else if (online.current && stateRef.current === 'offline') status('unsaved');
    });
  }, [load, status]);
  const commit = (next: Document) => {
    if (!current.current) return;
    history.current = [...history.current, clone(current.current)].slice(-50);
    future.current = [];
    setUndoCount(history.current.length);
    setRedoCount(0);
    current.current = next;
    setDoc(next);
    void persist(next);
    if (stateRef.current !== 'conflict') status(online.current ? 'unsaved' : 'offline');
  };
  const undo = () => {
    const d = history.current.pop();
    if (!d || !current.current) return;
    future.current.push(current.current);
    current.current = d;
    setDoc(d);
    void persist(d);
    setUndoCount(history.current.length);
    setRedoCount(future.current.length);
    if (stateRef.current !== 'conflict') status(online.current ? 'unsaved' : 'offline');
  };
  const redo = () => {
    const d = future.current.pop();
    if (!d || !current.current) return;
    history.current.push(current.current);
    current.current = d;
    setDoc(d);
    void persist(d);
    setUndoCount(history.current.length);
    setRedoCount(future.current.length);
    if (stateRef.current !== 'conflict') status(online.current ? 'unsaved' : 'offline');
  };
  const save = useCallback(async () => {
    if (pending.current) {
      await pending.current;
      return;
    }
    if (!online.current || stateRef.current === 'conflict')
      throw new Error('Reconnect and resolve conflicts before publishing.');
    if (!current.current) return;
    const snapshot = clone(current.current);
    const raw = JSON.stringify(snapshot);
    if (raw === saved.current) {
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
            baseRevision: revision.current,
            clientMutationId: `mobile-${Date.now()}`,
          }),
        });
        revision.current = r.revision;
        saved.current = raw;
        if (current.current) await persist(current.current);
        status(raw === JSON.stringify(current.current) ? 'saved' : 'unsaved');
        setError('');
      } catch (e) {
        const err = e as Error & { status?: number };
        setError(err.message);
        status(err.status === 409 ? 'conflict' : online.current ? 'error' : 'offline');
        throw err;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = promise;
    await promise;
  }, [shopId, persist, status]);
  useEffect(() => {
    if (!doc || state !== 'unsaved') return;
    const timer = setTimeout(() => void save().catch(() => {}), 800);
    return () => clearTimeout(timer);
  }, [doc, state, save]);
  const flush = async () => {
    if (pending.current) await pending.current;
    await save();
    if (JSON.stringify(current.current) !== saved.current) await save();
    return revision.current;
  };
  return {
    doc,
    state,
    error,
    commit,
    undo,
    redo,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
    flush,
    save,
    reload: () => load(true),
    copy: () => JSON.stringify(current.current, null, 2),
  };
}
