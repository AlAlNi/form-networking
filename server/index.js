import express from 'express';
import serverless from '@yandex-cloud/function-express';
import { verifyInitData } from './tg-validate.js';
import { DemoStore } from './storage.js';

const app = express();
app.use(express.json());

app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.end();
  next();
});

app.get('/health', (req,res)=> res.json({ok:true}));

app.post('/api/applications', (req,res)=>{
  const initData = req.header('X-Telegram-Init-Data') || '';
  const { BOT_TOKEN='dummy', DEMO='1' } = process.env;
  if (DEMO !== '1' && !verifyInitData(initData, BOT_TOKEN)) {
    return res.status(401).json({error:'unauthorized'});
  }
  const { name, username } = req.body || {};
  if (!name || !username) return res.status(400).json({error:'bad_payload'});

  DemoStore.add({ name, username, ts: Date.now() });
  return res.json({ok:true});
});

app.get('/api/applications', (req,res)=> res.json(DemoStore.list()));

export const handler = serverless(app);
