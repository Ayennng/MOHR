// Base URL of the backend API. Accepts a full URL ("http://localhost:3001") or a bare
// "host:port", which is what Render's private-network `hostport` reference provides.
const raw = process.env.BACKEND_URL || 'http://localhost:3001';

export const BACKEND_URL = (/^https?:\/\//.test(raw) ? raw : `http://${raw}`).replace(/\/+$/, '');
