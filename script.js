/* Simple Memory Match Game with background sound + stress index */
const startBtn = document.getElementById('startBtn');
const gameArea = document.getElementById('gameArea');
const timeEl = document.getElementById('time');
const movesEl = document.getElementById('moves');
const matchesEl = document.getElementById('matches');
const resultPanel = document.getElementById('resultPanel');
const resultText = document.getElementById('resultText');
const stressIndexEl = document.getElementById('stressIndex');
const playAgainBtn = document.getElementById('playAgainBtn');
const saveBtn = document.getElementById('saveBtn');
const bestScoresDiv = document.getElementById('bestScores');

const soundSelect = document.getElementById('soundSelect');
const difficultySelect = document.getElementById('difficultySelect');

const bgAudio = document.getElementById('bgAudio');
const effectCorrect = document.getElementById('effectCorrect');
const effectComplete = document.getElementById('effectComplete');

const assetsPath = 'assets/'; // ensure you put mp3s here

// map soundscape to file names (place files in assets/)
const bgMap = {
  'rain': assetsPath + 'sound_rain.mp3',
  'waves': assetsPath + 'sound_waves.mp3',
  'chimes': assetsPath + 'sound_chimes.mp3'
};
effectCorrect.src = assetsPath + 'sound_correct.mp3';
effectComplete.src = assetsPath + 'sound_complete.mp3';

// set volumes immediately
bgAudio.volume = 0.5;
effectCorrect.volume = 0.7;
effectComplete.volume = 0.7;

let timerInterval = null;
let startTime = null;
let moves = 0;
let matches = 0;
let totalPairs = 6;

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
saveBtn.addEventListener('click', saveScore);

let soundUnlocked = false;

// Enable Sound button — unlocks audio on user click
const enableBtn = document.getElementById('enableSoundBtn');
if(enableBtn){
  enableBtn.addEventListener('click', async ()=>{
    try {
      // try a short play on each element to unlock audio
      bgAudio.play().catch(e => console.log('bgAudio play (may fail if no src):', e.message));
      effectCorrect.play().catch(e => console.log('effectCorrect play:', e.message));
      effectComplete.play().catch(e => console.log('effectComplete play:', e.message));
      
      soundUnlocked = true;
      enableBtn.textContent = '✓ Sound Enabled';
      enableBtn.disabled = true;
      console.log('✓ Audio unlocked by user gesture');
    } catch(err) {
      console.error('Audio unlock error:', err);
    }
  });
}

// Sound selection — only plays if audio is already unlocked
soundSelect.addEventListener('change', ()=>{
  const v = soundSelect.value;
  if(v === 'none'){
    bgAudio.pause();
    bgAudio.src = '';
    console.log('Sound stopped');
    return;
  }
  
  if(!soundUnlocked){
    alert('Audio is locked. Click the "🔊 Enable Sound" button first.');
    soundSelect.value = 'none';
    return;
  }
  
  bgAudio.src = bgMap[v] || '';
  console.log('Playing:', bgAudio.src);
  bgAudio.load();
  bgAudio.play().catch((err)=>{
    console.error('Audio play failed:', err);
  });
});

function startGame(){
  // hide result panel
  resultPanel.setAttribute('aria-hidden','true');
  resultPanel.style.display = 'none';

  // setup difficulty
  const diff = difficultySelect.value;
  if(diff === 'easy'){ totalPairs = 3; gameArea.style.gridTemplateColumns = 'repeat(3,1fr)'; }
  else if(diff === 'medium'){ totalPairs = 6; gameArea.style.gridTemplateColumns = 'repeat(4,1fr)'; }
  else { totalPairs = 9; gameArea.style.gridTemplateColumns = 'repeat(6,1fr)'; }

  // prepare card set
  const values = generateValues(totalPairs);
  renderCards(values);

  // reset stats
  moves = 0; matches = 0;
  movesEl.textContent = moves;
  matchesEl.textContent = matches;
  timeEl.textContent = '00:00';
  startTimer();
}

