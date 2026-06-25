const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';
export const TOKEN_KEY = 'taskify_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

async function request(path, options = {}, { auth = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && auth) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Auth
export function registerUser(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginUser(payload) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function fetchCurrentUser() {
  return request('/auth/me', { method: 'GET' }, { auth: true });
}

export function updateProfile(payload) {
  return request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

// Tasks (active only)
export function getTasks() {
  return request('/tasks', { method: 'GET' }, { auth: true });
}

export function createTask(task) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) }, { auth: true });
}

export function updateTask(id, task) {
  return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }, { auth: true });
}

// Soft delete — moves task to trash
export function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' }, { auth: true });
}

// Trash
export function getTrashedTasks() {
  return request('/tasks/trash', { method: 'GET' }, { auth: true });
}

export function restoreTask(id) {
  return request(`/tasks/${id}/restore`, { method: 'PATCH' }, { auth: true });
}

export function permanentlyDeleteTask(id) {
  return request(`/tasks/${id}/permanent`, { method: 'DELETE' }, { auth: true });
}

export function emptyTrash() {
  return request('/tasks/trash/empty', { method: 'DELETE' }, { auth: true });
}