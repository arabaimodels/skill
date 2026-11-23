
'use strict';
(()=>{
const DB='smart-models-skills-studio-v1',STORE='records',KEY='workspace',MAX_PROJECTS=5,MAX_IMAGE=12*1024*1024,MAX_IMPORT=85*1024*1024;
const stages=[['original','الصورة الأصلية'],['reference','الصورة المرجعية'],['result','النتيجة النهائية']];
const emptyMedia=()=>({kind:'',value:'',name:''});const emptyProject=()=>({id:crypto.randomUUID(),name:'مشروع جديد',prompts:{original:'',reference:''},modelName:'',images:{original:emptyMedia(),reference:emptyMedia(),result:emptyMedia()}});
const blank=()=>({version:1,skill:{name:'',about:'',limits:'',example:'',url:'',skool:'',gif:emptyMedia()},projects:[]});
let catalog={version:2,activeSkillId:'',skills:[]},data=blank(),active=null,db=null,saveChain=Promise.resolve(),objectUrls=new Set(),pendingGifRemove=false;
let linkedFolder=null, folderQueue=Promise.resolve(),folderSyncBusy=false;
const $=id=>document.getElementById(id);const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
function toast(message,error=false){const el=$('toast');el.textContent=message;el.className='toast'+(error?' error':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),4500)}
function validUrl(v){try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!!u.hostname}catch{return false}}
function mediaUrl(m){if(!m?.value)return '';if(m.kind==='url')return validUrl(m.value)?m.value:'';if(m.kind==='blob'&&m.value instanceof Blob){const u=URL.createObjectURL(m.value);objectUrls.add(u);return u}return ''}
function clearObjectUrls(){for(const u of objectUrls)URL.revokeObjectURL(u);objectUrls.clear()}
function setStatus(s){$('saveStatus').textContent=s}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(Error('IndexedDB غير مدعوم'));return}const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('تعذر فتح قاعدة البيانات'));r.onblocked=()=>reject(Error('قاعدة البيانات مفتوحة في تبويب آخر يمنع التحديث'))})}
function readDB(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function writeDB(snapshot){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(snapshot,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
function save(){const snapshot=structuredClone(catalog);setStatus('جارٍ الحفظ…');saveChain=saveChain.catch(()=>{}).then(async()=>{if(!db)throw Error('التخزين المحلي غير متاح');await writeDB(snapshot);setStatus('✓ محفوظ محليًا');if(linkedFolder)queueFolderSync(snapshot)}).catch(e=>{setStatus('⚠ لم يُحفظ');toast('تعذر الحفظ: '+(e?.name==='QuotaExceededError'?'مساحة التخزين ممتلئة؛ صدّر نسخة JSON وقلّل أحجام الصور':e.message),true)});return saveChain}
function button(label,fn,cls='btn small'){const b=node('button',cls,label);b.type='button';b.addEventListener('click',fn);return b}
function fieldView(label,value,wide=false){const d=node('div','detail'+(wide?' wide':''));d.append(node('label','',label),node('div','value'+(!value?' placeholder':''),value||'لم تُضف بيانات بعد'));return d}
function linkView(label,value){const d=node('div','detail');d.append(node('label','',label));const row=node('div','urlrow');if(value&&validUrl(value)){const a=node('a','',value);a.href=value;a.target='_blank';a.rel='noopener noreferrer';row.append(a,button('نسخ',()=>copy(value)),button('فتح',()=>window.open(value,'_blank','noopener,noreferrer')))}else row.append(node('span','placeholder',value?'الرابط غير صالح':'لم يُضف رابط'));d.append(row);return d}
function updateSkillDestination(id,url){const a=$(id);const ok=!!url&&validUrl(url);if(ok){a.href=url;a.removeAttribute('aria-disabled');a.removeAttribute('tabindex');a.classList.remove('is-disabled');a.title='فتح رابط المهارة في تبويب جديد'}else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1');a.classList.add('is-disabled');a.title='أضف الرابط أولًا من تعديل الاسم والروابط'}}
function renderSkill(){const wrap=$('skillDetails');wrap.replaceChildren(fieldView('اسم المهارة',data.skill.name));const desc=node('div','detail skill-description');desc.append(node('label','','وصف المهارة'));const about=(data.skill.about||'').trim();if(!about){desc.append(node('div','value placeholder','لم يُضف وصف بعد. استخدم «تعديل الاسم والوصف والروابط» لإضافته.'))}else if(about.length>360||about.split('\n').length>5){const details=node('details'),summary=node('summary','','عرض الوصف كاملًا / طي الوصف'),body=node('div','value description-preview',about);details.append(summary,body);details.addEventListener('toggle',()=>{summary.textContent=details.open?'طي الوصف':'عرض الوصف كاملًا'});desc.append(details)}else desc.append(node('div','value',about));wrap.append(desc);updateSkillDestination('skillPlatformLink',data.skill.url);updateSkillDestination('skillCommunityLink',data.skill.skool);const selector=$('skillSelect');selector.replaceChildren();catalog.skills.forEach((skill,i)=>{const opt=node('option','',skill.skill.name||`مهارة ${i+1}`);opt.value=skill.id;selector.append(opt)});selector.value=catalog.activeSkillId}
function switchSkill(id){const found=catalog.skills.find(s=>s.id===id);if(!found)return;catalog.activeSkillId=id;data=found;active=data.projects[0]?.id||null;renderProjects();save()}
$('skillSelect').addEventListener('change',e=>switchSkill(e.target.value));
$('newSkill').addEventListener('click',async()=>{const answer=prompt('اكتب اسم المهارة الجديدة:','مهارة جديدة');if(answer===null)return;const title=answer.trim().slice(0,160);if(!title){toast('أدخل اسم المهارة الجديدة',true);return}if(!db){toast('التخزين المحلي غير متاح؛ لا يمكن إنشاء مهارة آمنة الحفظ',true);return}if(catalog.skills.length>=100){toast('الحد الأقصى 100 مهارة في مساحة العمل',true);return}const next=blank();next.id=crypto.randomUUID();next.skill.name=title;next.projects=Array.from({length:MAX_PROJECTS},(_,i)=>{const p=emptyProject();p.name='مشروع '+(i+1);return p});catalog.skills.push(next);catalog.activeSkillId=next.id;data=next;active=next.projects[0].id;await save();renderProjects();toast('أُنشئت مهارة جديدة بخمسة مشاريع مستقلة')});
function progress(p){const n=stages.filter(([k])=>!!p.images[k]?.value).length;return `${n} من 3 صور · ${n===3?'مكتمل بصريًا':'غير مكتمل'}`}
function renderTabs(){const tabs=$('projectTabs');tabs.replaceChildren();$('projectCount').textContent=`${data.projects.length} / ${MAX_PROJECTS}`;$('addProject').disabled=data.projects.length>=MAX_PROJECTS;data.projects.forEach((p,i)=>{const b=node('button','tab');b.type='button';b.role='tab';b.setAttribute('aria-selected',String(active===p.id));b.textContent=`${i+1}. ${p.name||'مشروع بلا اسم'}`;b.append(node('span','',progress(p)));b.addEventListener('click',()=>{active=p.id;renderProjects()});tabs.append(b)})}
function renderProjects(){if($('viewDialog').open)$('viewDialog').close();if($('compareDialog').open)$('compareDialog').close();clearObjectUrls();renderSkill();renderTabs();const host=$('projectContent');host.replaceChildren();const p=data.projects.find(x=>x.id===active);if(!p){host.append(node('p','placeholder','لا توجد مشاريع. اضغط «مشروع جديد» للبدء.'));return}const top=node('div','heading'),left=node('div');left.append(node('h3','','إدارة المشروع'),node('p','progress',progress(p)));top.append(left);const tools=node('div','actions');tools.append(button('مقارنة الأصل والمرجع والنتيجة',()=>compare(p), 'btn'),button('حذف المشروع',async()=>{if(!confirm('هل تريد حذف هذا المشروع وصوره وبرومبتاته نهائيًا؟'))return;data.projects=data.projects.filter(x=>x.id!==p.id);active=data.projects[0]?.id||null;await save();renderProjects()},'btn danger'));top.append(tools);host.append(top);
const nameField=node('div','field projectname');const namelabel=node('label','','اسم المشروع');const nameInput=node('input');nameInput.value=p.name;nameInput.maxLength=160;nameInput.setAttribute('aria-label','اسم المشروع');nameInput.addEventListener('change',()=>{p.name=nameInput.value.trim()||'مشروع بلا اسم';save();renderTabs()});nameField.append(namelabel,nameInput);host.append(nameField);
const grid=node('div','stages');stages.forEach(([key,label],i)=>{const st=node('article','stage'),hd=node('div','stagehead');hd.append(node('h3','',label),node('b','',`0${i+1}`));st.append(hd);const pv=node('div','preview');const media=p.images[key],src=mediaUrl(media);if(src){const im=node('img');im.src=src;im.alt=label+' للمشروع '+p.name;im.tabIndex=0;im.title='انقر للتكبير';im.addEventListener('click',()=>viewProjectImage(p,key));im.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();viewProjectImage(p,key)}});im.onerror=()=>im.replaceWith(node('span','placeholder','تعذر عرض الصورة؛ تحقق من مصدرها'));pv.append(im)}else pv.append(node('span','placeholder','لا توجد صورة في هذه المرحلة'));st.append(pv);
const fileField=node('div','field'),fileLabel=node('label','','رفع صورة من الجهاز'),file=node('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/gif';file.setAttribute('aria-label','رفع '+label);file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;try{checkImage(f);p.images[key]={kind:'blob',value:f,name:f.name};await save();renderProjects();toast('تم إدراج الصورة')}catch(e){toast(e.message,true)} });fileField.append(fileLabel,file);st.append(fileField);
const act=node('div','actions');if(media.value){act.append(button('استبدال',()=>file.click()),button('حذف الصورة',async()=>{if(!confirm('تأكيد حذف صورة هذه المرحلة؟'))return;p.images[key]=emptyMedia();await save();renderProjects()},'btn small danger'))}if(key==='result'&&media.value)act.append(button('تنزيل النتيجة',()=>downloadMedia(media,`${safeName(p.name)}-result`)));st.append(act);
if(key==='result'){const modelField=node('div','field'),ml=node('label','','اسم النموذج المستخدم'),mi=node('input');mi.type='text';mi.maxLength=160;mi.placeholder='اكتب اسم النموذج المستخدم…';mi.value=p.modelName||'';mi.addEventListener('change',()=>{p.modelName=mi.value.trim();save()});modelField.append(ml,mi);st.append(modelField)}if(key!=='result'){const promptField=node('div','field'),pl=node('label','','البرومبت '+(key==='original'?'الأصلي':'المرجعي')),ta=node('textarea');ta.value=p.prompts[key]||'';ta.maxLength=30000;ta.placeholder='اكتب البرومبت الخاص بهذه المرحلة…';ta.addEventListener('change',()=>{p.prompts[key]=ta.value;save()});promptField.append(pl,ta);st.append(promptField,button('نسخ البرومبت',()=>copy(ta.value)))}grid.append(st)});host.append(grid)}
function checkImage(f){if(!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type))throw Error('نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو GIF');if(f.size>MAX_IMAGE)throw Error('حجم الصورة يتجاوز 12 ميجابايت');if(!f.size)throw Error('الملف فارغ')}
function safeName(s){return(s||'project').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,60)}
async function copy(s){if(!s){toast('لا يوجد نص للنسخ',true);return}try{await navigator.clipboard.writeText(s);toast('تم النسخ')}catch{const t=node('textarea');t.value=s;document.body.append(t);t.select();try{if(!document.execCommand('copy'))throw Error();toast('تم النسخ')}catch{toast('تعذر النسخ تلقائيًا؛ حدّد النص وانسخه يدويًا',true)}finally{t.remove()}}}
let galleryItems=[],galleryIndex=0;
function showGalleryItem(){const item=galleryItems[galleryIndex];if(!item)return;$('viewTitle').textContent=item.title;$('viewImage').src=item.src;$('viewImage').alt=item.title;$('galleryStatus').textContent=`${galleryIndex+1} من ${galleryItems.length} — استخدم السهمين للتنقل أو Esc للإغلاق`;$('galleryPrev').disabled=galleryItems.length<2;$('galleryNext').disabled=galleryItems.length<2}
function viewGallery(items,index=0){galleryItems=items.filter(item=>item&&item.src);if(!galleryItems.length)return;galleryIndex=Math.max(0,Math.min(index,galleryItems.length-1));showGalleryItem();if(!$('viewDialog').open)$('viewDialog').showModal()}
function shiftGallery(direction){if(!galleryItems.length)return;galleryIndex=(galleryIndex+direction+galleryItems.length)%galleryItems.length;showGalleryItem()}
function projectGallery(p){return stages.map(([k,label])=>({key:k,title:label,src:mediaUrl(p.images[k])})).filter(x=>x.src)}
function viewProjectImage(p,key){const items=projectGallery(p);viewGallery(items,Math.max(0,items.findIndex(item=>item.key===key)))}
$('galleryPrev').addEventListener('click',()=>shiftGallery(-1));$('galleryNext').addEventListener('click',()=>shiftGallery(1));
$('viewDialog').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();shiftGallery(e.key==='ArrowRight'?-1:1)}});
// Clicking the backdrop (outside the dialog rectangle) closes the enlarged image.
$('viewDialog').addEventListener('click',e=>{if(e.target!==$('viewDialog'))return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close()});
function setCompareScale(v){const scale=Math.max(50,Math.min(150,Number(v)||100));$('compareScale').value=scale;$('compareScaleValue').textContent=scale+'%';$('compareDialog').style.setProperty('--compare-scale',String(scale/100))} $('compareScale').addEventListener('input',e=>setCompareScale(e.target.value));$('compareReset').addEventListener('click',()=>setCompareScale(100));function compare(p){const a=mediaUrl(p.images.original),r=mediaUrl(p.images.reference),b=mediaUrl(p.images.result);if(!a||!r||!b){toast('أضف الصور الثلاث: الأصل والمرجع والنتيجة أولًا',true);return}setCompareScale(100);$('compareA').src=a;$('compareReference').src=r;$('compareB').src=b;$('compareDialog').showModal()}
for(const [id,label] of [['compareA','الأصل'],['compareReference','المرجع'],['compareB','النتيجة']]){const el=$(id);const expand=()=>{if(el.src){const images=[['compareA','الصورة الأصلية'],['compareReference','الصورة المرجعية'],['compareB','النتيجة النهائية']].map(([id,title])=>({id,title,src:$(id).src}));viewGallery(images,images.findIndex(item=>item.id===id))}};el.addEventListener('click',expand);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();expand()}})}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=node('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
async function downloadMedia(m,name){if(m.kind==='blob'){downloadBlob(m.value,name+extension(m.value.type));return}if(!validUrl(m.value))return;try{const r=await fetch(m.value);if(!r.ok)throw Error('HTTP '+r.status);const blob=await r.blob();if(!blob.type.startsWith('image/'))throw Error('الرابط لا يعيد صورة');downloadBlob(blob,name+extension(blob.type))}catch{toast('تعذر التنزيل المباشر بسبب قيود المصدر (CORS). افتح الصورة في تبويب جديد واحفظها.',true);window.open(m.value,'_blank','noopener,noreferrer')}}
function extension(type){return({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'})[type]||'.img'}
function editSkill(){$('skillName').value=data.skill.name||'';$('skillAbout').value=data.skill.about||'';$('skillPlatformUrl').value=data.skill.url||'';$('skillCommunityUrl').value=data.skill.skool||'';$('skillDialogTitle').textContent='تعديل اسم المهارة ووصفها وروابطها';$('skillDialog').showModal()}
$('skillForm').addEventListener('submit',async e=>{e.preventDefault();const name=$('skillName').value.trim();if(!name){toast('أدخل اسم المهارة',true);return}const platform=$('skillPlatformUrl').value.trim(),community=$('skillCommunityUrl').value.trim();if((platform&&!validUrl(platform))||(community&&!validUrl(community))){toast('أدخل روابط HTTP أو HTTPS صحيحة، أو اترك الحقول فارغة',true);return}data.skill.name=name;data.skill.about=$('skillAbout').value.slice(0,12000);data.skill.url=platform;data.skill.skool=community;await save();$('skillDialog').close();renderSkill();toast('تم تحديث اسم المهارة ووصفها وروابطها')});
$('editSkill').addEventListener('click',editSkill);$('addProject').addEventListener('click',async()=>{if(data.projects.length>=MAX_PROJECTS){toast('الحد الأقصى خمسة مشاريع',true);return}const p=emptyProject();p.name='مشروع '+(data.projects.length+1);data.projects.push(p);active=p.id;await save();renderProjects()});document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('تعذر قراءة الملف'));r.readAsDataURL(blob)})}
async function exportData(){try{const out=structuredClone(catalog);async function convert(m){if(m.kind==='blob'&&m.value instanceof Blob){m.value=await blobToDataURL(m.value);m.kind='data'}}for(const skill of out.skills){await convert(skill.skill.gif);for(const p of skill.projects)for(const [k] of stages)await convert(p.images[k])}downloadBlob(new Blob([JSON.stringify(out)],{type:'application/json'}),'smart-models-all-skills.json');toast('تم تصدير جميع المهارات ومشاريعها وصورها')}catch(e){toast('فشل التصدير: '+e.message,true)}}
$('exportBtn').addEventListener('click',exportData);$('importBtn').addEventListener('click',()=>$('importFile').click());

