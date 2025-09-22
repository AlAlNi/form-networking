// Телеграм WebApp init
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); try { tg.expand(); } catch {} }

// Экраны
const formCard    = document.getElementById('card-form');
const successCard = document.getElementById('card-success');
const errorEl     = document.getElementById('error') || (()=>{const p=document.createElement('p');p.id='error';p.className='error';document.body.appendChild(p);return p;})();
const formEl      = document.getElementById('form');
const nameEl      = document.getElementById('name');
const usernameEl  = document.getElementById('username');
const submitBtn   = document.getElementById('submit');

// Плейсхолдер — пайплайн подставит реальный URL API Gateway
const API_BASE = "%%API_BASE%%";
const DEMO = true;

// Автозаполнение из Telegram
try {
  const u = tg?.initDataUnsafe?.user;
  if (u?.first_name) nameEl.value = [u.first_name, u.last_name].filter(Boolean).join(' ');
  if (u?.username) usernameEl.value = '@' + u.username;
} catch {}

formEl?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  submitBtn.disabled = true;

  const payload = {
    name: nameEl.value.trim(),
    username: usernameEl.value.trim().replace(/^@?/, '@'),
    demo: DEMO,
  };

  try {
    const res = await fetch(`${API_BASE}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg?.initData || ''
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text() || 'Server error');

    formCard.hidden = true;
    successCard.hidden = false;
  } catch (err) {
    errorEl.textContent = 'Не удалось отправить: ' + (err.message || err);
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});
