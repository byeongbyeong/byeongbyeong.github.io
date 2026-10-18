(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const frame = $('#preview');
  const base = new URL('./', location.href).href;
  const template = window.SORI_TEMPLATE;
  const original = new DOMParser().parseFromString(template.html, 'text/html');
  const textSelector = 'p,h2,h3,summary,dd,dt,figcaption span,.facts b,.facts span,.gallery-tabs b,.gallery-tabs button>span,.hero h1>span,.hero .button,.contact-copy .button,.special a,.email-link,footer small';
  const targets = new Map();
  const sections = [...original.querySelectorAll('main>section')];
  const sectionNames = ['메인 화면','스튜디오 소개','공간 사진','프로그램','장비 소개','방문 상담','자주 묻는 질문'];
  sections.forEach((node,i) => {if(!node.dataset.sectionId)node.dataset.sectionId='s'+i;});
  original.querySelectorAll(textSelector).forEach((node,i) => {
    const id=node.dataset.editId||'t'+i;
    node.dataset.editId=id;
    targets.set(id,{type:'text',node,label:ownText(node).trim().slice(0,32)||'문구'});
  });
  const hero=original.querySelector('.hero>img');
  hero.dataset.editId='hero-image';
  targets.set('hero-image',{type:'image',node:hero,label:'메인 사진',src:hero.getAttribute('src'),alt:hero.alt});
  const galleryInfo={
    'studio-room-bright':['01 / SHARED STUDIO','작업 책상과 보컬 녹음 위치가 함께 있는 밝은 단일 공간 설계 이미지'],
    'workstation-bright':['02 / WORKSTATION','같은 공간에서 녹음 디렉과 믹싱을 진행하는 작업 자리 설계 이미지'],
    'studio-overview-bright':['03 / SINGLE-ROOM LAYOUT','책상, 녹음 마이크와 출입 동선이 한 공간에 있는 스튜디오 배치 설계 이미지']
  };
  Object.entries(galleryInfo).forEach(([key,info],i) => {
    targets.set('g-'+key,{type:'gallery',key,label:'공간 사진 '+(i+1),src:'studio-assets/'+key+'.webp',alt:info[1]});
  });
  let state=fresh(), selected=null, viewport='desktop', history=[], future=[], db=null, ready=false, saving=0;
  function fresh(){return {version:1,templateHash:template.hash,edits:{},feedback:{},order:sections.map(n=>n.dataset.sectionId),hidden:sections.filter(n=>n.hidden).map(n=>n.dataset.sectionId)};}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function ownText(node){return [...node.childNodes].filter(n=>n.nodeType===3||n.nodeName==='BR').map(n=>n.nodeName==='BR'?'\n':n.textContent).join('');}
  function putText(node,value){
    const owned=[...node.childNodes].filter(n=>n.nodeType===3||n.nodeName==='BR');
    let anchor=owned.length?owned[0].nextSibling:node.firstChild;
    while(anchor&&owned.includes(anchor))anchor=anchor.nextSibling;
    owned.forEach(n=>n.remove());
    const fragment=node.ownerDocument.createDocumentFragment();
    value.split('\n').forEach((part,i)=>{if(i)fragment.append(node.ownerDocument.createElement('br'));fragment.append(node.ownerDocument.createTextNode(part));});
    node.insertBefore(fragment,anchor);
  }
  function toast(value){$('#toast').textContent=value;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
  function confirmAction(title,body){return new Promise(resolve=>{
    $('#confirm-title').textContent=title;$('#confirm-body').textContent=body;
    const dialog=$('#confirm-dialog');dialog.returnValue='';dialog.showModal();
    $('#cancel-confirm').onclick=()=>dialog.close('cancel');$('#accept-confirm').onclick=()=>dialog.close('yes');
    dialog.onclose=()=>resolve(dialog.returnValue==='yes');
  });}
  function apply(doc){
    for(const [id,entry] of targets){
      const edit=state.edits[id]||{};
      if(entry.type==='gallery'){
        const button=doc.querySelector('[data-image="'+entry.key+'"]');
        button.dataset.src=edit.src||entry.src;button.dataset.alt=edit.alt??entry.alt;
        button.dataset.position=(edit.x??50)+'% '+(edit.y??50)+'%';
        button.dataset.fit=edit.fit||'contain';
        continue;
      }
      const node=doc.querySelector('[data-edit-id="'+id+'"]');
      if(!node)continue;
      if(entry.type==='text'){
        putText(node,edit.text??ownText(entry.node));
        node.style.textAlign=edit.align||entry.node.style.textAlign;
        node.style.color=edit.color||entry.node.style.color;
      }else{
        node.src=edit.src||entry.src;node.alt=edit.alt??entry.alt;
        node.style.objectFit=edit.fit||'cover';
        if(edit.x!==undefined||edit.y!==undefined)node.style.objectPosition=(edit.x??50)+'% '+(edit.y??50)+'%';
        else node.style.removeProperty('object-position');
      }
    }
    const main=doc.querySelector('main');
    state.order.forEach((id,i)=>{const node=doc.querySelector('[data-section-id="'+id+'"]');if(main.children[i]!==node)main.insertBefore(node,main.children[i]||null);node.hidden=state.hidden.includes(id);});
    doc.querySelectorAll('header nav>a').forEach(a=>{const section=doc.querySelector(a.getAttribute('href'));a.hidden=Boolean(section?.hidden);});
    let style=doc.querySelector('#sori-editor-overrides');
    if(!style){style=doc.createElement('style');style.id='sori-editor-overrides';doc.head.append(style);}
    let css='[hidden]{display:none!important}h1,h2,h3,p{overflow-wrap:anywhere}.hero{height:auto;max-height:none;min-height:calc(100svh - 125px)}.hero-copy{padding-bottom:100px}@media(max-width:600px){.hero{min-height:550px}}';
    for(const [id,edit] of Object.entries(state.edits)){
      if(edit.fontDesktop)css+='[data-edit-id="'+id+'"]{font-size:'+edit.fontDesktop+'px!important}';
      if(edit.fontMobile)css+='@media(max-width:600px){[data-edit-id="'+id+'"]{font-size:'+edit.fontMobile+'px!important}}';
    }
    style.textContent=css;
    const active=doc.querySelector('[data-image].selected')||doc.querySelector('[data-image]');
    if(active){const image=doc.querySelector('#space-image');image.src=active.dataset.src;image.alt=active.dataset.alt;image.style.objectPosition=active.dataset.position;image.style.objectFit=active.dataset.fit;}
  }
  function render(){
    apply(frame.contentDocument);renderSections();renderFeedback();highlight();updateHistoryButtons();
  }
  function mutate(fn){
    const before=clone(state);fn();
    if(JSON.stringify(before)===JSON.stringify(state))return;
    history.push(before);if(history.length>30)history.shift();future=[];
    render();save();
  }
  function updateHistoryButtons(){$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;}
  function editSelected(patch){if(!selected)return;mutate(()=>{state.edits[selected]={...(state.edits[selected]||{}),...patch};});}
  function highlight(){
    const doc=frame.contentDocument;
    doc.querySelectorAll('.sori-selected').forEach(n=>n.classList.remove('sori-selected'));
    if(!selected)return;
    const entry=targets.get(selected);
    const node=entry.type==='gallery'?doc.querySelector('#space-image'):doc.querySelector('[data-edit-id="'+selected+'"]');
    node?.classList.add('sori-selected');
  }
  function select(id,scroll=false){
    if(!targets.has(id))return;
    selected=id;const entry=targets.get(id),edit=state.edits[id]||{};
    $('#selection-name').textContent=entry.label;$('#empty').hidden=true;$('#controls').hidden=false;
    const isImage=entry.type!=='text';$('#text-field').hidden=isImage;$('#type-fields').hidden=isImage;$('#image-fields').hidden=!isImage;
    if(isImage){$('#alt').value=edit.alt??entry.alt;$('#fit').value=edit.fit||(entry.type==='gallery'?'contain':'cover');$('#focus-x').value=edit.x??50;$('#focus-y').value=edit.y??50;}
    else{
      const node=frame.contentDocument.querySelector('[data-edit-id="'+id+'"]');
      $('#text').value=edit.text??ownText(entry.node);
      const size=parseFloat(frame.contentWindow.getComputedStyle(node).fontSize);
      $('#font-size').value=Math.round(size);$('#font-value').value=Math.round(size)+' px';
      $('#color').value=edit.color||rgbHex(frame.contentWindow.getComputedStyle(node).color);
      document.querySelectorAll('[data-align]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.align===(edit.align||'left'))));
    }
    $('#feedback').value=state.feedback[id]?.text||'';$('#done').checked=state.feedback[id]?.done||false;
    if(entry.type==='gallery'){
      const doc=frame.contentDocument;doc.querySelector('[data-image="'+entry.key+'"]').click();
    }
    highlight();
    if(scroll){const node=entry.type==='gallery'?frame.contentDocument.querySelector('#space-image'):frame.contentDocument.querySelector('[data-edit-id="'+id+'"]');node.scrollIntoView({block:'center'});}
    if(innerWidth<=760)setMode('inspector');
  }
  function rgbHex(rgb){const parts=rgb.match(/\d+/g);return parts?'#'+parts.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#20362b';}
  function renderSections(){
    const holder=$('#sections');holder.replaceChildren();
    state.order.forEach((id,i)=>{
      const row=document.createElement('div');row.className='section-row';
      const button=document.createElement('button');button.textContent=sectionNames[Number(id.slice(1))];button.onclick=()=>{
        const node=frame.contentDocument.querySelector('[data-section-id="'+id+'"]');
        if(node.hidden){toast('숨긴 섹션입니다. 표시를 켜주세요.');return;}
        node.scrollIntoView({block:'start'});setMode('preview');
      };row.append(button);
      const tools=document.createElement('div');tools.className='section-tools';
      const label=document.createElement('label');label.className='check';
      const check=document.createElement('input');check.type='checkbox';check.checked=!state.hidden.includes(id);check.disabled=['s0','s5'].includes(id);check.setAttribute('aria-label',button.textContent+' 표시');
      check.onchange=()=>mutate(()=>{state.hidden=check.checked?state.hidden.filter(v=>v!==id):[...state.hidden,id];});label.append(check,'표시');tools.append(label);
      for(const [symbol,delta,title] of [['↑',-1,'위로 이동'],['↓',1,'아래로 이동']]){
        const move=document.createElement('button');move.textContent=symbol;move.title=button.textContent+' '+title;move.setAttribute('aria-label',move.title);move.disabled=i+delta<0||i+delta>=state.order.length;
        move.onclick=()=>mutate(()=>{[state.order[i],state.order[i+delta]]=[state.order[i+delta],state.order[i]];});tools.append(move);
      }
      row.append(tools);holder.append(row);
    });
  }
  function renderFeedback(){
    const holder=$('#feedback-list');holder.replaceChildren();
    const entries=Object.entries(state.feedback).filter(([,f])=>f.text.trim());$('#feedback-count').textContent=entries.length;
    for(const [id,f] of entries){
      const button=document.createElement('button');button.className='feedback-item';
      const small=document.createElement('small');small.textContent=(f.done?'해결 · ':'미해결 · ')+targets.get(id).label;
      button.append(small,document.createTextNode(f.text));button.onclick=()=>select(id,true);holder.append(button);
    }
  }
  function resize(){
    const toolbarHeight=$('header').getBoundingClientRect().height+$('.viewbar').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--toolbar-height',toolbarHeight+'px');
    const preview=$('.preview');const available=preview.clientWidth-(innerWidth<=760?24:36);
    const width=viewport==='mobile'?390:1280;const scale=Math.min(1,available/width);
    const height=Math.max(300,(preview.clientHeight-(innerWidth<=760?24:48))/scale);
    frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')';
    $('#frame-shell').style.width=width*scale+'px';$('#frame-shell').style.height=height*scale+'px';
  }
  function setMode(mode){document.body.classList.toggle('mobile-inspector',mode==='inspector');document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));requestAnimationFrame(resize);}
  async function openDB(){return new Promise((resolve,reject)=>{
    const request=indexedDB.open('sori-editor-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('blocked'));
  });}
  async function save(){
    const version=++saving;$('#save-state').textContent='저장 중';
    if(!db){$('#save-state').textContent='자동 저장 불가 · 파일로 내보내세요';return;}
    try{await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(clone(state),'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});if(version===saving)$('#save-state').textContent='이 브라우저에 저장됨';}
    catch{$('#save-state').textContent='저장 실패 · 파일로 내보내세요';}
  }
  function validate(input){
    if(!input||input.version!==1||input.templateHash!==template.hash)throw new Error('이 홈페이지 버전의 변경 파일이 아닙니다. 기존 파일은 채팅에 전달해주세요.');
    const result=fresh();
    if(!Array.isArray(input.order)||input.order.length!==sections.length||new Set(input.order).size!==sections.length||input.order.some(id=>!result.order.includes(id)))throw new Error('섹션 순서가 올바르지 않습니다.');
    result.order=input.order;
    if(!Array.isArray(input.hidden)||input.hidden.some(id=>!result.order.includes(id)||['s0','s5'].includes(id)))throw new Error('표시 설정이 올바르지 않습니다.');
    result.hidden=[...new Set(input.hidden)];
    if(!input.edits||typeof input.edits!=='object'||!input.feedback||typeof input.feedback!=='object')throw new Error('잘못된 변경 파일입니다.');
    for(const [id,edit] of Object.entries(input.edits)){
      if(!targets.has(id)||!edit||typeof edit!=='object')throw new Error('알 수 없는 편집 요소입니다.');
      const clean={};
      for(const [key,value] of Object.entries(edit)){
        if(['text','alt'].includes(key)&&typeof value==='string'&&value.length<=4000)clean[key]=value;
        else if(key==='src'&&typeof value==='string'&&value.length<=4000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))clean.src=value;
        else if(['x','y'].includes(key)&&Number.isFinite(value)&&value>=0&&value<=100)clean[key]=value;
        else if(['fontDesktop','fontMobile'].includes(key)&&Number.isFinite(value)&&value>=11&&value<=96)clean[key]=value;
        else if(key==='align'&&['left','center','right'].includes(value))clean[key]=value;
        else if(key==='fit'&&['contain','cover'].includes(value))clean[key]=value;
        else if(key==='color'&&typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value))clean[key]=value;
        else throw new Error('지원하지 않는 편집 값입니다.');
      }
      result.edits[id]=clean;
    }
    for(const [id,f] of Object.entries(input.feedback)){
      if(!targets.has(id)||!f||typeof f.text!=='string'||f.text.length>2000||typeof f.done!=='boolean')throw new Error('의견 형식이 올바르지 않습니다.');
      result.feedback[id]={text:f.text,done:f.done};
    }
    return result;
  }
  function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function imageUpload(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){toast('12MB 이하 JPEG·PNG·WebP를 선택해주세요.');return;}
    const id=selected;$('#image-file').disabled=true;
    try{
      const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>80000000){bitmap.close();throw new Error('이미지 해상도가 너무 큽니다.');}
      const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const src=canvas.toDataURL('image/webp',.86);
      mutate(()=>{state.edits[id]={...(state.edits[id]||{}),src};});toast('사진을 교체했습니다. 공개 사이트에는 아직 반영되지 않습니다.');
    }catch(error){toast(error.message||'사진을 읽지 못했습니다.');}
    finally{$('#image-file').disabled=false;$('#image-file').value='';}
  }
  function wire(){
    $('#text').oninput=()=>editSelected({text:$('#text').value});
    $('#alt').oninput=()=>editSelected({alt:$('#alt').value});
    $('#fit').onchange=()=>editSelected({fit:$('#fit').value});
    $('#font-size').oninput=()=>{const n=Number($('#font-size').value);$('#font-value').value=n+' px';editSelected({[viewport==='mobile'?'fontMobile':'fontDesktop']:n});};
    $('#color').oninput=()=>editSelected({color:$('#color').value});
    for(const axis of ['x','y'])$('#focus-'+axis).oninput=()=>editSelected({[axis]:Number($('#focus-'+axis).value)});
    document.querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>{editSelected({align:b.dataset.align});select(selected);});
    $('#reset-style').onclick=()=>{mutate(()=>{const edit=state.edits[selected]||{};for(const key of ['fontDesktop','fontMobile','color','align'])delete edit[key];});select(selected);};
    $('#original-image').onclick=()=>{mutate(()=>{const edit=state.edits[selected]||{};for(const key of ['src','alt','x','y','fit'])delete edit[key];});select(selected);};
    $('#image-file').onchange=()=>imageUpload($('#image-file').files[0]);
    const feedback=()=>{if(!selected)return;mutate(()=>{state.feedback[selected]={text:$('#feedback').value,done:$('#done').checked};});};
    $('#feedback').oninput=feedback;$('#done').onchange=feedback;
    $('#undo').onclick=()=>{if(!history.length)return;future.push(clone(state));state=history.pop();render();if(selected)select(selected);save();};
    $('#redo').onclick=()=>{if(!future.length)return;history.push(clone(state));state=future.pop();render();if(selected)select(selected);save();};
    document.querySelectorAll('[data-viewport]').forEach(b=>b.onclick=()=>{viewport=b.dataset.viewport;document.querySelectorAll('[data-viewport]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));resize();setTimeout(()=>{if(selected)select(selected);if(innerWidth<=760)setMode('preview');},40);});
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
    $('#export').onclick=()=>{download('SORI-changes-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');toast('변경 파일을 이 채팅에 첨부해주세요.');};
    $('#download-html').onclick=()=>{
      const doc=new DOMParser().parseFromString(original.documentElement.outerHTML,'text/html');apply(doc);
      doc.querySelectorAll('[data-image]').forEach(button=>{const src=button.dataset.src;if(src.startsWith('data:'))button.dataset.src=src;});
      download('index.html','<!doctype html>\n'+doc.documentElement.outerHTML,'text/html;charset=utf-8');toast('기존 styles.css와 최신 site.js가 함께 필요합니다.');
    };
    $('#import').onclick=()=>$('#import-file').click();
    $('#import-file').onchange=async()=>{
      try{const file=$('#import-file').files[0];if(!file)return;if(file.size>20*1024*1024)throw new Error('20MB 이하 파일만 불러올 수 있습니다.');
        const next=validate(JSON.parse(await file.text()));
        if(await confirmAction('변경 파일 불러오기','현재 초안을 교체합니다. 먼저 내보내기로 백업할 수 있습니다.')){mutate(()=>{state=next;});if(selected)select(selected);toast('변경 파일을 불러왔습니다.');}
      }catch(error){toast(error.message||'파일을 읽지 못했습니다.');}finally{$('#import-file').value='';}
    };
    $('#reset').onclick=async()=>{if(await confirmAction('원본으로 초기화','사진·문구·의견을 원본으로 되돌립니다. 내보낸 백업 파일은 영향을 받지 않습니다.')){mutate(()=>{state=fresh();});if(selected)select(selected);}};
    addEventListener('resize',resize);new ResizeObserver(resize).observe($('.preview'));
  }
  async function init(){
    try{db=await openDB();const saved=await new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(saved)state=validate(saved);$('#save-state').textContent='이 브라우저의 초안';}
    catch(error){$('#save-state').textContent=db?'이전 버전 초안 · 내보낸 파일을 확인하세요':'자동 저장 불가 · 파일로 내보내세요';}
    const doc=original.cloneNode(true);const baseNode=doc.createElement('base');baseNode.href=base;doc.head.prepend(baseNode);
    frame.onload=()=>{
      const previewDoc=frame.contentDocument;
      const style=previewDoc.createElement('style');style.textContent='[data-edit-id]{cursor:crosshair!important}.sori-selected{outline:3px solid #648f72!important;outline-offset:4px}html{scroll-behavior:auto!important}';previewDoc.head.append(style);
      previewDoc.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();toast('미리보기에서는 문의를 전송하지 않습니다.');},true);
      previewDoc.addEventListener('click',e=>{
        const element=e.target;
        const galleryButton=element.closest('[data-image]');
        if(galleryButton){if($('#pick').checked){e.preventDefault();e.stopImmediatePropagation();const key=galleryButton.dataset.image;previewDoc.querySelectorAll('[data-image]').forEach(b=>{b.classList.toggle('selected',b===galleryButton);b.setAttribute('aria-pressed',String(b===galleryButton));});previewDoc.querySelector('#space-label').textContent=galleryInfo[key][0];apply(previewDoc);const textNode=element.closest('[data-edit-id]');if(textNode)select(textNode.dataset.editId);else selectGallery('g-'+key); }return;}
        if($('#pick').checked){
          const node=element.closest('[data-edit-id]');
          if(node){e.preventDefault();e.stopImmediatePropagation();select(node.dataset.editId);return;}
          if(element.closest('#space-image')){e.preventDefault();selectGallery('g-'+previewDoc.querySelector('[data-image].selected').dataset.image);return;}
        }
        const link=element.closest('a');if(link&&!link.getAttribute('href').startsWith('#')){e.preventDefault();e.stopImmediatePropagation();toast('미리보기에서는 외부 링크를 열지 않습니다.');}
      },true);
      render();resize();ready=true;
    };
    frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
    wire();
  }
  // Gallery selection updates controls without synthesizing another captured click.
  function selectGallery(id){
    const old=selected;selected=null;
    const entry=targets.get(id), edit=state.edits[id]||{};selected=id;
    $('#selection-name').textContent=entry.label;$('#empty').hidden=true;$('#controls').hidden=false;
    $('#text-field').hidden=true;$('#type-fields').hidden=true;$('#image-fields').hidden=false;
    $('#alt').value=edit.alt??entry.alt;$('#focus-x').value=edit.x??50;$('#focus-y').value=edit.y??50;
    $('#fit').value=edit.fit||'contain';
    $('#feedback').value=state.feedback[id]?.text||'';$('#done').checked=state.feedback[id]?.done||false;highlight();
    if(innerWidth<=760)setMode('inspector');
  }
  init();
})();
