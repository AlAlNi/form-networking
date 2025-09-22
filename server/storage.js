export const DemoStore = {
  _items: [],
  add(item){ this._items.unshift(item); },
  list(){
    return this._items.map(it => ({
      time: new Date(it.ts).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
      name_mask: maskName(it.name),
      user_mask: maskUser(it.username)
    }));
  }
};

function maskName(n){
  if (!n) return '';
  const s = n.trim();
  if (s.length <= 2) return s[0] + '*';
  return s[0] + '**' + s.slice(-1);
}
function maskUser(u){
  if (!u) return '';
  const p = u.replace(/^@/,'');
  if (p.length <= 3) return p;
  return p[0] + '*' + p.slice(2, -1).replace(/./g,'*') + p.slice(-1);
}
