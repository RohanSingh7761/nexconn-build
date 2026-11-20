import {
  Configuration,
  UserManagementApi,
  MessageManagementApi,
  GroupChannelManagementApi,
} from '@nexconn/server-sdk';

export interface NexconnServerConfig {
  appKey: string;
  appSecret: string;
  primaryDomain: string;
  secondaryDomain: string;
}

let usersApi: UserManagementApi | null = null;
let messagesApi: MessageManagementApi | null = null;
let groupsApi: GroupChannelManagementApi | null = null;

function ensureUrl(urlOrDomain: string): string {
  if (!urlOrDomain) return urlOrDomain;
  return /^https?:\/\//i.test(urlOrDomain) ? urlOrDomain : `https://${urlOrDomain}`;
}

export function initNexconnServer(config: NexconnServerConfig) {
  const cfg = new Configuration();
  cfg.setNexconnCredentials(config.appKey, config.appSecret);
  cfg.setPrimaryBackupDomains(ensureUrl(config.primaryDomain), ensureUrl(config.secondaryDomain));

  usersApi = new UserManagementApi(cfg);
  messagesApi = new MessageManagementApi(cfg);
  groupsApi = new GroupChannelManagementApi(cfg);
}

export async function issueToken(userId: string, name: string, avatarUrl?: string) {
  if (!usersApi) {
    throw new Error('Nexconn server SDK not initialized');
  }
  const { data } = await usersApi.issueAccessToken({
    userId,
    name,
    avatarUrl,
  });
  return {
    userId: data.result?.userId || userId,
    token: data.result?.accessToken,
  };
}

export async function sendDirectText(fromUserId: string, toUserId: string, text: string) {
  if (!messagesApi) {
    throw new Error('Nexconn server SDK not initialized');
  }
  const { data } = await messagesApi.sendDirectChannelMessage({
    fromUserId,
    toUserIds: [toUserId],
    messageType: 'RC:TxtMsg',
    content: JSON.stringify({ content: text }),
    shouldPersist: 1,
  });

  const delivery = data.result?.messageIds?.[0];
  return {
    messageUid: delivery?.messageId,
    userId: delivery?.userId,
  };
}

export async function sendGroupText(fromUserId: string, groupId: string, text: string) {
  if (!messagesApi) {
    throw new Error('Nexconn server SDK not initialized');
  }
  const { data } = await messagesApi.sendGroupChannelMessage({
    fromUserId,
    toChannelIds: [groupId],
    messageType: 'RC:TxtMsg',
    content: JSON.stringify({ content: text }),
    shouldPersist: 1,
  });

  const delivery = data.result?.messageIds?.[0];
  return {
    messageUid: delivery?.messageId,
    channelId: delivery?.channelId,
  };
}

export async function createCoachGroup(groupId: string, name: string, ownerUserId: string, memberIds: string[] = []) {
  if (!groupsApi) {
    throw new Error('Nexconn server SDK not initialized');
  }
  const { data } = await groupsApi.createGroupChannel({
    channelId: groupId,
    name,
    owner: ownerUserId,
    userIds: memberIds,
  });
  return data;
}

export async function joinCoachGroup(groupId: string, userIds: string[]) {
  if (!groupsApi) {
    throw new Error('Nexconn server SDK not initialized');
  }
  const { data } = await groupsApi.joinGroupChannel({
    channelId: groupId,
    userIds,
  });
  return data;
}
