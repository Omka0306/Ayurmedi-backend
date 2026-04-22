import { URLS, getAuthHeader, getState } from './setup.js';

export async function apiCall(stack, method, path, body = null, extraHeaders = {}) {
  const baseUrl = URLS[stack];
  const url = `${baseUrl}${path}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...extraHeaders,
    },
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(url, options);
  const data = await res.json();
  
  return { status: res.status, data };
}

// Stack routing map — maps endpoint prefix to stack name
export function stackFor(endpoint) {
  if (endpoint.startsWith('/auth') || endpoint.startsWith('/users')) return 'auth';
  if (endpoint.startsWith('/hospitals') || endpoint.startsWith('/branches') || endpoint.startsWith('/doctors') || endpoint.startsWith('/forms')) return 'core';
  if (endpoint.startsWith('/patients') || endpoint.startsWith('/consultations') || endpoint.startsWith('/prescriptions')) return 'clinical';
  if (endpoint.startsWith('/bills') || endpoint.startsWith('/inventory')) return 'billing';
  if (endpoint.startsWith('/reports') || endpoint.startsWith('/dashboard')) return 'reports';
  if (endpoint.startsWith('/tokens') || endpoint.startsWith('/panchakarma')) return 'therapy';
  throw new Error(`Unknown stack for endpoint: ${endpoint}`);
}
