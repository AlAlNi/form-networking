import crypto from 'crypto';
export function verifyInitData(initData, botToken) {
  if (!initData) return false;
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const url = new URLSearchParams(initData);
  const hash = url.get('hash');
  url.delete('hash');
  const dataCheckString = Array.from(url.keys()).sort().map(k => `${k}=${url.get(k)}`).join('\n');
  const hmac = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return hmac === hash;
}
