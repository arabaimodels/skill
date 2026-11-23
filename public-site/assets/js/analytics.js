(function(){
  'use strict';
  const preferenceKey='smartmodels_public_analytics_consent_v1';
  let initialized=false;
  const cfg=window.SMART_MODELS_SITE_CONFIG?.analytics||{};
  const active=cfg.enabled===true && /^G-[A-Z0-9]+$/i.test(cfg.measurementId||'');
  function preference(){try{return localStorage.getItem(preferenceKey)}catch{return null}}
  function setPreference(value){
    const previous=preference();
    try{localStorage.setItem(preferenceKey,value)}catch{}
    if(value==='granted')initialize();
    if(value==='denied' && previous==='granted' && initialized){
      // أعد التحميل لإنهاء جلسة مكتبة القياس التي كانت محمّلة بالفعل.
      window.location.reload();
    }
  }
  function initialize(){
    if(!active || initialized || preference()!=='granted')return;
    initialized=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',cfg.measurementId,{anonymize_ip:true,send_page_view:true});
    const s=document.createElement('script');s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(cfg.measurementId);
    s.onerror=function(){console.warn('تعذر تحميل خدمة القياس')};
    document.head.appendChild(s);
  }
  function track(name,params){
    if(!initialized||preference()!=='granted'||typeof window.gtag!=='function')return;
    // لا ترسل نصوص البحث أو أسماء المستخدمين أو محتوى المشاريع.
    const allowed=['skill_slug','category','destination','result_bucket'];
    const safe={};
    for(const key of allowed)if(Object.prototype.hasOwnProperty.call(params||{},key))safe[key]=String(params[key]).slice(0,60);
    window.gtag('event',name,safe);
  }
  window.SmartModelsAnalytics={active,preference,setPreference,initialize,track};
  if(active)initialize();
})();
