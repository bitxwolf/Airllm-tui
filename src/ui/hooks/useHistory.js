import { useState, useEffect, useCallback } from 'react';
import {
  loadHistory,
  appendHistory,
  clearSessionFile,
  deleteSession as deleteSessionFile,
  listSessionsWithMeta,
} from '../../utils/storage.js';

export function useHistory(initialSessionFile) {
  const [sessionFile, setSessionFile] = useState(initialSessionFile);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!sessionFile) return;
    loadHistory(sessionFile).then((loaded) => {
      setMessages(loaded);
    });
  }, [sessionFile]);

  const addMessage = useCallback(
    (role, content) => {
      const msg = { role, content, ts: Date.now() };
      setMessages((prev) => [...prev, msg]);
      // Fire-and-forget async write
      appendHistory(sessionFile, msg).catch(() => {});
    },
    [sessionFile]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    clearSessionFile(sessionFile).catch(() => {});
  }, [sessionFile]);

  const switchSession = useCallback(async (newSessionFile) => {
    setSessionFile(newSessionFile);
    const loaded = await loadHistory(newSessionFile);
    setMessages(loaded);
    return loaded;
  }, []);

  const deleteSession = useCallback(async (targetSessionFile) => {
    await deleteSessionFile(targetSessionFile);
  }, []);

  const listSessions = useCallback(async () => {
    return listSessionsWithMeta();
  }, []);

  return { messages, addMessage, clearHistory, sessionFile, switchSession, deleteSession, listSessions };
}
