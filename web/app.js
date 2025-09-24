const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); try { tg.expand(); } catch {} }

const formCard    = document.getElementById('card-form');
const successCard = document.getElementById('card-success');
const errorEl     = document.getElementById('error') || (()=>{const p=document.createElement('p');p.id='error';p.className='error';document.body.appendChild(p);return p;})();
const formEl      = document.getElementById('form');
const nameEl      = document.getElementById('name');
const usernameEl  = document.getElementById('username');
const submitBtn   = document.getElementById('submit');

function normalizeBase(value){
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('%%')) return '';
  return trimmed.replace(/\/$/, '');
}

const API_BASE = normalizeBase(window.__API_BASE__) || normalizeBase(document.body?.dataset?.apiBase);
const buildApiUrl = (path) => {
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};
const DEMO = true;

try {
  const u = tg?.initDataUnsafe?.user;
  if (u?.first_name) nameEl.value = [u.first_name, u.last_name].filter(Boolean).join(' ');
  if (u?.username)   usernameEl.value = '@' + u.username;
} catch {}

formEl?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (errorEl) errorEl.hidden = true;
  if (submitBtn) submitBtn.disabled = true;

  const payload = {
    name: nameEl.value.trim(),
    username: usernameEl.value.trim().replace(/^@?/, '@'),
    demo: DEMO,
  };

  try {
    const res = await fetch(buildApiUrl('/api/applications'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg?.initData || ''
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Server error');
    if (formCard) formCard.hidden = true;
    if (successCard) successCard.hidden = false;
  } catch (err) {
    if (errorEl){
      errorEl.textContent = 'Не удалось отправить: ' + (err?.message || err);
      errorEl.hidden = false;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
