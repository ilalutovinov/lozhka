const S=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const W=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MEAT=['баранина','говядина','курица','рыба'],ANIM=[...MEAT,'яйца','молоко','творог'];
const PR0={рис:[110,130],баранина:[650,750],говядина:[600,700],курица:[330,380],морковь:[40,55],лук:[30,40],картофель:[45,60],мука:[55,65],яйца:[170,200],макароны:[90,110],гречка:[100,120],капуста:[35,50],помидор:[90,130],огурец:[80,120],масло:[220,260],молоко:[70,85],творог:[250,300],нут:[130,150],рыба:[400,480],тыква:[30,45],чечевица:[110,130]};
const D0=[
['plov','Плов','🍚',['l','d'],{рис:90,баранина:90,морковь:90,лук:40,масло:20},[]],
['lagman','Лагман','🍜',['l','d'],{мука:90,говядина:80,картофель:60,помидор:60,лук:40,масло:15},['gluten']],
['manty','Манты','🥟',['l','d'],{мука:90,баранина:100,лук:80,тыква:50},['gluten']],
['shorpo','Шорпо','🍲',['l'],{говядина:90,картофель:120,морковь:50,лук:40},[]],
['samsa','Самса','🥐',['b','l'],{мука:80,баранина:70,лук:70,масло:10},['gluten']],
['oromo','Оромо','🌀',['l','d'],{мука:80,картофель:100,говядина:50,лук:40},['gluten']],
['kuur','Куурдак','🍖',['d'],{баранина:120,картофель:120,лук:60},[]],
['chick','Курица с картофелем','🍗',['l','d'],{курица:150,картофель:150,лук:30,морковь:30},[]],
['grecha','Гречка с курицей','🥘',['l','d'],{гречка:80,курица:100,лук:30,морковь:30},[]],
['gulash','Гуляш с гречкой','🍛',['l','d'],{говядина:100,гречка:70,лук:40,морковь:40,помидор:40},[]],
['pasta','Макароны с курицей','🍝',['l','d'],{макароны:90,курица:90,помидор:60,лук:30},['gluten']],
['borsh','Борщ','🥣',['l'],{говядина:70,капуста:80,картофель:80,морковь:30,лук:30,помидор:30},[]],
['fish','Рыба с картофелем','🐟',['d'],{рыба:150,картофель:150,лук:30,масло:5},['fish']],
['egg','Яичница с помидорами','🍳',['b'],{яйца:100,помидор:80,масло:5},['eggs']],
['syr','Сырники','🥞',['b'],{творог:120,яйца:30,мука:20,масло:10},['lactose','eggs','gluten']],
['gcm','Гречка с молоком','🥛',['b'],{гречка:60,молоко:150},['lactose']],
['tkasha','Тыквенная каша','🎃',['b'],{тыква:200,рис:40,молоко:100},['lactose']],
['salat','Салат с яйцом','🥗',['d'],{огурец:120,помидор:120,масло:10,яйца:50},['eggs']],
['lent','Чечевичный суп','🫕',['l'],{чечевица:70,морковь:50,лук:40,картофель:80,масло:10},[]],
['nut','Нут с овощами','🫘',['l','d'],{нут:80,помидор:80,лук:40,морковь:50,масло:10},[]],
['kap','Тушёная капуста с картофелем','🥬',['l','d'],{капуста:150,картофель:100,морковь:40,лук:30,масло:10},[]]
].map(x=>({id:x[0],n:x[1],em:x[2],t:x[3],i:x[4],a:x[5]}));
let D=S('dishes',D0),P=S('prices',PR0),USER=S('user',null);
const ST0={step:0,type:0,adults:2,kids:0,meals:{b:1,l:1,d:1},budget:4000,diet:'all',al:[],dis:[],likes:[]};
let st=S('st',ST0),view='wiz',res=null,tab='dishes',adm=false,msg='';
const MN={b:'Завтрак',l:'Обед',d:'Ужин'},DAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const AL={gluten:'Глютен',lactose:'Лактоза',eggs:'Яйца',fish:'Рыба'},DIS={лук:'Лук',морковь:'Морковь',баранина:'Баранина',говядина:'Говядина',курица:'Курица',нут:'Нут'};
const fmt=n=>Math.round(n).toLocaleString('ru-RU')+' сом';
const save=()=>W('st',st);
function cost(d,pk,f){return Object.entries(d.i).reduce((s,[k,g])=>s+g*((P[k]||[0,0])[pk])/1000,0)*f}
function gen(){
 const pk=st.type,f=st.adults+st.kids*.6;
 const ok=D.filter(d=>{const ks=Object.keys(d.i);
  if(d.a.some(a=>st.al.includes(a))||ks.some(k=>st.dis.includes(k)))return false;
  if(st.diet==='veg')return !ks.some(k=>MEAT.includes(k));
  if(st.diet==='vegan')return !ks.some(k=>ANIM.includes(k));return true});
 const use={},slots=[];
 for(let day=0;day<7;day++)for(const m of ['b','l','d']){if(!st.meals[m])continue;
  let pool=ok.filter(d=>d.t.includes(m));if(!pool.length)pool=ok;if(!pool.length)return {err:1};
  const rec=slots.filter(s=>s.day>=day-2).map(s=>s.d.id);
  const sc=d=>(st.likes.includes(d.id)?3:0)+Math.random()*2-4*rec.includes(d.id)-(use[d.id]||0)*.8;
  const d=pool.slice().sort((a,b)=>sc(b)-sc(a))[0];use[d.id]=(use[d.id]||0)+1;slots.push({day,m,d,pool})}
 const tot=()=>slots.reduce((s,x)=>s+cost(x.d,pk,f),0);
 for(let n=0;n<400&&tot()>st.budget;n++){let done=0;
  for(const s of slots.slice().sort((a,b)=>cost(b.d,pk,f)-cost(a.d,pk,f))){
   const alt=s.pool.filter(d=>(use[d.id]||0)<4&&cost(d,pk,f)<cost(s.d,pk,f)-1).sort((a,b)=>cost(a,pk,f)-cost(b,pk,f))[0];
   if(alt){use[s.d.id]--;use[alt.id]=(use[alt.id]||0)+1;s.d=alt;done=1;break}}
  if(!done)break}
 const list={};slots.forEach(s=>Object.entries(s.d.i).forEach(([k,g])=>list[k]=(list[k]||0)+g*f));
 const stt=S('stats',{gen:0,d:{}});stt.gen++;slots.forEach(s=>stt.d[s.d.id]=(stt.d[s.d.id]||0)+1);W('stats',stt);
 return {slots,total:tot(),list,pk,f}}
