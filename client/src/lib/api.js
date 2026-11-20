const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let jwtToken = localStorage.getItem('rehearsal_jwt') || '';

export function setToken(token) {
  jwtToken = token;
  if (token) {
    localStorage.setItem('rehearsal_jwt', token);
  } else {
    localStorage.removeItem('rehearsal_jwt');
  }
}

export function getToken() {
  return jwtToken;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function register(username, displayName, password, role = 'learner') {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, displayName, password, role }),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return request('/me');
}

export async function getNexconnToken() {
  return request('/nexconn/token', { method: 'POST' });
}

export async function listScenarios() {
  return request('/scenarios');
}

export async function getScenario(id) {
  return request(`/scenarios/${id}`);
}

export async function createCustomScenario(situation) {
  return request('/scenarios/custom', {
    method: 'POST',
    body: JSON.stringify({ situation }),
  });
}

export async function createSession(scenarioId, difficulty = 'neutral', userContext = '') {
  return request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ scenarioId, difficulty, userContext }),
  });
}

export async function listSessions() {
  return request('/sessions');
}

export async function getSession(id) {
  return request(`/sessions/${id}`);
}

export async function getTranscript(id) {
  return request(`/sessions/${id}/transcript`);
}

export async function sendTurn(id, text, nexconnMessageUid = null) {
  return request(`/sessions/${id}/turns`, {
    method: 'POST',
    body: JSON.stringify({ text, nexconnMessageUid }),
  });
}

export async function sendCoachMessage(id, text, nexconnMessageUid = null) {
  return request(`/sessions/${id}/coach-channel/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, nexconnMessageUid }),
  });
}

export async function endSession(id) {
  return request(`/sessions/${id}/end`, { method: 'POST' });
}

export async function getScorecard(id) {
  return request(`/sessions/${id}/scorecard`);
}

export async function createInvite(id) {
  return request(`/sessions/${id}/invites`, { method: 'POST' });
}

export async function joinInvite(code) {
  return request(`/invites/${code}/join`, { method: 'POST' });
}
