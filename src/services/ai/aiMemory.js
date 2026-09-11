const MEMORY_PREFIX = 'ai:memory:';
const HISTORY_PREFIX = 'ai:history:';

const MAX_MEMORIES = 25;
const MAX_HISTORY = 12;

/**
 * Get a user's persistent AI memory.
 */
export async function getUserMemory(client, userId) {
  try {
    const key = `${MEMORY_PREFIX}${userId}`;

    const data = await client.db.get(key, {
      facts: [],
    });

    if (!data || typeof data !== 'object') {
      return { facts: [] };
    }

    return {
      facts: Array.isArray(data.facts) ? data.facts : [],
    };
  } catch (error) {
    console.error(`Failed to get AI memory for ${userId}:`, error);
    return { facts: [] };
  }
}

/**
 * Save a user's persistent AI memory.
 */
export async function saveUserMemory(client, userId, memory) {
  try {
    const key = `${MEMORY_PREFIX}${userId}`;

    const safeFacts = Array.isArray(memory?.facts)
      ? memory.facts.slice(-MAX_MEMORIES)
      : [];

    await client.db.set(key, {
      facts: safeFacts,
      updatedAt: Date.now(),
    });

    return true;
  } catch (error) {
    console.error(`Failed to save AI memory for ${userId}:`, error);
    return false;
  }
}

/**
 * Add a fact to a user's persistent memory.
 */
export async function addUserMemory(client, userId, fact) {
  try {
    if (!fact || typeof fact !== 'string') {
      return false;
    }

    const memory = await getUserMemory(client, userId);

    const cleanedFact = fact.trim();

    if (!cleanedFact) {
      return false;
    }

    // Don't store duplicates.
    const alreadyExists = memory.facts.some(
      existing =>
        existing.toLowerCase() === cleanedFact.toLowerCase()
    );

    if (alreadyExists) {
      return true;
    }

    memory.facts.push(cleanedFact);

    // Keep memory limited.
    memory.facts = memory.facts.slice(-MAX_MEMORIES);

    return await saveUserMemory(client, userId, memory);
  } catch (error) {
    console.error(`Failed to add AI memory for ${userId}:`, error);
    return false;
  }
}

/**
 * Get recent conversation history.
 */
export async function getConversationHistory(client, channelId) {
  try {
    const key = `${HISTORY_PREFIX}${channelId}`;

    const data = await client.db.get(key, []);

    return Array.isArray(data)
      ? data.slice(-MAX_HISTORY)
      : [];
  } catch (error) {
    console.error(
      `Failed to get AI conversation history for ${channelId}:`,
      error
    );

    return [];
  }
}

/**
 * Save a conversation turn.
 */
export async function addConversationMessage(
  client,
  channelId,
  role,
  content,
  userId = null
) {
  try {
    const key = `${HISTORY_PREFIX}${channelId}`;

    const history = await getConversationHistory(client, channelId);

    history.push({
      role,
      content,
      userId,
      timestamp: Date.now(),
    });

    const trimmedHistory = history.slice(-MAX_HISTORY);

    await client.db.set(key, trimmedHistory);

    return true;
  } catch (error) {
    console.error(
      `Failed to save AI conversation for ${channelId}:`,
      error
    );

    return false;
  }
}