function chips(obj,key){return Object.entries(obj).map(([k,v])=>`<button class="chip ${st[key].includes(k)?'on':''}" onclick="tg('${key}','${k}')">${v}</button>`).join('')}
function tg(key,k){const a=st[key],i=a.indexOf(k);i<0?a.push(k):a.splice(i,1);save();draw()}
function set(k,v){st[k]=v;save();draw()}
function nav(){return `<header><span class="logo">🥄 Ложка</span><nav>
<button onclick="go('wiz')">Рацион</button><button onclick="go('mine')">Мои</button><button onclick="go('admin')">Админ</button>
<button onclick="login()">${USER?'👤 '+e(USER):'Войти'}</button></nav></header>`}
function go(v){view=v;msg='';if(v==='wiz'&&st.step>4)st.step=0;draw()}
function login(){if(USER){if(confirm('Выйти?')){USER=null;W('user',null)}}else{const n=prompt('Демо-вход. Введите имя (Telegram-вход подключится вместе с сервером):');if(n){USER=n.slice(0,30);W('user',USER)}}draw()}
function steps(){
 const s=st.step,pct=(s+1)/6*100;let b='',nx='Далее';
 if(s===0)b=`<h1>Где покупаешь продукты?</h1><p class="s">От этого зависят цены.</p><div class="grid">
 ${['🧺 Базар|Орто-Сай, Ошский, Дордой','🛒 Супермаркет|Сетевые магазины'].map((x,i)=>{const[a,c]=x.split('|');return `<button class="card opt ${st.type===i?'on':''}" onclick="set('type',${i})"><b>${a.split(' ')[0]}</b>${a.split(' ')[1]}<div class="sm">${c}</div></button>`}).join('')}</div>`;
 if(s===1)b=`<h1>Кто будет кушать?</h1><p class="s">Влияет на размер порций и объём закупки.</p>
 ${[['adults','Взрослые',1],['kids','Дети (порция ×0,6)',0]].map(([k,l,mn])=>`<div class="card row"><span>${l}</span><div class="cnt"><button onclick="set('${k}',Math.max(${mn},st.${k}-1))">−</button><b>${st[k]}</b><button onclick="set('${k}',Math.min(8,st.${k}+1))">+</button></div></div>`).join('')}`;
 if(s===2)b=`<h1>Приёмы пищи и бюджет</h1><p class="s">Бюджет на неделю на всех.</p>
 <div class="grid g3">${['b','l','d'].map(m=>`<button class="card opt ${st.meals[m]?'on':''}" onclick="st.meals['${m}']=st.meals['${m}']?0:1;save();draw()">${MN[m]}</button>`).join('')}</div>
 <div class="card"><div class="tot">${fmt(st.budget)}</div><input type="range" min="1500" max="30000" step="250" value="${st.budget}" oninput="st.budget=+this.value;save();document.querySelector('.tot').textContent=fmt(st.budget)"><div class="sm">≈ ${fmt(st.budget/(st.adults+st.kids*.6))} на человека в неделю</div></div>`;
 if(s===3)b=`<h1>Питание и ограничения</h1><p class="s">Все блюда без свинины (халяль).</p><div class="grid g3">
 ${[['all','Всё ем'],['veg','Вегетарианец'],['vegan','Веган']].map(([k,l])=>`<button class="card opt ${st.diet===k?'on':''}" onclick="set('diet','${k}')">${l}</button>`).join('')}</div>
 <p class="sm">Аллергии</p>${chips(AL,'al')}<p class="sm">Не люблю</p>${chips(DIS,'dis')}`;
 if(s===4){nx='Посчитать рацион';b=`<h1>Что тебе нравится?</h1><p class="s">Отметь любимые блюда — они попадут в меню чаще.</p>
 ${D.map(d=>`<button class="chip ${st.likes.includes(d.id)?'on':''}" onclick="tg('likes','${d.id}')">${d.em} ${e(d.n)}</button>`).join('')}`}
 return `<div class="seg">${[0,1,2,3,4,5].map(i=>`<i class="${i<=s?'f':''}"></i>`).join('')}</div><div class="sm">Шаг ${s+1} из 6</div>${b}
 <div class="fix"><div>${s?'<button onclick="st.step--;draw()">←</button>':''}<button class="p" onclick="next()">${nx}</button></div></div>`}
