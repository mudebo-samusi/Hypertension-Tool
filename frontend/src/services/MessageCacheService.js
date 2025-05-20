/**
 * Service to manage chat message caching with advanced state awareness
 */
class MessageCacheService {
  constructor(ttl = 10 * 60 * 1000) { // 10 minutes default TTL
    this.cache = {};
    this.lastUpdates = {};
    this.TTL = ttl;
    this.metadata = {}; // Store metadata like oldest/newest message IDs, loading states
    this.apiRequests = {}; // Track ongoing API requests to prevent duplicates
  }

  /**
   * Initialize or update metadata for a room
   * @param {string} roomId - The room ID
   * @param {object} data - Metadata to set/update
   */
  setRoomMetadata(roomId, data = {}) {
    if (!this.metadata[roomId]) {
      this.metadata[roomId] = {
        oldestMessageId: null,
        newestMessageId: null,
        hasMoreOlder: true,
        hasMoreNewer: false,
        initialLoadPerformed: false,
        ...data
      };
    } else {
      this.metadata[roomId] = {
        ...this.metadata[roomId],
        ...data
      };
    }
  }

  /**
   * Get metadata for a specific room
   * @param {string} roomId - The room ID
   * @returns {object} - The room metadata
   */
  getRoomMetadata(roomId) {
    return this.metadata[roomId] || {};
  }

  /**
   * Check if initial load has been performed for a room
   * @param {string} roomId - The room ID to check
   * @returns {boolean} - Whether initial load has been performed
   */
  hasInitialLoad(roomId) {
    return this.metadata[roomId]?.initialLoadPerformed || false;
  }

  /**
   * Mark that a room has ongoing API request
   * @param {string} roomId - The room ID
   * @param {string} requestType - Type of request (e.g., 'initial', 'older', 'newer')
   * @param {boolean} isLoading - Whether the request is ongoing
   */
  setLoading(roomId, requestType, isLoading) {
    if (!this.apiRequests[roomId]) {
      this.apiRequests[roomId] = {};
    }
    this.apiRequests[roomId][requestType] = isLoading;
  }

  /**
   * Check if a room has any ongoing API requests
   * @param {string} roomId - The room ID to check
   * @param {string} [requestType] - Optional specific request type to check
   * @returns {boolean} - Whether there are ongoing API requests
   */
  isLoading(roomId, requestType = null) {
    if (!this.apiRequests[roomId]) return false;
    
    if (requestType) {
      return !!this.apiRequests[roomId][requestType];
    }
    
    // Check if any request type is loading
    return Object.values(this.apiRequests[roomId]).some(loading => loading);
  }

  /**
   * Get cached messages for a room if they exist and are valid
   * @param {string} roomId - The room ID to get messages for
   * @returns {Array|null} - The cached messages or null if invalid/nonexistent
   */
  getMessages(roomId) {
    if (!this.isCacheValid(roomId)) {
      return null;
    }
    return this.cache[roomId];
  }

