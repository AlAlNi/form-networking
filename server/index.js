import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyInitData } from './tg-validate.js';
import { DemoStore } from './storage.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
};

const STATIC_HEADERS = {
  ...CORS_HEADERS,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), 'public');

const STATIC_CACHE = new Map();

function readStatic(name) {
  if (!STATIC_CACHE.has(name)) {
    const filePath = join(STATIC_DIR, name);
    STATIC_CACHE.set(name, readFileSync(filePath, 'utf8'));
  }
  return STATIC_CACHE.get(name);
}

let cachedIndex = { apiBase: null, body: null };

function renderIndexHtml() {
  const apiBase = process.env.API_BASE?.trim() || '';
  if (cachedIndex.body && cachedIndex.apiBase === apiBase) {
    return cachedIndex.body;
  }
  const template = readStatic('index.html');
  const rendered = template.replaceAll('%%API_BASE%%', apiBase);
  cachedIndex = { apiBase, body: rendered };
  return rendered;
}

const STATIC_ROUTES = new Map([
  ['/',            { file: 'index.html', contentType: 'text/html; charset=utf-8', dynamic: true }],
  ['/index.html',  { file: 'index.html', contentType: 'text/html; charset=utf-8', dynamic: true }],
  ['/app.css',     { file: 'app.css',    contentType: 'text/css; charset=utf-8' }],
  ['/app.js',      { file: 'app.js',     contentType: 'application/javascript; charset=utf-8' }],
]);

const NO_CONTENT_RESPONSE = {
  statusCode: 204,
  headers: { ...CORS_HEADERS },
  body: '',
  isBase64Encoded: false,
};

function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
    isBase64Encoded: false,
  };
}

function textResponse(statusCode, body, contentType, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...STATIC_HEADERS,
      'Content-Type': contentType,
      ...extraHeaders,
    },
    body,
    isBase64Encoded: false,
  };
}

function errorResponse(statusCode, error) {
  return jsonResponse(statusCode, { error });
}

function normalizePath(path) {
  if (!path) return '/';
  const qIndex = path.indexOf('?');
  const cleanPath = qIndex >= 0 ? path.slice(0, qIndex) : path;
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return cleanPath.slice(0, -1);
  }
  return cleanPath || '/';
}

function collectHeaders(event) {
  const source = event?.headers || {};
  const result = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      result[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      result[key.toLowerCase()] = value.join(',');
    }
  }
  return result;
}

function parseBody(event) {
  if (!event || typeof event.body !== 'string') {
    return {};
  }
  let raw = event.body;
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, 'base64').toString();
  }
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function handler(event = {}) {
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return NO_CONTENT_RESPONSE;
  }

  const path = normalizePath(event.rawPath || event.path || event.requestContext?.http?.path || '/');
  const headers = collectHeaders(event);

  if ((method === 'GET' || method === 'HEAD') && STATIC_ROUTES.has(path)) {
    const { file, contentType, dynamic } = STATIC_ROUTES.get(path);
    try {
      if (method === 'HEAD') {
        return textResponse(200, '', contentType);
      }
      const body = dynamic ? renderIndexHtml() : readStatic(file);
      return textResponse(200, body, contentType);
    } catch (err) {
      console.error('Failed to render static asset', err);
      return errorResponse(500, 'static_error');
    }
  }

  if (method === 'GET' && path === '/health') {
    return jsonResponse(200, { ok: true });
  }

  if (path === '/api/applications') {
    if (method === 'GET') {
      return jsonResponse(200, DemoStore.list());
    }

    if (method === 'POST') {
      const initData = headers['x-telegram-init-data'] || '';
      const { BOT_TOKEN = 'dummy', DEMO = '1' } = process.env;
      if (DEMO !== '1' && !verifyInitData(initData, BOT_TOKEN)) {
        return errorResponse(401, 'unauthorized');
      }

      const payload = parseBody(event);
      if (!payload) {
        return errorResponse(400, 'bad_payload');
      }

      const { name, username } = payload;
      if (!name || !username) {
        return errorResponse(400, 'bad_payload');
      }

      DemoStore.add({ name, username, ts: Date.now() });
      return jsonResponse(200, { ok: true });
    }
  }

  return errorResponse(404, 'not_found');
}

export default handler;
