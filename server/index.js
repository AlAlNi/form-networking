import express from 'express';
import serverless from '@yandex-cloud/function-express';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// заглушки, чтобы API Gateway не падал
app.get('/api/applications', (req,res)=> res.json([]));
app.post('/api/applications', (req,res)=> res.json({ ok:true }));

export const handler = serverless(app);
