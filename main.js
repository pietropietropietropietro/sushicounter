'use strict';

const countEl = document.getElementById('count');
const incrementBtn = document.getElementById('incrementBtn');
const saveBtn = document.getElementById('saveBtn');
const historyContainer = document.getElementById('history');
const emptyState = document.getElementById('emptyState');
const detailModal = document.getElementById('detailModal');

let currentCount = 0;
let currentItemIndex = null;
let pieces = []; // array to store ISO timestamps for each +1

// Migrazione della chiave localStorage (se esiste ancora la vecchia chiave)
(function migrateLocalStorageKey(){
  try{
    const oldKey = 'sushiPranzi';
    const newKey = 'sushiPasti';
    const oldVal = localStorage.getItem(oldKey);
    const newVal = localStorage.getItem(newKey);
    if(oldVal && !newVal){
      localStorage.setItem(newKey, oldVal);
      localStorage.removeItem(oldKey);
      console.log('Migrated', oldKey, '->', newKey);
    }
  }catch(e){console.warn('Migration failed', e)}
})();

function padZero(n) {
  return n < 10 ? `0${n}` : n;
}

function formatTime(date) {
  return `${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

function renderEntry(entry, index){
  const item = document.createElement('div');
  item.className = 'history-item';
  item.setAttribute('data-index', index);

  const thumb = document.createElement('div');
  thumb.className = 'history-thumb';
  thumb.textContent = '🍣';

  const body = document.createElement('div');
  body.className = 'history-body';

  const title = document.createElement('div');
  title.className = 'history-title';
  title.textContent = `${entry.pieces} pezzi`;

  const sub = document.createElement('div');
  sub.className = 'history-sub';
  const span = document.createElement('span');
  span.className = 'time';
  span.textContent = entry.date;
  sub.appendChild(span);

  body.appendChild(title);
  body.appendChild(sub);
  item.appendChild(thumb);
  item.appendChild(body);

  // click handler per aprire il modale
  item.addEventListener('click', () => showDetail(entry, index));

  return item;
}

function showDetail(entry, index) {
  currentItemIndex = index;
  const detailSection = detailModal.querySelector('.detail-section');
  // pulisci
  detailSection.innerHTML = '';

  // data
  const rowDate = document.createElement('div');
  rowDate.className = 'detail-row';
  const strongDate = document.createElement('strong');
  strongDate.textContent = 'data:';
  rowDate.appendChild(strongDate);
  rowDate.appendChild(document.createTextNode(' ' + (entry.date || '')));
  detailSection.appendChild(rowDate);

  // totale pezzi
  const rowTotal = document.createElement('div');
  rowTotal.className = 'detail-row';
  const strongTotal = document.createElement('strong');
  strongTotal.textContent = 'totale pezzi:';
  rowTotal.appendChild(strongTotal);
  rowTotal.appendChild(document.createTextNode(' ' + (entry.pieces ?? '0')));
  detailSection.appendChild(rowTotal);

  // titolo orari
  const titleTimes = document.createElement('div');
  titleTimes.style.margin = '12px 0 8px 0';
  const strongTimes = document.createElement('strong');
  strongTimes.textContent = 'orari dei pezzi:';
  titleTimes.appendChild(strongTimes);
  detailSection.appendChild(titleTimes);

  // aggiungi la timeline dei pezzi
  (entry.times || []).forEach((time, i) => {
    const row = document.createElement('div');
    row.className = 'detail-row';

    // decide se è ISO o già formattato
    let display = time;
    try{
      // heuristics: ISO contains 'T' or is long
      if(typeof time === 'string' && (time.indexOf('T') !== -1 || time.length > 8)){
        const d = new Date(time);
        if(!Number.isNaN(d.getTime())) display = formatTime(d);
      }
    }catch(e){ /* fallback to raw */ }

    row.appendChild(document.createTextNode('pezzo ' + (i + 1) + ': '));
    const spanTime = document.createElement('span');
    spanTime.className = 'time';
    spanTime.textContent = display;
    row.appendChild(spanTime);
    detailSection.appendChild(row);
  });

  detailModal.classList.add('show');
}

function closeModal() {
  detailModal.classList.remove('show');
  currentItemIndex = null;
}

// rendi le funzioni accessibili se usate da onclick inline
window.closeModal = closeModal;

function deleteCurrentItem() {
  if (currentItemIndex === null) return;

  const itemToRemove = document.querySelector(`.history-item[data-index="${currentItemIndex}"]`);
  if (!itemToRemove) return;

  itemToRemove.classList.add('remove');

  itemToRemove.addEventListener('animationend', () => {
    const history = JSON.parse(localStorage.getItem('sushiPasti')) || [];
    history.splice(currentItemIndex, 1);
    localStorage.setItem('sushiPasti', JSON.stringify(history));

    if (history.length === 0) {
      emptyState.style.display = 'block';
    }

    closeModal();
    loadHistory();
  }, { once: true });
}
window.deleteCurrentItem = deleteCurrentItem;

// chiudi modale se si clicca fuori
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) {
    closeModal();
  }
});

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('sushiPasti')) || [];
  historyContainer.innerHTML = '';
  if(history.length === 0){
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  // most recent first
  history.slice().reverse().forEach((entry, i) => {
    historyContainer.appendChild(renderEntry(entry, history.length - 1 - i));
  });
}

// Prepara il suono all'avvio
const sound = document.getElementById('fartSound');
sound.volume = 1.0;
// Precarica il suono
sound.load();

// Funzione ottimizzata per riproduzione istantanea (click +1)
function playFartSound() {
  const fart = new Audio('fart sound effect no copyright.mp3');
  fart.volume = 1.0;
  fart.play();

  const indicator = document.getElementById('soundIndicator');
  if(indicator){
    indicator.style.opacity = '1';
    setTimeout(() => indicator.style.opacity = '0', 300);
  }
}

// Reversed sound using WebAudio: preload and cache reversed buffer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let reversedBuffer = null;
function initAudioOnInteraction(){
  if(window.__audioInitialized) return;
  window.__audioInitialized = true;
  audioCtx.resume().catch(()=>{});
  loadReversedBuffer();
}
document.addEventListener('pointerdown', initAudioOnInteraction, {once:true});
document.addEventListener('keydown', initAudioOnInteraction, {once:true});
async function loadReversedBuffer(){
  if(reversedBuffer) return;
  try{
    const res = await fetch('fart sound effect no copyright.mp3');
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    reversedBuffer = audioCtx.createBuffer(numberOfChannels, length, sampleRate);
    for(let c=0;c<numberOfChannels;c++){
      const channelData = audioBuffer.getChannelData(c);
      const reversedData = reversedBuffer.getChannelData(c);
      for(let i=0;i<length;i++) reversedData[i] = channelData[length-1-i];
    }
  }catch(e){
    console.warn('Could not load reversed audio', e);
  }
}
async function playReversedSound(){
  try{
    await loadReversedBuffer();
    if(!reversedBuffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = reversedBuffer;
    src.connect(audioCtx.destination);
    src.start();
    const indicator = document.getElementById('soundIndicator');
    if(indicator){ indicator.style.opacity = '1'; setTimeout(()=>indicator.style.opacity='0',500); }
  }catch(e){console.warn(e)}
}

incrementBtn.addEventListener('click', () => {
  const now = new Date();
  // save ISO timestamp for precision and compatibility
  pieces.push(now.toISOString());
  currentCount++;
  countEl.textContent = currentCount;

  // riproduci il suono
  playFartSound();

  // pulse the +1 button
  incrementBtn.classList.add('pulse');
  setTimeout(() => incrementBtn.classList.remove('pulse'), 360);

  // pop the counter
  countEl.classList.add('pop');
  const popHandler = () => { countEl.classList.remove('pop'); countEl.removeEventListener('animationend', popHandler); };
  countEl.addEventListener('animationend', popHandler);

  // floating +1 near the counter
  const card = document.querySelector('.card');
  const fp = document.createElement('div');
  fp.className = 'floating-plus';
  fp.textContent = '+1';
  const cardRect = card.getBoundingClientRect();
  const countRect = countEl.getBoundingClientRect();
  const left = countRect.left - cardRect.left + (countRect.width / 2);
  const top = countRect.top - cardRect.top - 8;
  fp.style.left = left + 'px';
  fp.style.top = top + 'px';
  card.appendChild(fp);
  fp.addEventListener('animationend', () => fp.remove());
});

saveBtn.addEventListener('click', async () => {
  try{ await audioCtx.resume(); }catch(e){}
  playReversedSound();

  if(currentCount === 0) {
    alert('conta prima qualche pezzo di sushi!');
    return;
  }
  const today = new Date().toLocaleDateString('it-IT');
  const createdAt = new Date().toISOString();
  const history = JSON.parse(localStorage.getItem('sushiPasti')) || [];
  const entry = {
    date: today,
    createdAt,
    pieces: currentCount,
    times: pieces // ISO timestamps
  };
  history.push(entry);
  localStorage.setItem('sushiPasti', JSON.stringify(history));

  // show new entry immediately with animation
  emptyState.style.display = 'none';
  const el = renderEntry(entry, history.length - 1);
  el.classList.add('enter');
  if(historyContainer.firstChild){
    historyContainer.insertBefore(el, historyContainer.firstChild);
  } else {
    historyContainer.appendChild(el);
  }
  el.addEventListener('animationend', () => el.classList.remove('enter'));

  // reset
  currentCount = 0;
  pieces = []; // reset times
  countEl.textContent = currentCount;
});

// inizializza
countEl.textContent = currentCount;
loadHistory();

// Cookie consent logic
function getCookieConsent(){
  try{ return localStorage.getItem('cookieConsent'); }catch(e){return null}
}

function setCookieConsent(value){
  try{ localStorage.setItem('cookieConsent', value); }catch(e){}
  const banner = document.getElementById('cookieBanner');
  if(banner){ banner.setAttribute('hidden',''); }
}

function initCookieBanner(){
  const banner = document.getElementById('cookieBanner');
  if(!banner) return;
  const consent = getCookieConsent();
  const acceptBtn = document.getElementById('acceptCookies');
  const declineBtn = document.getElementById('declineCookies');
  if(!consent){
    // show banner
    banner.removeAttribute('hidden');
    if(acceptBtn) acceptBtn.addEventListener('click', () => {
      setCookieConsent('accepted');
      // user accepted: here you could enable analytics or similar
    });
    if(declineBtn) declineBtn.addEventListener('click', () => {
      setCookieConsent('declined');
    });
  } else {
    banner.setAttribute('hidden','');
  }
}

// init banner after DOM ready (script is defer so DOM is parsed)
initCookieBanner();

// jump to history / scroll hint behavior
const gotoBtn = document.getElementById('gotoHistoryBtn');
if(gotoBtn){
  gotoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.getElementById('historyPage');
    if(el) el.scrollIntoView({ behavior: 'smooth' });
  });
}

const scrollHintEl = document.querySelector('.scroll-hint');
if(scrollHintEl){
  scrollHintEl.addEventListener('click', () => {
    const el = document.getElementById('historyPage');
    if(el) el.scrollIntoView({ behavior: 'smooth' });
  });
}

// back to top from history page
const backToTop = document.getElementById('backToTopBtn');
if(backToTop){
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.getElementById('mainPage');
    if(el) el.scrollIntoView({ behavior: 'smooth' });
  });
}
