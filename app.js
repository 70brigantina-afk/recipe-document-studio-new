const $=id=>document.getElementById(id);
const categories=['Все','Выпечка','Десерты','Мороженое','Напитки','Кремы и соусы','Другое'];
let catalog=[],own=[],category='Все',author='',query='';
const storageKey='irina-recipes-local-v1';
try{own=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{own=[]}
const all=()=>[...own,...catalog];
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const validLink=value=>{try{let u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}};
const addText=(parent,tag,cls,text)=>{let x=el(tag,cls,text);parent.append(x);return x};

function render(){
  const list=all(),authors=[...new Set(list.map(x=>x.author||'Без автора'))].sort((a,b)=>a.localeCompare(b,'ru'));
  const authorSelect=$('author');authorSelect.replaceChildren(new Option('Все авторы',''),...authors.map(x=>new Option(x,x)));authorSelect.value=authors.includes(author)?author:'';
  const nav=$('categories');nav.replaceChildren(...categories.map(c=>{let b=el('button',category===c?'active':'',c);b.onclick=()=>{category=c;render()};return b}));
  const filtered=list.filter(r=>(category==='Все'||r.category===category)&&(!author||(r.author||'Без автора')===author)&&(!query||[r.title,r.ingredients,r.directions,r.author,r.source].join(' ').toLocaleLowerCase('ru').includes(query)));
  $('total').textContent=`${list.length} рецептов`;$('count').textContent=`${filtered.length} найдено`;$('result-title').textContent=category==='Все'?'Все рецепты':category;
  const groups=$('groups');groups.replaceChildren();
  if(!filtered.length){addText(groups,'div','empty','Рецептов по этому запросу пока нет. Попробуйте другое слово.');return}
  for(const name of [...new Set(filtered.map(r=>r.author||'Без автора'))].sort((a,b)=>a.localeCompare(b,'ru'))){
    const items=filtered.filter(r=>(r.author||'Без автора')===name),section=el('section');
    let h=el('div','group-title');addText(h,'h3','',name);addText(h,'span','',String(items.length));section.append(h);
    let grid=el('div','grid');for(const r of items){let card=el('button','card');card.type='button';card.onclick=()=>openRecipe(r);
      let cover=el('div','cover');if(r.imageUrl){let img=el('img');img.src=r.imageUrl;img.alt=r.title;img.loading='lazy';img.onerror=()=>img.replaceWith(el('span','fallback','✳'));cover.append(img)}else addText(cover,'span','fallback',r.category==='Напитки'?'☕':r.category==='Мороженое'?'❄':'✳');
      if(r.videoUrl)addText(cover,'span','video-badge','▶ Видео');card.append(cover);
      let body=el('div','card-content');addText(body,'span','tag',r.category);addText(body,'h4','',r.title);addText(body,'p','',(r.ingredients||'').split('\n').filter(Boolean).slice(0,2).join(' · ')||'Открыть рецепт');addText(body,'small','',r.sourceUrl?'Открыть источник в карточке ↗':'Ссылка на пост уточняется');card.append(body);grid.append(card)
    }section.append(grid);groups.append(section)
  }
}

function openRecipe(r){
  const body=$('detail-body');body.replaceChildren();if(r.imageUrl){let img=el('img','hero-img');img.src=r.imageUrl;img.alt=r.title;body.append(img)}
  addText(body,'span','tag',r.category);addText(body,'h2','',r.title);addText(body,'p','meta',`Автор: ${r.author||'Без автора'} · ${r.source||'Личный рецепт'}${r.date?' · '+r.date:''}`);
  let sections=el('div','recipe-sections');for(const [heading,value] of [['Ингредиенты',r.ingredients],['Как готовить',r.directions]]){let s=el('section');addText(s,'h3','',heading);addText(s,'p','',value||'В источнике');sections.append(s)}body.append(sections);
  let links=el('div','links');for(const [url,label,cls] of [[r.sourceUrl,'Открыть конкретный пост',''],[r.videoUrl,'Смотреть видео','video']]){let href=validLink(url);if(href){let a=el('a',cls,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a)}}body.append(links);
  if(!r.sourceUrl)addText(body,'p','note','Точная ссылка на этот пост ещё не установлена. Кнопка перехода появится после проверки.');
  $('detail').showModal();history.replaceState(null,'','#'+encodeURIComponent(r.id));
}
function close(dialog){dialog.close();if(dialog.id==='detail')history.replaceState(null,'',location.pathname+location.search)}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>close(b.closest('dialog')));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)close(d)}));
$('search').oninput=e=>{query=e.target.value.toLocaleLowerCase('ru').trim();render()};
$('author').onchange=e=>{author=e.target.value;render()};
$('add').onclick=()=>{$('recipe-form').reset();$('import-status').textContent='Автозаполнение работает, когда сайт источника разрешает чтение страницы. Проверьте текст перед сохранением.';$('editor').showModal()};

