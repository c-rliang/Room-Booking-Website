const KEY = 'roomscout.requests.v1';

export function loadRequests() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRequests(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function addRequest(request) {
  const list = [request, ...loadRequests()];
  if (!saveRequests(list)) throw new Error('Could not save to this browser.');
  return list;
}

export function makeRequestId() {
  return 'RS-' + String(Math.floor(26000 + Math.random() * 9000));
}