  /**
   * Update the cache with new messages
   * @param {string} roomId - The room ID to update messages for
   * @param {Array} messages - The messages to cache
   * @param {string} updateType - Type of update: 'replace', 'prepend', 'append'
   */
  updateMessages(roomId, messages, updateType = 'replace') {
    if (!roomId || !Array.isArray(messages)) return;
    
    let updatedMessages;
    
    switch (updateType) {
      case 'prepend':
        updatedMessages = [...messages, ...(this.cache[roomId] || [])];
        break;
      case 'append':
        updatedMessages = [...(this.cache[roomId] || []), ...messages];
        break;
      case 'replace':
      default:
        updatedMessages = [...messages];
        break;
    }
    
    this.cache[roomId] = updatedMessages;
    this.lastUpdates[roomId] = Date.now();
    
    // Update metadata about newest/oldest messages
    if (updatedMessages.length > 0) {
      // Find oldest message
      const oldestMsg = updatedMessages.reduce((oldest, msg) => {
        if (!oldest) return msg;
        const oldestTime = oldest.serverTimestamp ? new Date(oldest.serverTimestamp).getTime() : 0;
        const msgTime = msg.serverTimestamp ? new Date(msg.serverTimestamp).getTime() : 0;
        return msgTime < oldestTime ? msg : oldest;
      }, null);
      
      // Find newest message
      const newestMsg = updatedMessages.reduce((newest, msg) => {
        if (!newest) return msg;
        const newestTime = newest.serverTimestamp ? new Date(newest.serverTimestamp).getTime() : 0;
        const msgTime = msg.serverTimestamp ? new Date(msg.serverTimestamp).getTime() : 0;
        return msgTime > newestTime ? msg : newest;
      }, null);
      
      this.setRoomMetadata(roomId, {
        oldestMessageId: oldestMsg?.id || null,
        newestMessageId: newestMsg?.id || null,
        initialLoadPerformed: true
      });
    }
  }

  /**
   * Check if the cache for a room is valid (not expired)
   * @param {string} roomId - The room ID to check
   * @returns {boolean} - Whether the cache is valid
   */
  isCacheValid(roomId) {
    const lastUpdate = this.lastUpdates[roomId];
    if (!lastUpdate || !this.cache[roomId]) return false;
    return (Date.now() - lastUpdate) < this.TTL;
  }

  /**
   * Invalidate cache for a specific room or all rooms
   * @param {string|null} roomId - The room ID to invalidate, or null for all rooms
   */
  invalidateCache(roomId = null) {
    if (roomId) {
      delete this.cache[roomId];
      delete this.lastUpdates[roomId];
      delete this.metadata[roomId];
      delete this.apiRequests[roomId];
    } else {
      this.cache = {};
      this.lastUpdates = {};
      this.metadata = {};
      this.apiRequests = {};
    }
  }

  /**
   * Check if there are newer messages on the server compared to the cache
   * @param {string} roomId - The room ID to check
   * @param {Array} newerMessages - Messages to compare against cache
   * @returns {boolean} - Whether there are newer messages
   */
  hasNewerMessages(roomId, newerMessages) {
    if (!this.cache[roomId] || !newerMessages?.length) return true;
    
    const cachedMessages = this.cache[roomId];
    if (!cachedMessages.length) return newerMessages.length > 0;
    
    // Find the latest message timestamp in cache
    const lastCachedTimestamp = cachedMessages.reduce((latest, msg) => {
      const msgTime = msg.serverTimestamp ? new Date(msg.serverTimestamp).getTime() : 0;
      return Math.max(latest, msgTime);
    }, 0);
    
    // Check if any new message is newer than the latest cached message
    return newerMessages.some(msg => {
      const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
      return msgTime > lastCachedTimestamp;
    });
  }

  /**
   * Update the hasMoreOlder flag for pagination
   * @param {string} roomId - The room ID to update
   * @param {boolean} hasMore - Whether there are more older messages
   */
  setHasMoreOlderMessages(roomId, hasMore) {
    this.setRoomMetadata(roomId, { hasMoreOlder: hasMore });
  }

  /**
   * Check if there are more older messages to load
   * @param {string} roomId - The room ID to check
   * @returns {boolean} - Whether there are more older messages
   */
  hasMoreOlderMessages(roomId) {
    return this.getRoomMetadata(roomId).hasMoreOlder !== false;
  }

  /**
   * Get current cache TTL in milliseconds
   * @returns {number} - Cache TTL in milliseconds
   */
  getTTL() {
    return this.TTL;
  }

  /**
   * Set a new TTL for the cache
   * @param {number} ttl - New TTL in milliseconds
   */
  setTTL(ttl) {
    if (typeof ttl === 'number' && ttl > 0) {
      this.TTL = ttl;
    }
  }
}

// Create singleton instance
const messageCache = new MessageCacheService();
export default messageCache;