export const DemoStore = {
  _items: [],
  add(item){ this._items.unshift(item); },
  list(){
    return this._items.map(it => ({
      time: new Date(it.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
      name_mask: maskName(it.name),
      user_mask: maskUser(it.username)
    }));
  }
};
function maskName(n){ if(!n) return ''; return n[0] + '**' + (n[n.length-1]||''); }
function maskUser(u){
  if (!u) return '';
  const p = u.replace(/^@/,'');
  if (p.length <= 3) return p;
  return p[0] + '*' + p.slice(2, -1).replace(/./g,'*') + p[p.length-1];
}
