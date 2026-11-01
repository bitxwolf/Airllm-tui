import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  loadMemory,
  addMemoryEntry,
  deleteMemoryEntry,
  toggleMemoryPin,
} from '../../utils/storage.js';

function reconcileMemories(loaded, changes) {
  let next = loaded;

  for (const change of changes) {
    if (change.type === 'add') {
      next = next.some((memory) => memory.id === change.entry.id)
        ? next.map((memory) =>
            memory.id === change.entry.id ? change.entry : memory
          )
        : [...next, change.entry];
    } else if (change.type === 'delete') {
      next = next.filter((memory) => memory.id !== change.id);
    } else if (change.type === 'toggle') {
      next = next.map((memory) =>
        memory.id === change.entry.id ? change.entry : memory
      );
    }
  }

  return next;
}

export function useMemory() {
  const [memories, setMemories] = useState([]);
  const localChanges = useRef([]);
  const loadPending = useRef(true);

  // Load memories on mount
  useEffect(() => {
    loadMemory()
      .then((loaded) => {
        const changes = [...localChanges.current];
        localChanges.current = [];
        loadPending.current = false;
        setMemories(() => reconcileMemories(loaded, changes));
      })
      .catch(() => {
        const changes = [...localChanges.current];
        localChanges.current = [];
        loadPending.current = false;
        setMemories(() => reconcileMemories([], changes));
      });
  }, []);

  const addMemory = useCallback(async (key, value) => {
    const entry = await addMemoryEntry({ key, value });
    if (loadPending.current) {
      localChanges.current.push({ type: 'add', entry });
    }
    setMemories((prev) => [...prev, entry]);
    return entry;
  }, []);

  const deleteMemory = useCallback(async (id) => {
    await deleteMemoryEntry(id);
    if (loadPending.current) {
      localChanges.current.push({ type: 'delete', id });
    }
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const togglePin = useCallback(async (id) => {
    const updated = await toggleMemoryPin(id);
    if (updated) {
      if (loadPending.current) {
        localChanges.current.push({ type: 'toggle', entry: updated });
      }
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? updated : m))
      );
    }
  }, []);

  const pinnedMemories = useMemo(
    () => memories.filter((m) => m.pinned),
    [memories]
  );

  return { memories, addMemory, deleteMemory, togglePin, pinnedMemories };
}