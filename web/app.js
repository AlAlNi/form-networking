// Плейсхолдер. Пайплайн подменит на URL API Gateway.
const API_BASE = "%%API_BASE%%";

const form = document.querySelector('#form');
const nameEl = document.querySelector('#name');
const userEl = document.querySelector('#username');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: nameEl.value.trim(),
    username: userEl.value.trim().replace(/^@?/, '@')
  };
  const res = await fetch(`${API_BASE}/api/applications`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) return alert('Ошибка отправки');
  alert('OK (демо): заявка принята');
});




