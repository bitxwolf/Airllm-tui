/**
 * Builds a complete prompt string with conversation context, system prompt,
 * and pinned memory entries for multi-turn dialogue.
 */
export function buildPrompt({ messages, systemPrompt, pinnedMemories, newUserPrompt, maxTurns = 20 }) {
  const parts = [];

  // System prompt
  if (systemPrompt && systemPrompt.trim()) {
    parts.push(`System: ${systemPrompt.trim()}`);
  }

  // Pinned memories
  if (pinnedMemories && pinnedMemories.length > 0) {
    const memoryLines = pinnedMemories.map(m => `[Memory] ${m.key}: ${m.value}`);
    parts.push(memoryLines.join('\n'));
  }

  // Conversation history (last maxTurns messages)
  if (messages && messages.length > 0) {
    const recentMessages = messages.slice(-maxTurns);
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${role}: ${msg.content}`);
    }
  }

  // New user prompt
  parts.push(`User: ${newUserPrompt}`);

  return parts.join('\n\n');
}
