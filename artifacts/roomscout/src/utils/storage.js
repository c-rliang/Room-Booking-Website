const KEY = 'roomscout.requests.v1';
let storageWarning = '';
export const getStorageWarning = () => storageWarning;

export function loadRequests() {
  storageWarning = '';
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('Invalid saved list');
    if (parsed.some((r) => !r || typeof r !== 'object' || typeof r.id !== 'string' || typeof r.roomId !== 'string')) throw new Error('Invalid saved record');
    return parsed.map((r) => ({
      ...r, eventName: typeof r.eventName === 'string' ? r.eventName : 'Untitled saved request',
      submittedAt: typeof r.submittedAt === 'string' ? r.submittedAt : '',
      forms: Array.isArray(r.forms) ? r.forms.filter((f) => typeof f === 'string') : [],
    }));
  } catch {
    storageWarning = 'Saved requests could not be read. Your stored data has not been changed. Check browser storage access or export a backup before repairing it.';
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
  const existing = loadRequests();
  if (storageWarning) throw new Error(storageWarning);
  const list = [request, ...existing];
  if (!saveRequests(list)) throw new Error('Could not save to this browser.');
  return list;
}

export function makeRequestId() {
  return 'RS-' + crypto.randomUUID();
}
