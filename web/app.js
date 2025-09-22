const API_BASE = "%%API_BASE%%"; // Пайплайн подставит URL API Gateway

const formEl = document.getElementById("form");
const nameEl = document.getElementById("name");
const userEl = document.getElementById("username");
const noteEl = document.getElementById("note");

formEl?.addEventListener("submit", (e) => e.preventDefault());

document.getElementById("submit")?.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("bad response");
    alert("Связь с бэкендом есть. На следующем шаге подключим отправку заявки.");
  } catch (e) {
    alert("Бэкенд недоступен: " + (e.message || e));
  }
});
