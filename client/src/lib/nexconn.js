import {
  NCEngine,
  DirectChannel,
  GroupChannel,
  SendTextMessageParams,
  MessageHandler,
  ConnectionStatusHandler,
  DirectChannelIdentifier,
  GroupChannelIdentifier,
  BaseChannel,
} from '@nexconn/chat';

/**
 * @typedef {{ type: 'direct' | 'group', targetId: string }} ChannelRef
 */

/**
 * @typedef {Object} IncomingMessage
 * @property {string} uid
 * @property {ChannelRef} channel
 * @property {string} senderId
 * @property {string} text
 * @property {number} sentAt
 */

let initialized = false;

export function init(appKey) {
  if (initialized) return;
  NCEngine.initialize({ appKey });
  initialized = true;
}

export async function connect(token) {
  return await NCEngine.connect(token);
}

export function disconnect() {
  NCEngine.disconnect();
}

/**
 * Subscribes to incoming messages.
 * @param {(msg: IncomingMessage) => void} cb
 * @returns {() => void} unsubscribe function
 */
export function onMessage(cb) {
  const handlerId = 'handler_' + Math.random().toString(36).substring(2, 9);
  const handler = new MessageHandler({
    onMessageReceived({ messages }) {
      for (const m of messages) {
        const text = m.content?.content || (typeof m.content === 'string' ? m.content : '');
        const isGroup = m.channelIdentifier?.channelType === 2; // Group
        cb({
          uid: m.messageId,
          channel: {
            type: isGroup ? 'group' : 'direct',
            targetId: m.channelIdentifier?.channelId,
          },
          senderId: m.senderUserId,
          text,
          sentAt: m.sentTime || Date.now(),
        });
      }
    },
  });

  NCEngine.addMessageHandler(handlerId, handler);
  return () => {
    NCEngine.removeMessageHandler(handlerId);
  };
}

/**
 * Subscribes to connection status changes.
 * @param {(status: string, code?: number) => void} cb
 * @returns {() => void} unsubscribe function
 */
export function onConnectionStatus(cb) {
  const handlerId = 'conn_' + Math.random().toString(36).substring(2, 9);
  const handler = new ConnectionStatusHandler({
    onConnectionStatusChanged(event) {
      cb(event.status, event.code);
    },
  });

  NCEngine.addConnectionStatusHandler(handlerId, handler);
  return () => {
    NCEngine.removeConnectionStatusHandler(handlerId);
  };
}

/**
 * Send text message to channel.
 * @param {ChannelRef} channel
 * @param {string} text
 * @returns {Promise<{ uid: string }>}
 */
export async function sendText(channel, text) {
  const chan = channel.type === 'group'
    ? new GroupChannel(channel.targetId)
    : new DirectChannel(channel.targetId);

  const params = new SendTextMessageParams({ content: text });
  const result = await chan.sendMessage(params);
  return { uid: result?.messageId || result?.data?.messageId };
}

/**
 * Fetches message history for a channel.
 * @param {ChannelRef} channel
 * @param {{ limit?: number }} options
 * @returns {Promise<IncomingMessage[]>}
 */
export async function getHistory(channel, { limit = 20 } = {}) {
  const identifier = channel.type === 'group'
    ? new GroupChannelIdentifier(channel.targetId)
    : new DirectChannelIdentifier(channel.targetId);

  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: identifier,
    pageSize: limit,
  });

  const res = await query.loadNextPage();
  if (res && res.isOk && Array.isArray(res.data)) {
    return res.data.map(m => ({
      uid: m.messageId,
      channel,
      senderId: m.senderUserId,
      text: m.content?.content || (typeof m.content === 'string' ? m.content : ''),
      sentAt: m.sentTime || Date.now(),
    }));
  }
  return [];
}

/**
 * Optional unread count query
 * @param {ChannelRef} channel
 */
export async function getUnreadCount(channel) {
  const chan = channel.type === 'group'
    ? new GroupChannel(channel.targetId)
    : new DirectChannel(channel.targetId);
  return chan.unreadCount || 0;
}

/**
 * Optional typing status sender
 * @param {ChannelRef} channel
 */
export async function sendTyping(channel) {
  if (channel.type === 'direct') {
    const chan = new DirectChannel(channel.targetId);
    if (typeof chan.sendTypingStatus === 'function') {
      return await chan.sendTypingStatus(1);
    }
  }
}