// Export an inspectable project bundle to a user-selected directory.
// A browser cannot silently write to the ZIP installation folder.
async function pickFolder(mode){
 if(!window.showDirectoryPicker)throw Error('اختيار المجلدات غير مدعوم في هذا المتصفح أو عند فتح الصفحة دون سياق آمن. استخدم Chrome/Edge عبر localhost أو HTTPS، أو صدّر JSON.');
 return window.showDirectoryPicker({mode});
}
async function fileInFolder(dir,name,content){
 const handle=await dir.getFileHandle(name,{create:true});
 const writer=await handle.createWritable();
 try{await writer.write(content)}finally{await writer.close()}
}
// Directory layout: skills/skill-<id>/project-<id>/images/<stage>.<extension>.
// The name normalizer is retained only to validate older folder layouts on import.
function folderName(v,fallback='مهارة'){
 const name=String(v||'').normalize('NFC').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,75);
 return name&&name!=='.'&&name!=='..'?name:fallback;
}
function projectFolderName(p){return `project-${p.id}`}
async function bundleSnapshot(snapshot=catalog){
 const out=structuredClone(snapshot),files=[];
 const counts=new Map();
 for(const skill of out.skills){
  const folder=`skill-${skill.id}`;
  if(skill.skill.gif.kind==='blob'&&skill.skill.gif.value instanceof Blob){const file='skill.gif',path=`skills/${folder}/${file}`;files.push({parts:['skills',folder],file,blob:skill.skill.gif.value});skill.skill.gif={kind:'asset',value:path,name:skill.skill.gif.name||file}}
  for(let i=0;i<skill.projects.length;i++){
   const p=skill.projects[i],projectDir=projectFolderName(p);
   for(const [key] of stages){
    const m=p.images[key];
    if(m.kind==='blob'&&m.value instanceof Blob){
     const file=`${key}${extension(m.value.type)}`;
     const path=`skills/${folder}/${projectDir}/images/${file}`;
     files.push({parts:['skills',folder,projectDir,'images'],file,blob:m.value});
     p.images[key]={kind:'asset',value:path,name:m.name||file};
    }
   }
  }
 }
 return{out,files};
}
async function ensureDir(root,parts){let d=root;for(const name of parts)d=await d.getDirectoryHandle(name,{create:true});return d}
async function writeBundle(dir,snapshot){
 const {out,files}=await bundleSnapshot(snapshot);
 for(const item of files){
  const sub=await ensureDir(dir,item.parts);
  await fileInFolder(sub,item.file,item.blob);

 }
 // Metadata is written last, so it does not point at images that were not saved.
 for(const item of files){let sub=dir;for(const part of item.parts)sub=await sub.getDirectoryHandle(part);const actual=await(await sub.getFileHandle(item.file)).getFile();if(actual.size!==item.blob.size||await digest(actual)!==await digest(item.blob))throw Error('فشل التحقق من الصورة '+item.file)}
 await fileInFolder(dir,'workspace.json',new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));
 const report={version:1,createdAt:new Date().toISOString(),skills:out.skills.length,projects:out.skills.reduce((n,s)=>n+s.projects.length,0),files:[]};for(const item of files)report.files.push({path:[...item.parts,item.file].join('/'),size:item.blob.size,sha256:await digest(item.blob)});
 await fileInFolder(dir,'verification.json',new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const checked=JSON.parse(await(await dir.getFileHandle('workspace.json')).getFile().then(f=>f.text()));if(checked.skills.length!==out.skills.length)throw Error('فشل التحقق من البيانات');
 return files.length;
}
async function digest(blob){const bytes=await blob.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}
async function writeVersionedBundle(root,snapshot){const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8);const versions=await root.getDirectoryHandle('backups',{create:true});const dir=await versions.getDirectoryHandle(stamp,{create:true});const count=await writeBundle(dir,snapshot);return{count,stamp}}
function updateFolderButton(){const b=$('autoFolderBtn');if(!b)return;b.textContent=linkedFolder?'✓ الحفظ التلقائي في المجلد':'ربط مجلد الحفظ التلقائي';b.title=linkedFolder?'انقر لتغيير المجلد المرتبط':'اختر مجلدًا لتحديث الصور والمشاريع تلقائيًا'}
function queueFolderSync(snapshot){
 if(!linkedFolder)return folderQueue;
 const dir=linkedFolder;
 folderQueue=folderQueue.catch(()=>{}).then(async()=>{
  if(linkedFolder!==dir)return;
  setStatus('جارٍ تحديث المجلد…');
  // No permission prompt during autosave; browser might revoke access.
  if(await dir.queryPermission({mode:'readwrite'})!=='granted')throw Error('انتهى إذن المجلد؛ اضغط زر ربط المجلد لإعادة تفعيله');
  const {count,stamp}=await writeVersionedBundle(dir,snapshot);
  setStatus(`✓ محفوظ في المتصفح والمجلد · ${count} صورة`);
 }).catch(e=>{setStatus('⚠ الحفظ المحلي متاح، تعذر تحديث المجلد');toast('تعذر تحديث المجلد: '+e.message,true)});
 return folderQueue;
}
$('autoFolderBtn').addEventListener('click',async()=>{
 try{
  // Browser requires a user gesture to show the picker.
  const dir=await pickFolder('readwrite');
  if(await dir.requestPermission({mode:'readwrite'})!=='granted')throw Error('لم يُسمح بالكتابة في المجلد');
  await saveChain;
  await folderQueue.catch(()=>{});
  // The first snapshot must succeed before enabling the automatic link.
  const {count}=await writeVersionedBundle(dir,structuredClone(catalog));
  linkedFolder=dir;updateFolderButton();
  toast(`تم ربط المجلد وحفظ ${count} صورة. ستُحفظ التغييرات اللاحقة تلقائيًا.`);
  setStatus('✓ المزامنة التلقائية مفعّلة');
 }catch(e){if(e.name!=='AbortError')toast('تعذر ربط المجلد: '+e.message,true)}
});
$('folderSaveBtn').addEventListener('click',async()=>{
 try{
  const dir=await pickFolder('readwrite');
  if(await dir.requestPermission({mode:'readwrite'})!=='granted')throw Error('لم يُسمح بالكتابة في المجلد');
  await saveChain;
  const {count,stamp}=await writeVersionedBundle(dir,structuredClone(catalog));
  toast(`تم حفظ نسخة ${stamp} تضم ${count} صورة داخل backups؛ اختر مجلد النسخة للاستعادة.`);
 }catch(e){if(e.name!=='AbortError')toast('تعذر حفظ المجلد: '+e.message,true)}
});
$('folderOpenBtn').addEventListener('click',async()=>{
 try{
  const dir=await pickFolder('read');
  const f=await(await dir.getFileHandle('workspace.json')).getFile();
  if(f.size>MAX_IMPORT)throw Error('ملف البيانات كبير جدًا');
  const raw=JSON.parse(await f.text());
  if(!raw||![1,2].includes(raw.version))throw Error('ملف بيانات غير مدعوم');
  const sources=raw.version===2?raw.skills:[raw];
  const referenced=new Set();for(const skill of sources){if(skill.skill?.gif?.kind==='asset')referenced.add(skill.skill.gif.value);for(const p of skill.projects||[])for(const [key] of stages)if(p.images?.[key]?.kind==='asset')referenced.add(p.images[key].value)}
  if(!Array.isArray(sources)||sources.length>100)throw Error('بيانات المهارات غير صالحة');
  for(const skill of sources){const gif=skill.skill?.gif;if(gif?.kind==='asset'){if(typeof gif.value!=='string'||!/^skills\/skill-[a-zA-Z0-9-]{8,120}\/skill\.gif$/.test(gif.value))throw Error('مسار GIF غير صالح');let sub=await dir.getDirectoryHandle('skills');sub=await sub.getDirectoryHandle(gif.value.split('/')[1]);const blob=await(await sub.getFileHandle('skill.gif')).getFile();checkImage(blob);if(blob.type!=='image/gif')throw Error('GIF غير صالح');gif.kind='blob';gif.value=blob}}
  for(const skill of sources){for(const p of skill.projects||[]){for(const [key] of stages){
   const m=p.images?.[key];if(m?.kind!=='asset')continue;
   if(typeof m.value!=='string'||m.value.length>600||m.value.startsWith('/')||m.value.includes('..'))throw Error('مسار صورة غير صالح');
   const parts=m.value.split('/');let sub=dir;let name;
   if(parts.length===2&&parts[0]==='images'&&/^(?:skill-[1-9]\d*-)?project-[1-5]-(original|reference|result)\.(png|jpg|webp|gif)$/.test(parts[1])){
    sub=await dir.getDirectoryHandle('images');name=parts[1];
   }else if(parts.length===5&&parts[0]==='skills'&&parts[3]==='images'&&parts[1]===folderName(parts[1])&&/^(?:project-\d{2}-[a-zA-Z0-9-]+|project-[a-zA-Z0-9-]{8,120})$/.test(parts[2])&&new RegExp(`^${key}\\.(png|jpg|webp|gif)$`).test(parts[4])){
    sub=await dir.getDirectoryHandle('skills');sub=await sub.getDirectoryHandle(parts[1]);sub=await sub.getDirectoryHandle(parts[2]);sub=await sub.getDirectoryHandle('images');name=parts[4];
   }else throw Error('مسار صورة غير مدعوم');
   const blob=await(await sub.getFileHandle(name)).getFile();checkImage(blob);m.kind='blob';m.value=blob;
  }}}
  const candidate=normalizeCatalog(raw);
  const discovered=[];async function scan(folder,prefix='',depth=0){if(depth>6)return;for await(const [name,handle] of folder.entries()){const rel=prefix+name;if(handle.kind==='directory')await scan(handle,rel+'/',depth+1);else if(/\.(?:png|jpe?g|webp|gif)$/i.test(name))discovered.push(rel)}}await scan(dir);
  const orphaned=discovered.filter(path=>!referenced.has(path));if(orphaned.length)downloadBlob(new Blob([JSON.stringify({orphaned,notice:'تقرير فقط؛ لم يُحذف أي ملف'},null,2)],{type:'application/json'}),'orphan-files-report.json');
  try{const report=JSON.parse(await(await dir.getFileHandle('verification.json')).getFile().then(f=>f.text()));for(const item of report.files||[]){if(!/^(?:skills\/skill-[a-zA-Z0-9-]{8,120}\/skill\.gif|skills\/skill-[a-zA-Z0-9-]{8,120}\/project-[a-zA-Z0-9-]{8,120}\/images\/(?:original|reference|result)\.(?:png|jpg|webp|gif))$/.test(item.path))throw Error('مسار في تقرير التحقق غير صالح');let sub=dir;const parts=item.path.split('/');for(const part of parts.slice(0,-1))sub=await sub.getDirectoryHandle(part);const blob=await(await sub.getFileHandle(parts.at(-1))).getFile();if(blob.size!==item.size||await digest(blob)!==item.sha256)throw Error('اختلاف صورة في تقرير التحقق: '+item.path)}}catch(e){if(e.name!=='NotFoundError')throw e}
  if(!confirm('سيحل محتوى المجلد محل جميع المهارات الحالية. هل تريد المتابعة؟'))return;
  if(!db)throw Error('التخزين المحلي غير متاح');
  await saveChain;await folderQueue.catch(()=>{});
  await backupCurrent();await writeDB(structuredClone(candidate));
  // Do not unexpectedly synchronize imported data to a previously linked folder.
  linkedFolder=null;updateFolderButton();
  installCatalog(candidate);renderProjects();setStatus('✓ محفوظ محليًا');
  toast('تم فتح الحزمة واستعادة الصور والمشاريع؛ لربط المجلد تلقائيًا اضغط زر الربط');
 }catch(e){if(e.name!=='AbortError')toast('تعذر فتح الحزمة: '+e.message,true)}
});
function str(x,max=30000){return typeof x==='string'?x.slice(0,max):''}
function decodeDataImage(value){if(typeof value!=='string'||!/^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value))throw Error('بيانات صورة غير صالحة');const comma=value.indexOf(','),mime=value.slice(5,value.indexOf(';')),raw=atob(value.slice(comma+1));if(raw.length>MAX_IMAGE)throw Error('صورة مستوردة تتجاوز 12 ميجابايت');const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime})}
function normalizeMedia(m,gifOnly=false){if(!m||typeof m!=='object')return emptyMedia();if(m.kind==='url'){if(!validUrl(m.value))throw Error('رابط غير صالح في ملف الاستيراد');return{kind:'url',value:str(m.value,4000),name:''}}if(m.kind==='data'){const blob=decodeDataImage(m.value);if(gifOnly&&blob.type!=='image/gif')throw Error('ملف GIF المستورد غير صالح');return{kind:'blob',value:blob,name:str(m.name,160)}}if(m.kind==='blob'&&m.value instanceof Blob){checkImage(m.value);if(gifOnly&&m.value.type!=='image/gif')throw Error('GIF غير صالح');return{kind:'blob',value:m.value,name:str(m.name,160)}}return emptyMedia()}
function normalize(raw){if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.projects)||raw.projects.length>MAX_PROJECTS)throw Error('بنية JSON غير مدعومة أو عدد المشاريع يتجاوز خمسة');const out=blank(),s=raw.skill||{};for(const k of ['name','about','limits','example'])out.skill[k]=str(s[k],12000);for(const k of ['url','skool']){out.skill[k]=str(s[k],4000);if(out.skill[k]&&!validUrl(out.skill[k]))throw Error('رابط مهارة غير صالح')}out.skill.gif=normalizeMedia(s.gif,true);const ids=new Set();for(const p of raw.projects){if(!p||typeof p!=='object')throw Error('بيانات مشروع غير صالحة');const q=emptyProject();q.id=typeof p.id==='string'&&/^[a-zA-Z0-9-]{8,120}$/.test(p.id)&&!ids.has(p.id)?p.id:crypto.randomUUID();ids.add(q.id);q.name=str(p.name,160)||'مشروع بلا اسم';q.modelName=str(p.modelName,160);q.prompts.original=str(p.prompts?.original);q.prompts.reference=str(p.prompts?.reference);for(const [k] of stages)q.images[k]=normalizeMedia(p.images?.[k]);out.projects.push(q)}return out}
function normalizeCatalog(raw){if(raw?.version===1){const old=normalize(raw);old.id=crypto.randomUUID();return{version:2,activeSkillId:old.id,skills:[old]}}if(raw?.version!==2||!Array.isArray(raw.skills)||raw.skills.length>100||raw.skills.length===0)throw Error('بنية مهارات غير مدعومة');const ids=new Set();const skills=raw.skills.map(entry=>{const item=normalize({...entry,version:1});item.id=typeof entry.id==='string'&&/^[a-zA-Z0-9-]{8,120}$/.test(entry.id)&&!ids.has(entry.id)?entry.id:crypto.randomUUID();ids.add(item.id);return item});const activeSkillId=skills.some(x=>x.id===raw.activeSkillId)?raw.activeSkillId:skills[0].id;return{version:2,activeSkillId,skills}}
async function backupCurrent(){const current=await readDB();if(!current)return;const key='backup-'+new Date().toISOString()+'-'+crypto.randomUUID().slice(0,8);return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(current,key);tx.oncomplete=()=>resolve(key);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
function installCatalog(next){catalog=next;data=catalog.skills.find(s=>s.id===catalog.activeSkillId)||catalog.skills[0];catalog.activeSkillId=data.id;active=data.projects[0]?.id||null}
$('importFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>MAX_IMPORT){toast('ملف JSON أكبر من الحد المسموح (85 ميجابايت)',true);return}try{const candidate=normalizeCatalog(JSON.parse(await f.text()));if(!confirm('سيستبدل الاستيراد جميع المهارات الحالية. هل تريد المتابعة؟'))return;await saveChain.catch(()=>{});if(!db)throw Error('التخزين غير متاح');await backupCurrent();await writeDB(structuredClone(candidate));installCatalog(candidate);setStatus('✓ محفوظ محليًا');renderProjects();toast('تم الاستيراد والحفظ بنجاح')}catch(err){toast('فشل الاستيراد: '+err.message,true)}});
async function init(){try{db=await openDB();const raw=await readDB();if(raw){const migrated=normalizeCatalog(raw);const canonical=x=>JSON.stringify(x,(_,v)=>v instanceof Blob?`${v.type}:${v.size}`:v);if(canonical(raw)!==canonical(migrated)){await backupCurrent();await writeDB(structuredClone(migrated))}installCatalog(migrated)}else{const first=blank();first.id=crypto.randomUUID();catalog.skills=[first];catalog.activeSkillId=first.id;data=first}setStatus('✓ التخزين المحلي جاهز')}catch(e){setStatus('⚠ التخزين غير متاح');toast('تعذر استعادة البيانات: '+e.message+'؛ يمكنك التصدير ولكن الحفظ غير مضمون',true)}if(!catalog.skills.length){const first=blank();first.id=crypto.randomUUID();catalog.skills=[first];catalog.activeSkillId=first.id;data=first}active=data.projects[0]?.id||null;renderProjects()}init();
})();
