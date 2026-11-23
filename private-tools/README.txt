أداة تحديث محتوى الموقع من JSON (احتفظ بهذا المجلد خاصًا)

تشغيل معاينة نصوص المشاريع دون نشر الصور:
python prepare_publication.py "C:\Users\...\Downloads\smart-models-all-skills.json" "C:\Users\...\skill"

نشر الصور بعد التأكد من حقوقها وموافقة من يظهر فيها:
python prepare_publication.py "C:\Users\...\Downloads\smart-models-all-skills.json" "C:\Users\...\skill" --approve-public-images
ستظهر مطالبة تأكيد كتابة «موافق للنشر» قبل كتابة الصور.

لا ترفع هذا المجلد إلى GitHub Pages. راجع ملفات GitHub Desktop قبل الرفع.
لا يحذف البرنامج الصور القديمة الموجودة بالفعل في المستودع. إن أردت سحب صورة منشورة سابقًا، فانتبه أنها قد تبقى في تاريخ Git.
