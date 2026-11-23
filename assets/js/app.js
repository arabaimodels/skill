(function(){
  'use strict';
  const items=Array.isArray(window.SMART_MODELS_PUBLIC_CATALOG)?window.SMART_MODELS_PUBLIC_CATALOG:[];
  const analytics=window.SmartModelsAnalytics;
  const el=(id)=>document.getElementById(id);
  const arabicNumber=(n)=>new Intl.NumberFormat('ar-SA',{useGrouping:false}).format(n);
  const state={filter:'الكل',query:''};
  const icons={
    'linear-fingerprint':`<svg viewBox="0 0 400 155" fill="none" aria-hidden="true"><path d="M64 116C102 82 127 112 156 65C181 24 213 27 233 58C254 91 288 113 342 41" stroke="#EFC891" stroke-width="3" stroke-linecap="round"/><path d="M64 129C102 95 136 124 167 77C190 43 207 45 226 70C252 105 284 122 338 61" stroke="#EFC891" stroke-opacity=".4" stroke-width="1.4"/><path d="M70 84c48-20 59-40 84-52 27-16 42-15 71-5" stroke="#E8CA93" stroke-opacity=".45" stroke-width="1" stroke-dasharray="3 6"/><path d="M278 39 339 14l14 12-64 26-22 2z" fill="#D5AB72" stroke="#F3DDBA" stroke-width="1.5"/><path d="m267 54-14 10 25-6" fill="#F8E8C4"/><path d="m339 14 14 12" stroke="#866136" stroke-width="5"/><circle cx="101" cy="91" r="3" fill="#F4DDB2"/></svg>`,
    'character-replacement':`<svg viewBox="0 0 400 155" fill="none" aria-hidden="true"><circle cx="142" cy="61" r="25" stroke="#A9E4C3" stroke-width="2"/><path d="M92 138c4-32 22-49 50-49s47 17 51 49" stroke="#A9E4C3" stroke-width="2"/><circle cx="270" cy="61" r="25" stroke="#A9E4C3" stroke-width="2" stroke-dasharray="5 5"/><path d="M219 138c5-32 23-49 51-49s46 17 50 49" stroke="#A9E4C3" stroke-width="2" stroke-dasharray="5 5"/><path d="M185 62h38m-10-10 10 10-10 10" stroke="#E9CD99" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="142" cy="61" r="34" stroke="#74BDA3" stroke-opacity=".2"/><circle cx="270" cy="61" r="34" stroke="#74BDA3" stroke-opacity=".2"/></svg>`,
    'style-fingerprint':`<svg viewBox="0 0 400 155" fill="none" aria-hidden="true"><rect x="79" y="29" width="127" height="95" rx="9" stroke="#B2C7EF" stroke-width="2" transform="rotate(-9 79 29)"/><rect x="164" y="34" width="140" height="93" rx="9" fill="#2B4A64" stroke="#C8DDF2" stroke-width="2" transform="rotate(8 164 34)"/><path d="M184 100c25-44 41 8 70-42 13-23 29-16 47-3" stroke="#8ECAE9" stroke-width="3" stroke-linecap="round"/><circle cx="218" cy="57" r="12" fill="#D5C9EB"/><path d="M107 101c16-27 33-32 64-58" stroke="#D1C4F2" stroke-opacity=".75" stroke-width="2"/><circle cx="327" cy="112" r="10" fill="#79B2DA"/></svg>`,
    'creative-ideas':`<svg viewBox="0 0 400 155" fill="none" aria-hidden="true"><circle cx="200" cy="67" r="37" stroke="#D8B8F0" stroke-width="2"/><path d="M185 97v14h30V97m-26 21h22" stroke="#E2C7F3" stroke-width="3" stroke-linecap="round"/><path d="M183 63c-1-15 27-16 31-2 3 12-15 16-15 27" stroke="#E2C7F3" stroke-width="2" stroke-linecap="round"/><path d="M200 10v11M143 34l9 8m104-8-9 8M133 82l13-2m121 2-13-2m-85-64-5-11m81 11 5-11" stroke="#E8C996" stroke-width="2" stroke-linecap="round"/><circle cx="113" cy="113" r="7" stroke="#A58CCE"/><circle cx="287" cy="115" r="7" stroke="#A58CCE"/><path d="m120 110 31-17m129 17-31-17" stroke="#A58CCE" stroke-dasharray="3 5"/></svg>`
  };
  function safeLink(input){try{const u=new URL(input);return u.protocol==='https:'?u.href:null}catch{return null}}
  const catalog=items.filter(x=>typeof x.slug==='string'&&typeof x.name==='string');
  const nameMap=new Map(catalog.map(x=>[x.slug,x]));
  let lastFocus=null;
  function iconNode(s){const d=document.createElement('div');d.className='card-art art-'+s.accent;d.innerHTML=icons[s.slug]||icons['creative-ideas'];const b=document.createElement('span');b.className='art-badge';b.textContent='SMART / '+String(catalog.indexOf(s)+1).padStart(2,'0');d.append(b);return d}
  function txt(tag,value,className){const node=document.createElement(tag);node.textContent=value||'';if(className)node.className=className;return node}
  function card(s,index){
    const card=document.createElement('article');card.className='skill-card';
    card.append(iconNode(s));
    const body=document.createElement('div');body.className='card-body';
    const meta=document.createElement('div');meta.className='card-topline';meta.append(txt('span',s.category));
    const status=txt('span',s.hasPublishedLink?'رابط متاح':'الرابط قيد الإضافة','card-link-status'+(s.hasPublishedLink?'':' unavailable'));
    const dot=document.createElement('span');dot.className='dot';status.prepend(dot);meta.append(status);body.append(meta);
    body.append(txt('h3',s.name),txt('p',s.subtitle,'card-subtitle'),txt('p',s.summary,'card-description'));
    const tags=document.createElement('div');tags.className='card-tags';(s.highlights||[]).forEach(x=>tags.append(txt('span',x)));body.append(tags);
    const footer=document.createElement('div');footer.className='card-footer';const btn=txt('button','عرض تفاصيل المهارة  ←','card-detail-button');btn.type='button';btn.setAttribute('aria-label','عرض تفاصيل '+s.name);btn.addEventListener('click',()=>openSkill(s.slug));footer.append(btn,txt('span',String(index+1).padStart(2,'0')+' / '+String(catalog.length).padStart(2,'0'),'card-index'));body.append(footer);card.append(body);
    return card;
  }
  function resultBucket(n){return n===0?'zero':n===1?'one':n<=3?'two_to_three':'four_plus'}
  function refresh(){
    const term=state.query.trim().toLocaleLowerCase('ar');
    const selected=catalog.filter(s=>(state.filter==='الكل'||s.category===state.filter)&&(!term||[s.name,s.subtitle,s.category,s.summary,...(s.highlights||[])].join(' ').toLocaleLowerCase('ar').includes(term)));
    const grid=el('cardsGrid');grid.replaceChildren(...selected.map((x,i)=>card(x,i)));
    el('resultCount').textContent=arabicNumber(selected.length);
    el('emptyState').hidden=selected.length!==0;
    document.querySelectorAll('.filter-button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.category===state.filter)));
    return selected.length;
  }
  function initializeFilters(){
    const filters=el('filters');const categories=['الكل',...new Set(catalog.map(s=>s.category))];
    categories.forEach(name=>{const b=txt('button',name==='الكل'?'جميع المهارات':name,'filter-button');b.type='button';b.dataset.category=name;b.setAttribute('aria-pressed',String(name===state.filter));b.onclick=()=>{state.filter=name;refresh();analytics.track('skill_filter',{category:name})};filters.append(b)});
  }
  function detailSection(title,body){const sec=document.createElement('section');sec.className='detail-section';sec.append(txt('h3',title),txt('p',body));return sec}
  function closeSkill({changeHistory=true}={}){const d=el('skillDialog');if(d.open)d.close();if(changeHistory){const u=new URL(location.href);u.searchParams.delete('skill');history.replaceState(null,'',u.pathname+u.search+u.hash)}if(lastFocus instanceof HTMLElement)lastFocus.focus()}
  function openSkill(slug,{syncUrl=true}={}){
    const s=nameMap.get(slug);if(!s)return;
    const dialog=el('skillDialog');lastFocus=document.activeElement;
    const content=el('dialogContent');content.replaceChildren();
    content.append(txt('p','SMART MODELS / '+s.category,'dialog-overline'),txt('h2',s.name),txt('p',s.subtitle,'dialog-lead'));
    content.append(detailSection('نبذة عن المهارة',s.description));
    if(s.limitations)content.append(detailSection('نطاق العمل والحدود الواردة في المصدر',s.limitations));
    if(s.example)content.append(detailSection('مثال إرشادي من المصدر',s.example));
    if(s.sourceStatus.includes('مقترح'))content.append(txt('div','هذا الوصف تحريري أولي مستنتج من عنوان المهارة وسياقها، ويحتاج إلى اعتماد قبل اعتباره وصفًا تشغيليًا رسميًا.','detail-note'));
    const actionBox=document.createElement('div');actionBox.className='dialog-actions';
    const official=safeLink(s.officialUrl);const community=safeLink(s.communityUrl);
    if(official){const a=txt('a','الانتقال إلى المهارة ↗','button button-primary');a.href=official;a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>analytics.track('outbound_click',{skill_slug:s.slug,destination:'official'});actionBox.append(a)}
    else{const b=txt('button','رابط التشغيل غير متاح','button button-primary');b.disabled=true;actionBox.append(b)}
    if(community){const a=txt('a','المجتمع ↗','button button-ghost');a.href=community;a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>analytics.track('outbound_click',{skill_slug:s.slug,destination:'community'});actionBox.append(a)}
    const share=txt('button','مشاركة المهارة','button button-ghost');share.type='button';share.onclick=async()=>{
      const url=new URL(location.href);url.searchParams.set('skill',s.slug);
      try{if(navigator.share){await navigator.share({title:s.name,url:url.toString()})}else if(navigator.clipboard){await navigator.clipboard.writeText(url.toString());share.textContent='تم نسخ الرابط'}else{share.textContent='الرابط في شريط العنوان'}analytics.track('share_skill',{skill_slug:s.slug})}catch{};
    };actionBox.append(share);content.append(actionBox);
    if(!dialog.open)dialog.showModal();
    if(syncUrl){const url=new URL(location.href);url.searchParams.set('skill',slug);history.replaceState(null,'',url.pathname+url.search+url.hash)}
    analytics.track('skill_view',{skill_slug:s.slug,category:s.category});
  }
  function setupDialogs(){
    el('closeDialog').onclick=()=>closeSkill();el('skillDialog').addEventListener('click',e=>{if(e.target===el('skillDialog'))closeSkill()});el('skillDialog').addEventListener('close',()=>{const url=new URL(location.href);if(url.searchParams.has('skill')){url.searchParams.delete('skill');history.replaceState(null,'',url.pathname+url.search+url.hash)}});
    el('privacyButton').onclick=()=>{updatePrivacyState();el('privacyDialog').showModal()};el('closePrivacy').onclick=()=>el('privacyDialog').close();el('privacyDialog').addEventListener('click',e=>{if(e.target===el('privacyDialog'))el('privacyDialog').close()});
    el('privacyAccept').onclick=()=>chooseConsent('granted');el('privacyDecline').onclick=()=>chooseConsent('denied');el('acceptConsent').onclick=()=>chooseConsent('granted');el('declineConsent').onclick=()=>chooseConsent('denied');
  }
  function updatePrivacyState(){
    const has=analytics.active;const p=analytics.preference();
    el('privacyState').textContent=!has?'القياس غير مفعّل على الموقع حاليًا؛ عند تفعيله ستُطلب موافقتك قبل تشغيله.':p==='granted'?'حالة الموافقة: مسموح بالقياس.':'حالة الموافقة: غير مسموح بالقياس.';
    el('privacyAccept').hidden=!has;el('privacyDecline').hidden=!has;
  }
  function chooseConsent(value){analytics.setPreference(value);el('consentBanner').hidden=true;updatePrivacyState();if(el('privacyDialog').open)el('privacyDialog').close()}
  function setupConsent(){if(analytics.active && analytics.preference()===null)el('consentBanner').hidden=false;updatePrivacyState()}
  function setupSearch(){let timer;el('searchInput').addEventListener('input',e=>{state.query=e.target.value;const count=refresh();clearTimeout(timer);timer=setTimeout(()=>analytics.track('skill_search',{result_bucket:resultBucket(count)}),850)});window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!el('skillDialog').open&&!el('privacyDialog').open){e.preventDefault();el('searchInput').focus()}})}
  function initialize(){el('year').textContent=String(new Date().getFullYear());el('heroSkillCount').textContent=arabicNumber(catalog.length);el('heroLinkCount').textContent=arabicNumber(catalog.filter(x=>safeLink(x.officialUrl)).length);initializeFilters();setupSearch();setupDialogs();setupConsent();refresh();const slug=new URL(location.href).searchParams.get('skill');if(slug&&nameMap.has(slug))openSkill(slug,{syncUrl:false});window.addEventListener('popstate',()=>{const s=new URL(location.href).searchParams.get('skill');if(s&&nameMap.has(s))openSkill(s,{syncUrl:false});else if(el('skillDialog').open)closeSkill({changeHistory:false})})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
