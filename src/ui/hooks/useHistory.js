import { useState, useEffect, useCallback } from 'react';
import { loadHistory, appendHistory, clearSessionFile } from '../../utils/storage.js';

export function useHistory(sessionFile) {
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

  return { messages, addMessage, clearHistory };
}
