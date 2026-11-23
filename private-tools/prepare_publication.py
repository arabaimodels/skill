#!/usr/bin/env python3
"""تحويل ملف تصدير الاستوديو إلى ملفات نشر عامة، بدون تعديل مصدر JSON أو استدعاء الشبكة."""
import sys,json,re,base64,hashlib
from pathlib import Path

STAGES=('original','reference','result')
FALLBACKS={
 'استدعاء الشخصية البديلة':'تصور بصري لإحلال شخصية بديلة داخل مشهد مرجعي، مع مراعاة الوضعية والتعابير والمنظور والحجم واتجاه الإضاءة.',
 'استدعاء البصمة الأسلوبية':'استخلاص الخصائص الجمالية من صورة مرجعية، مثل الألوان والملامس والإضاءة والتكوين، وتوظيفها في مشاهد وموضوعات جديدة.',
 'استدعاء الأفكار الإبداعية':'تطوير تصورات فنية متعددة انطلاقًا من فكرة أولية، مع تنويع المعالجات والتكوينات البصرية واستكشاف اتجاهات جديدة.'}

def build(source:Path,site:Path,approved:bool=False):
    src=json.loads(source.read_text(encoding='utf8'))
    if src.get('version')!=2 or not isinstance(src.get('skills'),list):raise ValueError('نسخة JSON غير متوافقة')
    out={'version':1,'source':'نسخة عرض عامة بدون مدخلات خاصة','skills':[]}
    images_dir=site/'assets/published';images_dir.mkdir(parents=True,exist_ok=True)
    count=0
    for i,s in enumerate(src['skills'],1):
       meta=s.get('skill') or {}; name=str(meta.get('name') or '').strip();about=str(meta.get('about') or '').strip()
       rec={'slug':f'skill-{i:02d}','name':name,'about':about or FALLBACKS.get(name,''),'descriptionStatus':'من المصدر الأصلي' if about else 'وصف تحريري مقترح — يحتاج اعتمادًا',
            'officialUrl':str(meta.get('url') or '') if str(meta.get('url') or '').startswith('https://') else '',
            'communityUrl':str(meta.get('skool') or '') if str(meta.get('skool') or '').startswith('https://') else '', 'projects':[]}
       for j,p in enumerate(s.get('projects') or [],1):
           item={'name':str(p.get('name') or f'مشروع {j}')[:160],'images':{k:None for k in STAGES}}
           for stage in STAGES:
               m=(p.get('images') or {}).get(stage) or {}
               if m.get('kind')!='data':continue
               found=re.fullmatch(r'data:(image/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)',str(m.get('value','')),re.I)
               if not found:continue
               mime=found.group(1).lower(); data=base64.b64decode(found.group(2),validate=True)
               detected=('image/jpeg' if data.startswith(b'\xff\xd8\xff') else
                         'image/png' if data.startswith(b'\x89PNG\r\n\x1a\n') else
                         'image/gif' if data.startswith((b'GIF87a',b'GIF89a')) else
                         'image/webp' if data.startswith(b'RIFF') and data[8:12]==b'WEBP' else None)
               if not detected:raise ValueError('صورة غير صالحة')
               mime=detected
               ext={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'}[mime]
               if len(data)>15*1024*1024:raise ValueError('حجم صورة غير مسموح')
               fn=hashlib.sha256(data).hexdigest()[:24]+ext
               # IMPORTANT: Publishing a file publicly is irreversible from the Git history.
               if approved:
                   (images_dir/fn).write_bytes(data);item['images'][stage]='assets/published/'+fn
               count+=1
           rec['projects'].append(item)
       out['skills'].append(rec)
    (site/'data').mkdir(exist_ok=True)
    (site/'data/public-catalog.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
    print(f'تم إعداد الفهرس: {len(out["skills"])} مهارات / {sum(len(x["projects"]) for x in out["skills"])} مشروعًا / {count} موضع صورة')
    print('حالة الصور:', 'أُدرجت الصور بعد تصريحك بالنشر' if approved else 'لم تُدرج الصور، ولن تظهر للزائر حتى تعتمد نشرها')

if __name__=='__main__':
  if len(sys.argv)<3:raise SystemExit('الاستخدام: python prepare_publication.py <ملف-التصدير.json> <مجلد-الموقع> [--approve-public-images]')
  source=Path(sys.argv[1]).resolve();site=Path(sys.argv[2]).resolve()
  if not source.is_file() or not (site/'index.html').is_file():raise SystemExit('تحقق من ملف المصدر ومجلد الموقع الذي يحتوي على index.html')
  approved='--approve-public-images' in sys.argv[3:]
  if approved:
    confirm=input('ستُنشر الصور للعامة وربما تبقى في تاريخ Git. اكتب موافق للنشر: ').strip()
    if confirm!='موافق للنشر':raise SystemExit('إلغاء العملية. لم تُنسخ الصور.')
  build(source,site,approved)