function readStructuredRecipe(doc){
  const blocks=[...doc.querySelectorAll('script[type="application/ld+json"]')];
  for(const block of blocks){try{let data=JSON.parse(block.textContent);let queue=[data];while(queue.length){let o=queue.shift();if(Array.isArray(o)){queue.push(...o);continue}if(!o||typeof o!=='object')continue;if(o['@graph'])queue.push(o['@graph']);if((Array.isArray(o['@type'])?o['@type']:[o['@type']]).includes('Recipe'))return o}}catch{}}
  return null
}
function plain(v){return typeof v==='string'?v:Array.isArray(v)?plain(v[0]):v?.url||v?.contentUrl||v?.name||''}
function instructions(v){if(typeof v==='string')return v;if(Array.isArray(v))return v.map(x=>instructions(x)).join('\n');return v?.text||v?.itemListElement?.map(x=>instructions(x)).join('\n')||''}
$('import').onclick=async()=>{
  const url=validLink($('import-url').value),status=$('import-status');if(!url){status.textContent='Укажите ссылку с https://';return}
  $('import').disabled=true;status.textContent='Читаю страницу…';
  try{
    const response=await fetch(url,{redirect:'follow'});if(!response.ok)throw Error('Источник не ответил');
    const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html'),recipe=readStructuredRecipe(doc),form=$('recipe-form');
    if(!recipe)throw Error('На странице нет доступной разметки рецепта');
    const meta=name=>doc.querySelector(`meta[property="${name}"]`)?.content||'';
    const image=plain(recipe.image)||meta('og:image'),video=plain(recipe.video);
    const authorName=plain(recipe.author);
    form.elements.title.value=recipe.name||meta('og:title')||'';
    form.elements.author.value=authorName;
    form.elements.ingredients.value=(recipe.recipeIngredient||[]).join('\n');
    form.elements.directions.value=instructions(recipe.recipeInstructions);
    form.elements.sourceUrl.value=url;
    form.elements.videoUrl.value=validLink(video);
    form.elements.imageUrl.value=validLink(image);
    status.textContent='Данные заполнены. Проверьте их и сохраните рецепт.';
  }catch(e){status.textContent='Автоматически прочитать этот сайт не удалось: '+e.message+'. Ссылку можно сохранить и заполнить рецепт вручную.';$('recipe-form').elements.sourceUrl.value=url}
  finally{$('import').disabled=false}
};
$('recipe-form').onsubmit=async e=>{
  e.preventDefault();const f=e.currentTarget,pic=$('photo').files[0];let imageUrl=validLink(f.elements.imageUrl.value);
  if(pic){if(pic.size>900000){$('import-status').textContent='Фото больше 900 КБ: выберите меньший файл или укажите ссылку.';return}imageUrl=await new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(pic)})}
  const recipe={id:'own-'+Date.now(),title:f.elements.title.value.trim(),category:f.elements.category.value,author:f.elements.author.value.trim(),ingredients:f.elements.ingredients.value.trim(),directions:f.elements.directions.value.trim(),source:'Личный рецепт',sourceUrl:validLink(f.elements.sourceUrl.value),videoUrl:validLink(f.elements.videoUrl.value),imageUrl,date:new Date().toLocaleDateString('ru-RU')};
  if(recipe.sourceUrl&&all().some(r=>r.sourceUrl===recipe.sourceUrl)){$('import-status').textContent='Этот источник уже есть в каталоге.';return}
  own.unshift(recipe);try{localStorage.setItem(storageKey,JSON.stringify(own))}catch{own.shift();$('import-status').textContent='Место в браузере закончилось. Укажите ссылку на фото или уменьшите размер файла.';return}
  close($('editor'));render();openRecipe(recipe)
};
$('export').onclick=()=>{let blob=new Blob([JSON.stringify(own,null,2)],{type:'application/json'}),a=el('a');a.href=URL.createObjectURL(blob);a.download='мои-рецепты-копия.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('restore').onchange=async e=>{try{let list=JSON.parse(await e.target.files[0].text());if(!Array.isArray(list))throw Error();let seen=new Set(own.map(r=>r.sourceUrl||r.title));for(let r of list){if(!r.title||!r.directions)continue;let key=r.sourceUrl||r.title;if(!seen.has(key)){own.push({...r,id:r.id||'own-'+crypto.randomUUID()});seen.add(key)}}localStorage.setItem(storageKey,JSON.stringify(own));render();alert('Копия загружена.')}catch{alert('Не удалось прочитать файл с рецептами.')}e.target.value=''};
fetch('recipes.json').then(r=>{if(!r.ok)throw Error('Нет каталога');return r.json()}).then(data=>{catalog=data;render();let id=decodeURIComponent(location.hash.slice(1));let match=all().find(r=>r.id===id);if(match)openRecipe(match)}).catch(()=>{$('groups').textContent='Каталог временно не загрузился. Обновите страницу.'});
