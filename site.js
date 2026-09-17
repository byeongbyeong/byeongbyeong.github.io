const photos = {'control-room':['01 / CONTROL ROOM','컨트롤룸 설계 렌더링'],'booth-view':['02 / VOCAL BOOTH','보컬룸 설계 렌더링'],'top-view':['03 / STUDIO PLAN','스튜디오 전체 공간 설계 렌더링']};
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.image;
  const image = document.querySelector('#space-image');
  image.src = './studio-assets/' + key + '.png';
  image.alt = photos[key][1];
  document.querySelector('#space-label').textContent = photos[key][0];
  document.querySelectorAll('[data-image]').forEach(item => {item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
}));
const form = document.querySelector('#consultation');
const date = form.elements.date;
const time = form.elements.time;
const today = new Date();
date.min = [today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
date.addEventListener('change', () => {
  time.replaceChildren(new Option('시간을 선택해주세요',''));
  if (!date.value || !date.validity.valid) return;
  const day = new Date(date.value+'T12:00:00').getDay();
  const weekend = day===0 || day===6;
  for (let minute=(weekend?10:19)*60;minute<=(weekend?22:23)*60-30;minute+=30) {
    const slot=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
    time.add(new Option(slot,slot));
  }
});
function inquiry() {
  const data=new FormData(form);
  return ['SORI vocal studio 방문 상담 문의','','이름: '+data.get('name'),'회신 이메일: '+data.get('email'),'희망 일정: '+data.get('date')+' '+data.get('time'),'작업 목적: '+data.get('project'),'','문의 내용:',data.get('message')||'없음','','상담 가능 여부와 방문 안내를 부탁드립니다.'].join('\n');
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const subject='[SORI 방문 상담] '+form.elements.name.value+' / '+date.value;
  window.location.href='mailto:kbh6008@naver.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(inquiry());
  document.querySelector('#form-status').textContent='이메일 앱에서 전송을 완료해주세요. 앱이 열리지 않으면 문의 내용을 복사해 kbh6008@naver.com으로 보내주세요.';
});
document.querySelector('#copy-inquiry').addEventListener('click',async()=>{
  if(!form.reportValidity())return;
  try{await navigator.clipboard.writeText(inquiry());document.querySelector('#form-status').textContent='문의 내용을 복사했습니다. 이메일 또는 인스타그램 DM으로 보내주세요.';}
  catch{document.querySelector('#form-status').textContent='복사가 지원되지 않습니다. 이메일 링크 또는 인스타그램으로 문의해주세요.';}
});
