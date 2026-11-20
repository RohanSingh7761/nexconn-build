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
  ChannelType,
  ConnectionStatus,
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

const TOKEN_ERRORS = [31004, 31020]; // RC_CONN_TOKEN_INCORRECT, RC_CONN_TOKEN_EXPIRED

let initialized = false;

/**
 * @param {string} appKey
 * @param {number} [areaCode] AreaCode from @nexconn/chat (SG default, NA = 3). Must match the console app's data center.
 */
export function init(appKey, areaCode) {
  if (initialized) return;
  NCEngine.initialize(areaCode ? { appKey, areaCode } : { appKey });
  initialized = true;
}

/** Resolves with { userId } when connected; throws with .code on failure. */
export async function connect(token) {
  const res = await NCEngine.connect({ token });
  if (!res.isOk) {
    const err = new Error(`Nexconn connect failed: ${res.code} ${res.msg}`);
    err.code = res.code;
    err.tokenExpired = TOKEN_ERRORS.includes(res.code);
    throw err;
  }
  return res.data;
}

export function disconnect() {
  return NCEngine.disconnect();
}

function toRef(identifier) {
  return {
    type: identifier?.channelType === ChannelType.GROUP ? 'group' : 'direct',
    targetId: identifier?.channelId,
  };
}

function extractText(c) {
  if (!c) return '';
  if (typeof c === 'string') {
    try {
      const parsed = JSON.parse(c);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        return parsed.text ?? parsed.content ?? c;
      }
      return c;
    } catch {
      return c;
    }
  }
  return c.text ?? c.content ?? '';
}

function toIncoming(m, channel) {
  return {
    uid: m.messageId,
    channel: channel || toRef(m.channelIdentifier),
    senderId: m.senderUserId,
    text: extractText(m.content),
    sentAt: m.sentTime || Date.now(),
  };
}

function channelOf(ref) {
  return ref.type === 'group' ? new GroupChannel(ref.targetId) : new DirectChannel(ref.targetId);
}

const newId = (p) => p + Math.random().toString(36).slice(2, 9);

/**
 * @param {(msg: IncomingMessage) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onMessage(cb) {
  const id = newId('msg_');
  NCEngine.addMessageHandler(id, new MessageHandler({
    onMessageReceived({ messages }) {
      for (const m of messages) cb(toIncoming(m));
    },
  }));
  return () => NCEngine.removeMessageHandler(id);
}

/**
 * @param {(status: 'connected'|'connecting'|'disconnected'|'token_expired', code?: number) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onConnectionStatus(cb) {
  const id = newId('conn_');
  NCEngine.addConnectionStatusHandler(id, new ConnectionStatusHandler({
    onConnectionStatusChanged({ status, code }) {
      if (TOKEN_ERRORS.includes(code)) return cb('token_expired', code);
      if (status === ConnectionStatus.CONNECTED) return cb('connected', code);
      if (status === ConnectionStatus.CONNECTING) return cb('connecting', code);
      cb('disconnected', code); // DISCONNECTED or SUSPENDED (SDK keeps retrying on SUSPENDED)
    },
  }));
  return () => NCEngine.removeConnectionStatusHandler(id);
}

/**
 * @param {ChannelRef} channel
 * @param {string} text
 * @returns {Promise<{ uid: string }>}
 */
export async function sendText(channel, text) {
  const res = await channelOf(channel).sendMessage(new SendTextMessageParams({ text, content: text }));
  if (!res.isOk) throw new Error(`Nexconn send failed: ${res.code} ${res.msg}`);
  return { uid: res.data.messageId };
}

/**
 * Newest-first page of history.
 * @param {ChannelRef} channel
 * @param {{ limit?: number, before?: number }} options before = sentTime to page back from
 * @returns {Promise<IncomingMessage[]>}
 */
export async function getHistory(channel, { limit = 20, before } = {}) {
  const channelIdentifier = channel.type === 'group'
    ? new GroupChannelIdentifier(channel.targetId)
    : new DirectChannelIdentifier(channel.targetId);
  const query = BaseChannel.createMessagesQuery({
    channelIdentifier,
    pageSize: limit,
    ...(before ? { startTime: before } : {}),
  });
  const res = await query.loadNextPage();
  if (!res.isOk) throw new Error(`Nexconn history failed: ${res.code} ${res.msg}`);
  return (res.data?.data || []).map((m) => toIncoming(m, channel));
}

/** shortcut: reads the SDK's cached count on a fresh channel object; may be 0 until channels are loaded. */
export async function getUnreadCount(channel) {
  return channelOf(channel).unreadCount || 0;
}

export async function sendTyping(channel) {
  return channelOf(channel).sendTypingStatus('RC:TxtMsg');
}
