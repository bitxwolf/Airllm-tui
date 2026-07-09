import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadMemory,
  addMemoryEntry,
  deleteMemoryEntry,
  toggleMemoryPin,
} from '../../utils/storage.js';

export function useMemory() {
  const [memories, setMemories] = useState([]);

  // Load memories on mount
  useEffect(() => {
    loadMemory().then(setMemories).catch(() => setMemories([]));
  }, []);

  const addMemory = useCallback(async (key, value) => {
    const entry = await addMemoryEntry({ key, value });
    setMemories((prev) => [...prev, entry]);
    return entry;
  }, []);

  const deleteMemory = useCallback(async (id) => {
    await deleteMemoryEntry(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const togglePin = useCallback(async (id) => {
    const updated = await toggleMemoryPin(id);
    if (updated) {
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