function next(){if(st.step<4){st.step++;save();draw();return}
 res=gen();if(res.err){alert('Под эти ограничения не нашлось блюд. Смягчи фильтры.');return}st.step=5;save();draw()}
function result(){
 if(!res)return `<div class="card">Рацион не собран.</div><button class="p" onclick="st.step=0;draw()">Начать</button>`;
 const over=res.total>st.budget,days=[0,1,2,3,4,5,6];
 return `<h1>Твой рацион на неделю</h1><div class="card"><div class="tot">${fmt(res.total)}</div><div class="sm">из бюджета ${fmt(st.budget)} · ${['базар','супермаркет'][res.pk]}</div></div>
 <div class="warn ${over?'':'ok'}">${over?'⚠️ В бюджет не укладываемся: цены выше. Увеличь бюджет или сократи приёмы пищи.':'✅ Укладываемся в бюджет.'}</div>
 <div class="sc card"><table>${days.map(d=>`<tr><th colspan="2">${DAYS[d]}</th></tr>`+res.slots.filter(s=>s.day===d).map(s=>`<tr><td>${MN[s.m]}</td><td>${s.d.em} ${e(s.d.n)} <span class="sm">${fmt(cost(s.d,res.pk,res.f))}</span></td></tr>`).join('')).join('')}</table></div>
 <h1>Список покупок</h1><div class="card"><table>${Object.entries(res.list).sort((a,b)=>b[1]-a[1]).map(([k,g])=>`<tr><td>${e(k)}</td><td>${g>=1000?(g/1000).toFixed(1)+' кг':Math.round(g/10)*10+' г'}</td><td>${fmt(g*(P[k]||[0,0])[res.pk]/1000)}</td></tr>`).join('')}</table>
 <div class="sm">Цены примерные, их обновляет админ.</div></div>
 <div class="fix"><div><button onclick="st.step=4;draw()">Изменить</button><button onclick="res=gen();draw()">🔄 Заново</button><button class="p" onclick="saveR()">Сохранить</button></div></div>`}
