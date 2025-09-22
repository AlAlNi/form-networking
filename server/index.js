import express from "express";
import serverless from "serverless-http";
import { verifyInitData } from "./tg-validate.js";
import { DemoStore } from "./storage.js";

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.end();
  next();
});

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// Проверка живости роутера (возвращает 400 при пустом теле)
app.post("/auth/login", (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "bad_payload" });
  }
  return res.json({ ok: true });
});

// Приём заявок
app.post("/api/applications", (req, res) => {
  const initData = req.header("X-Telegram-Init-Data") || "";
  const { BOT_TOKEN = "dummy", DEMO = "1" } = process.env;

  // В проде проверяем подпись
  if (DEMO !== "1" && !verifyInitData(initData, BOT_TOKEN)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { name, username } = req.body || {};
  if (!name || !username) return res.status(400).json({ error: "bad_payload" });

  DemoStore.add({ name, username, ts: Date.now() });
  return res.json({ ok: true });
});

// Список (демо-режим, маскировано)
app.get("/api/applications", (req, res) => {
  return res.json(DemoStore.list());
});

// Экспорт для Cloud Functions (Node.js)
export const handler = serverless(app);