function generateValues(pairs){
  const arr = [];
  for(let i=1;i<=pairs;i++){
    arr.push(i);
    arr.push(i);
  }
  // shuffle
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function renderCards(values){
  gameArea.innerHTML = '';
  values.forEach((v, idx)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.value = v;
    card.dataset.index = idx;

    const front = document.createElement('div');
    front.className = 'front';
    front.textContent = '✓';

    const back = document.createElement('div');
    back.className = 'back';
    back.textContent = v;

    card.appendChild(front);
    card.appendChild(back);

    card.addEventListener('click', onCardClick);
    gameArea.appendChild(card);
  });
}

let flipped = [];
let lock = false;
function onCardClick(e){
  if(lock) return;
  const card = e.currentTarget;
  if(card.classList.contains('flipped')) return;

  flipCard(card);

  flipped.push(card);
  if(flipped.length === 2){
    moves++;
    movesEl.textContent = moves;
    const [a,b] = flipped;
    if(a.dataset.value === b.dataset.value){
      // match
      matches++;
      matchesEl.textContent = matches;
      effectCorrect.currentTime = 0;
      effectCorrect.play().catch(()=>{});
      flipped = [];
      if(matches === totalPairs){
        endGame();
      }
    } else {
      lock = true;
      setTimeout(()=>{
        unflipCard(a);
        unflipCard(b);
        flipped = [];
        lock = false;
      }, 700);
    }
  }
}

function flipCard(card){
  card.classList.add('flipped');
}
function unflipCard(card){
  card.classList.remove('flipped');
}

function startTimer(){
  clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(()=>{
    const diff = Date.now() - startTime;
    const s = Math.floor(diff/1000);
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s % 60).padStart(2,'0');
    timeEl.textContent = `${mm}:${ss}`;
  }, 300);
}

function endGame(){
  clearInterval(timerInterval);
  effectComplete.currentTime = 0;
  effectComplete.play().catch(()=>{});
  // compute time
  const elapsedMs = Date.now() - startTime;
  const elapsedSec = Math.round(elapsedMs/1000);
  // simple stress index calculation (lower is better)
  // baseline: faster time & fewer moves => lower stress
  const normalizedTime = elapsedSec / (totalPairs * 5); // expected ~5s per pair baseline
  const normalizedMoves = moves / (totalPairs * 2); // baseline moves
  const stressIndex = Math.max(0, Math.round((normalizedTime + normalizedMoves) * 50)); // 0-100-ish

  resultPanel.style.display = 'block';
  resultPanel.setAttribute('aria-hidden','false');
  resultText.textContent = `You finished in ${elapsedSec}s with ${moves} moves.`;
  stressIndexEl.textContent = `${stressIndex} / 100`;
  // show slight suggestion message
  if(stressIndex <= 30) resultText.textContent += ' Great — your stress score looks low. Keep it up!';
  else if(stressIndex <= 60) resultText.textContent += ' Nice — a short breathing exercise after this round will help.';
  else resultText.textContent += ' Try another round with slow breathing — you may feel calmer.';

  // update best scores shown
  showBestScores();
}

function saveScore(){
  const diff = difficultySelect.value;
  const key = `shp_best_${diff}`;
  // store best by elapsed time then moves
  const elapsedText = timeEl.textContent;
  const movesNow = moves;
  const cur = JSON.parse(localStorage.getItem(key) || '[]');
  cur.push({time: elapsedText, moves: movesNow, date: new Date().toISOString()});
  // keep last 5
  localStorage.setItem(key, JSON.stringify(cur.slice(-5)));
  showBestScores();
  alert('Score saved locally!');
}

function showBestScores(){
  const diff = difficultySelect.value;
  const key = `shp_best_${diff}`;
  const cur = JSON.parse(localStorage.getItem(key) || '[]');
  if(cur.length === 0){
    bestScoresDiv.textContent = 'No scores yet';
    return;
  }
  bestScoresDiv.innerHTML = '';
  cur.slice().reverse().forEach(s=>{
    const el = document.createElement('div');
    el.textContent = `${s.time} — ${s.moves} moves — ${new Date(s.date).toLocaleString()}`;
    bestScoresDiv.appendChild(el);
  });
}

// initialize small default UI
(function init(){
  resultPanel.style.display = 'none';
  // pre-load audio elements to avoid delay
  effectCorrect.load();
  effectComplete.load();
  bgAudio.volume = 0.5;
  effectCorrect.volume = 0.7;
  effectComplete.volume = 0.7;
  showBestScores();
})();