function saveR(){if(!USER){login();if(!USER)return}const a=S('rations',[]);a.unshift({u:USER,at:new Date().toLocaleDateString('ru-RU'),total:res.total,slots:res.slots.map(s=>({day:s.day,m:s.m,id:s.d.id}))});W('rations',a.slice(0,20));alert('Сохранено в «Мои»')}
function mine(){const a=S('rations',[]).filter(r=>USER&&r.u===USER);
 return `<h1>Мои рационы</h1>`+(USER?'':'<div class="warn">Войди, чтобы видеть сохранённые рационы.</div>')+(a.map(r=>`<div class="card"><b>${r.at}</b> · ${fmt(r.total)}<div class="sm">${r.slots.length} приёмов пищи</div></div>`).join('')||'<p class="s">Пока пусто.</p>')}
function admin(){
 if(!adm){return `<h1>Админ-панель</h1><div class="card"><input id="pw" type="password" placeholder="Код доступа"><br><br><button class="p" onclick="if(pw.value==='admin'){adm=true;draw()}else alert('Неверно')">Войти</button><div class="sm">Демо-код: admin. На сервере будет роль в базе.</div></div>`}
 const tb=['dishes','prices','stats'].map(t=>`<button class="${tab===t?'on':''}" onclick="tab='${t}';draw()">${{dishes:'Блюда',prices:'Цены',stats:'Статистика'}[t]}</button>`).join(' ');
 let b='';
 if(tab==='dishes')b=`<div class="card"><b>Новое блюдо</b><br><br><input id="dn" placeholder="Название"><br><br><input id="de" placeholder="Эмодзи 🍲"><br><br><select id="dm"><option value="b">Завтрак</option><option value="l">Обед</option><option value="d">Ужин</option><option value="l,d">Обед и ужин</option></select><br><br><textarea id="di" placeholder="Ингредиенты, г на порцию: рис:90, баранина:90"></textarea><br><br><button class="p" onclick="addD()">Добавить</button><div class="warn">${msg}</div></div>`+D.map(d=>`<div class="card row"><span>${d.em} ${e(d.n)}<div class="sm">${Object.entries(d.i).map(([k,g])=>e(k)+' '+g).join(', ')}</div></div><button onclick="delD('${d.id}')">✕</button></div>`).join('');
 if(tab==='prices')b=`<div class="card"><div class="sm">Сом за кг/л</div><table><tr><th></th><th>Базар</th><th>Супер</th></tr>${Object.entries(P).map(([k,v])=>`<tr><td>${e(k)}</td>${[0,1].map(i=>`<td><input type="number" value="${v[i]}" onchange="P['${k}'][${i}]=+this.value;W('prices',P)"></td>`).join('')}</tr>`).join('')}</table></div>`;
 if(tab==='stats'){const s=S('stats',{gen:0,d:{}}),top=Object.entries(s.d).sort((a,b)=>b[1]-a[1]).slice(0,5);
  b=`<div class="card"><div class="tot">${s.gen}</div>рационов собрано (на этом устройстве)</div><div class="card"><b>Топ блюд</b>${top.map(([id,n])=>{const d=D.find(x=>x.id===id);return `<div class="row"><span>${d?d.em+' '+e(d.n):id}</span><b>${n}</b></div>`}).join('')||'<div class="sm">Данных нет</div>'}</div><div class="warn">Число пользователей и общая статистика появятся после подключения базы.</div>`}
 return `<h1>Админ-панель</h1><div>${tb}</div><br>${b}`}
function addD(){const n=dn.value.trim(),i={};di.value.split(',').forEach(p=>{const[k,g]=p.split(':');if(k&&+g>0)i[k.trim().toLowerCase()]=+g});
 if(!n||!Object.keys(i).length){msg='Нужны название и ингредиенты';draw();return}
 Object.keys(i).forEach(k=>{if(!P[k])P[k]=[0,0]});D.push({id:'c'+Date.now(),n,em:de.value||'🍽️',t:dm.value.split(','),i,a:[]});W('dishes',D);W('prices',P);msg='Добавлено. Заполни цены новых продуктов во вкладке «Цены».';draw()}
function delD(id){if(confirm('Удалить блюдо?')){D=D.filter(d=>d.id!==id);W('dishes',D);draw()}}
function draw(){const a=document.getElementById('app');
 a.innerHTML=nav()+(view==='admin'?admin():view==='mine'?mine():st.step>4?result():steps());window.scrollTo(0,0)}
draw();
