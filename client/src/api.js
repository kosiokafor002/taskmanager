const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/tasks';

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getTasks() {
  return request();
}

export function createTask(task) {
  return request('', {
    method: 'POST',
    body: JSON.stringify(task)
  });
}

export function updateTask(id, task) {
  return request(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task)
  });
}

export function deleteTask(id) {
  return request(`/${id}`, {
    method: 'DELETE'
  });
}
