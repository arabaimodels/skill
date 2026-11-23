(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const STAGES = [['original','الصورة الأصلية'],['reference','الصورة المرجعية'],['result','الصورة النهائية']];
let skills=[], selectedSkill=0, selectedProject=0, galleryItems=[], galleryIndex=0, compareProject=null;
const A=()=>window.SmartModelsAnalytics||{active:false,preference:()=>null,setPreference:()=>{},track:()=>{}};
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el};
function validUrl(url){try{const u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)}catch{return false}}
function showLink(id,url){const a=$(id);if(url && validUrl(url)){a.href=url;a.removeAttribute('aria-disabled');a.tabIndex=0;a.classList.remove('is-disabled')}else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.tabIndex=-1;a.classList.add('is-disabled')}}
function safePath(v){return typeof v==='string' && /^assets\/published\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp|gif)$/.test(v)?v:''}
function detail(label,value,wide=false){const el=node('div','detail'+(wide?' wide':''));el.append(node('label','',label),node('div','value',value||'غير متوفر'));return el}
function drawSkillPicker(){const sel=$('skillSelect');sel.replaceChildren();skills.forEach((s,i)=>{const op=node('option','',s.name||`مهارة ${i+1}`);op.value=i;sel.append(op)});sel.value=selectedSkill}
function drawSkill(){const s=skills[selectedSkill];if(!s)return; $('skillTitle').textContent=s.name||'مهارة';const host=$('skillDetails');host.replaceChildren(detail('اسم المهارة',s.name),detail('عدد المشاريع',String(s.projects.length)));
 const ab=detail('وصف المهارة',s.about||'الوصف قيد المراجعة',true);ab.classList.add('skill-description');
 if(s.descriptionStatus){ab.append(node('span','source-label',s.descriptionStatus))}host.append(ab);
 showLink('skillPlatformLink',s.officialUrl);showLink('skillCommunityLink',s.communityUrl)
}
function countImages(p){return STAGES.filter(([key])=>safePath(p.images?.[key])).length}
function drawTabs(){const s=skills[selectedSkill];const host=$('projectTabs');host.replaceChildren();$('projectCount').textContent=`${s.projects.length} مشاريع`;
 s.projects.forEach((p,i)=>{const b=node('button','tab');b.type='button';b.role='tab';b.setAttribute('aria-selected',i===selectedProject?'true':'false');b.append(node('b','',p.name||`مشروع ${i+1}`),node('span','',`${countImages(p)} من 3 صور`));b.addEventListener('click',()=>{selectedProject=i;drawProjects();A().track('project_view',{skill_slug:s.slug||'',result_bucket:String(i+1)})});host.append(b)})
}
function drawProjects(){drawTabs();const s=skills[selectedSkill],p=s.projects[selectedProject],host=$('projectContent');host.replaceChildren();if(!p){host.append(node('p','no-projects','لا تتوفر مشاريع منشورة لهذه المهارة'));return}
 const bar=node('div','heading');bar.append(node('h3','public-projectname',p.name||'مشروع'));
 const tools=node('div','actions');const n=countImages(p);
 const comp=node('button','btn small','مقارنة الصور الثلاث');comp.type='button';comp.disabled=n!==3;comp.title=n===3?'فتح مقارنة الأصل والمرجع والنتيجة':'تحتاج المقارنة إلى الصور الثلاث';comp.addEventListener('click',()=>compare(p));tools.append(comp);bar.append(tools);host.append(bar);
 const grid=node('div','stages');for(const [key,label] of STAGES){const card=node('article','stage'),h=node('div','stagehead');h.append(node('b','',label));card.append(h);const pre=node('div','preview'),url=safePath(p.images?.[key]);if(url){const img=node('img');img.src='./'+url;img.loading='lazy';img.decoding='async';img.alt=label+' — '+p.name;img.addEventListener('click',()=>openGallery(p,key));img.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGallery(p,key)}});img.tabIndex=0;img.setAttribute('role','button');pre.append(img)}else pre.append(node('div','placeholder','لم تُنشر صورة لهذه المرحلة'));card.append(pre);if(url){const btn=node('button','btn small','تكبير الصورة');btn.type='button';btn.addEventListener('click',()=>openGallery(p,key));card.append(btn)}else{card.append(node('p','stage-caption','هذا الموضع متاح عند اعتماد الصورة ورفعها للنشر.'))}grid.append(card)}host.append(grid)
}
function draw(){if(!skills.length)return;drawSkillPicker();drawSkill();drawProjects();A().track('skill_view',{skill_slug:skills[selectedSkill].slug||''})}
function openGallery(p,key){galleryItems=STAGES.map(([k,label])=>({key:k,label,path:safePath(p.images?.[k])})).filter(x=>!!x.path);galleryIndex=Math.max(0,galleryItems.findIndex(x=>x.key===key));showGallery();$('viewDialog').showModal();A().track('image_view',{skill_slug:skills[selectedSkill].slug||''})}
function showGallery(){const it=galleryItems[galleryIndex];if(!it)return;$('viewImage').src='./'+it.path;$('viewTitle').textContent=it.label;$('galleryStatus').textContent=`${galleryIndex+1} / ${galleryItems.length}`;$('galleryPrev').disabled=galleryIndex===0;$('galleryNext').disabled=galleryIndex>=galleryItems.length-1}
function closeGallery(){if($('viewDialog').open)$('viewDialog').close()}
function moveGallery(delta){const i=galleryIndex+delta;if(i<0||i>=galleryItems.length)return;galleryIndex=i;showGallery()}
function compare(p){if(countImages(p)!==3)return;compareProject=p;for(const [key,id] of [['original','compareA'],['reference','compareReference'],['result','compareB']])$(id).src='./'+safePath(p.images[key]);$('compareScale').value=100;setScale(100);$('compareDialog').showModal();A().track('image_compare',{skill_slug:skills[selectedSkill].slug||''})}
function setScale(v){const scale=Math.max(50,Math.min(150,Number(v)||100));$('compareDialog').style.setProperty('--compare-scale',String(scale/100));$('compareScaleValue').textContent=`${scale}%`}
function privacyUI(){const act=A();$('privacyState').textContent=act.active?'القياس مفعل عند موافقتك ويمكنك تغيير القرار هنا.':'خدمة قياس الزيارات غير مفعلة حاليًا.';$('privacyAccept').disabled=!act.active;$('privacyDecline').disabled=!act.active;
 if(act.active&&act.preference()==null){$('consentBanner').classList.remove('hidden')}else{$('consentBanner').classList.add('hidden')}
}
function accept(){A().setPreference('granted');privacyUI();$('privacyDialog').close()}
function decline(){A().setPreference('denied');privacyUI();$('privacyDialog').close()}
async function load(){const status=$('loadStatus');try{const res=await fetch('./data/public-catalog.json',{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const content=await res.json();if(content.version!==1 || !Array.isArray(content.skills) || !content.skills.length)throw Error('صيغة الفهرس غير صالحة');
 skills=content.skills.map(s=>({slug:String(s.slug||''),name:String(s.name||''),about:String(s.about||''),descriptionStatus:String(s.descriptionStatus||''),officialUrl:String(s.officialUrl||''),communityUrl:String(s.communityUrl||''),projects:Array.isArray(s.projects)?s.projects.map(p=>({name:String(p.name||''),images:p.images||{}})):[]}));selectedSkill=0;selectedProject=0;draw();status.textContent=`✓ تم تحميل ${skills.length} مهارات و${skills.reduce((n,s)=>n+s.projects.length,0)} مشروعًا تلقائيًا`;
 }catch(err){status.textContent='تعذر تحميل البيانات تلقائيًا. افتح الموقع عبر GitHub Pages أو خادم محلي وتحقق من data/public-catalog.json.';status.style.color='#ffacac';console.error('Public catalog error:',err)}}
$('skillSelect').addEventListener('change',(e)=>{selectedSkill=Number(e.target.value)||0;selectedProject=0;draw()});
$('galleryPrev').addEventListener('click',()=>moveGallery(-1));$('galleryNext').addEventListener('click',()=>moveGallery(1));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{$(b.dataset.close).close()}));
$('compareScale').addEventListener('input',(e)=>setScale(e.target.value));$('compareReset').addEventListener('click',()=>{$('compareScale').value=100;setScale(100)});
for(const [id,key] of [['compareA','original'],['compareReference','reference'],['compareB','result']]){$(id).addEventListener('click',()=>{if(compareProject){$('compareDialog').close();openGallery(compareProject,key)}})}
for(const [id,destination] of [['skillPlatformLink','platform'],['skillCommunityLink','community']]){$(id).addEventListener('click',()=>{if($(id).getAttribute('href'))A().track('skill_link_click',{skill_slug:skills[selectedSkill]?.slug||'',destination})})}
$('privacyOpen').addEventListener('click',()=>{privacyUI();$('privacyDialog').showModal()});$('privacyClose').addEventListener('click',()=>{$('privacyDialog').close()});
$('privacyAccept').addEventListener('click',accept);$('privacyDecline').addEventListener('click',decline);$('acceptConsent').addEventListener('click',accept);$('declineConsent').addEventListener('click',decline);
document.addEventListener('keydown',(e)=>{if(e.key==='ArrowLeft'&&$('viewDialog').open)moveGallery(1);if(e.key==='ArrowRight'&&$('viewDialog').open)moveGallery(-1)});
privacyUI();load();
})();
