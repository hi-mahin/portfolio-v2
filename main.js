// ==================== AUDIO EQUALIZER ====================
const eqMeter = document.getElementById('equalizer');
const profileEq = document.getElementById('profileEqualizer');
const audio = document.getElementById('bg-music');
const musicIcon = document.getElementById('music-icon');
const audioHelp = document.getElementById('audioHelp');
const audioHelpToggle = document.getElementById('audioHelpToggle');
const audioHelpClose = document.getElementById('audioHelpClose');

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let analyser = null;
let analyserData = null;
let visualizerRAF = null;

const floatBars = eqMeter ? Array.from(eqMeter.querySelectorAll('.bar')) : [];
const profileBars = profileEq ? Array.from(profileEq.querySelectorAll('.bar')) : [];

// Initialize Web Audio API analyser
function initAudioAnalyser() {
  if (!AudioContext || !audio) return;
  if (audioCtx && analyser) return;

  audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.8;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  analyserData = new Uint8Array(analyser.frequencyBinCount);
}

// Update equalizer bars based on audio frequency data
function updateEqualizerBars() {
  if (!analyser || !analyserData) return;

  analyser.getByteFrequencyData(analyserData);

  function setBars(bars) {
    bars.forEach((bar, idx) => {
      const value = analyserData[idx * 2] || analyserData[idx] || 0;
      const scale = Math.max(0.25, value / 180);
      bar.style.transform = `scaleY(${scale})`;
      bar.style.opacity = `${0.4 + scale * 0.6}`;
    });
  }

  setBars(floatBars);
  setBars(profileBars);

  visualizerRAF = requestAnimationFrame(updateEqualizerBars);
}

// Start the visualizer animation
function startVisualizer() {
  if (!analyser || visualizerRAF) return;
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  visualizerRAF = requestAnimationFrame(updateEqualizerBars);
}

// Stop the visualizer animation
function stopVisualizer() {
  if (visualizerRAF) {
    cancelAnimationFrame(visualizerRAF);
    visualizerRAF = null;
  }
  const resetBars = (bars) => bars.forEach(bar => {
    bar.style.transform = 'scaleY(0.35)';
    bar.style.opacity = '0.45';
  });
  resetBars(floatBars);
  resetBars(profileBars);
}

// Show/hide equalizer
function setEqualizerVisible(show) {
  if (eqMeter) {
    eqMeter.classList.toggle('active', show);
    eqMeter.classList.toggle('hidden', !show);
    eqMeter.classList.toggle('fallback', show && audio.paused);
  }
  if (profileEq) {
    profileEq.classList.toggle('active', show);
    profileEq.classList.toggle('fallback', show && audio.paused);
  }
}

// Update music status and equalizer visibility
function updateMusicStatus() {
  const playing = !audio.paused && !audio.ended && !audio.muted;
  
  setEqualizerVisible(playing || !audio.paused);
  musicIcon.textContent = audio.muted || audio.paused ? '🔇' : '🔊';

  if (playing) {
    initAudioAnalyser();
    startVisualizer();
  } else {
    stopVisualizer();
  }
}

// Update help popup UI
function updateHelpUI() {
  if (!audioHelp || !audioHelpToggle) return;
  audioHelpToggle.textContent = audio.muted ? 'Unmute' : 'Mute';
  audioHelp.style.display = audio.paused ? 'flex' : 'flex';

  if (musicIcon) musicIcon.textContent = audio.muted || audio.paused ? '🔇' : '🔊';
}

// Toggle music mute/unmute
function toggleMusic() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((error) => { console.warn('AudioContext resume blocked:', error); });
  }

  const wasPaused = audio.paused;

  if (audio.paused) {
    initAudioAnalyser();
    audio.play().catch((error) => { console.warn('Audio play blocked:', error); });
  }

  audio.muted = !audio.muted;

  if (wasPaused) {
    audio.play().then(() => {
      updateMusicStatus();
    }).catch((error) => {
      console.warn('Audio play retry blocked:', error);
      updateMusicStatus();
    });
    return;
  }

  updateMusicStatus();
}

// Audio event listeners
if (audio) {
  audio.addEventListener('play', updateMusicStatus);
  audio.addEventListener('pause', updateMusicStatus);
  audio.addEventListener('ended', updateMusicStatus);
  audio.addEventListener('volumechange', updateMusicStatus);

  audio.addEventListener('error', () => {
    console.warn('Audio error: cannot play on this device');
    setEqualizerVisible(false);
    musicIcon.textContent = '🔇';
  });
}

audioHelpToggle?.addEventListener('click', () => {
  toggleMusic();
  updateHelpUI();
});

audioHelpClose?.addEventListener('click', () => {
  if (audioHelp) audioHelp.style.display = 'none';
});

// Music icon click handler
if (musicIcon) {
  musicIcon.addEventListener('click', toggleMusic);
  musicIcon.style.transition = 'all 0.3s ease';
  musicIcon.addEventListener('mouseenter', () => {
    musicIcon.style.transform = 'scale(1.2)';
    musicIcon.style.filter = 'drop-shadow(0 0 12px rgba(0,255,136,0.8))';
  });
  musicIcon.addEventListener('mouseleave', () => {
    musicIcon.style.transform = 'scale(1)';
    musicIcon.style.filter = 'drop-shadow(0 0 8px rgba(0,255,136,0.5))';
  });
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  if (!audio) return;

  // Mobile detection - no autoplay on mobile
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         window.innerWidth <= 768 ||
                         'ontouchstart' in window;

  if (!isMobileDevice) {
    updateHelpUI();
  } else {
    // Show only when user taps music
    if (audioHelp) {
      audioHelp.style.display = 'none';
    }

    if (musicIcon) {
      musicIcon.addEventListener('click', () => {
        audioHelp.style.display = 'flex';
      });
    }
  }
});

// ==================== NOTIFICATION SYSTEM ====================
function closeNotification() {
  const notif = document.getElementById('mute-notification');
  if (notif) {
    notif.classList.remove('show');
  }
}

// ==================== CURSOR ====================
const cur = document.getElementById('cur'), curDot = document.getElementById('cur-dot');
let cx = 0, cy = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', (e) => {
  cx = e.clientX;
  cy = e.clientY;
  curDot.style.left = cx + 'px';
  curDot.style.top = cy + 'px';
});

(function animCur() {
  rx += (cx - rx) * 0.18;
  ry += (cy - ry) * 0.18;
  cur.style.left = rx + 'px';
  cur.style.top = ry + 'px';
  requestAnimationFrame(animCur);
})();

document.querySelectorAll('a, button, .proj-card, .skill-item, .trait-item, .social-item').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    cur.style.width = '24px';
    cur.style.height = '24px';
    cur.style.borderColor = 'var(--b)';
  });
  el.addEventListener('mouseleave', () => {
    cur.style.width = '14px';
    cur.style.height = '14px';
    cur.style.borderColor = 'var(--g)';
  });
});

// ==================== MATRIX RAIN ====================
(function () {
  const canvas = document.getElementById('matrix');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const chars = 'アイウエオカキクケコ01アBCDEF0011';
  const cols = Math.floor(canvas.width / 18);
  const drops = Array(cols).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(0,4,8,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff88';
    ctx.font = '14px Share Tech Mono';

    drops.forEach((y, i) => {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 18, y * 18);
      if (y * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }

  setInterval(draw, 80);
})();

// ==================== BOOT SEQUENCE ====================
(function () {
  const lines = [
    'MAHIN.SYS v2.0 — BOOT SEQUENCE',
    '================================',
    '',
    '[OK] Loading kernel modules...',
    '[OK] Initializing AI subsystems...',
    '[OK] Mounting security protocols...',
    '[OK] Connecting neural interface...',
    '[OK] Loading project database...',
    '',
    '> Identity: MAHIN',
    '> Role: Developer | AI | Security',
    '> Status: ONLINE',
    '',
    'System ready. Loading interface...',
  ];

  let li = 0, ci = 0;
  const el = document.getElementById('boot-text');
  if (!el) return;

  let output = '';

  function type() {
    if (li >= lines.length) {
      setTimeout(() => {
        const boot = document.getElementById('boot');
        if (boot) {
          boot.classList.add('hide');
          setTimeout(() => {
            boot.style.display = 'none';
          }, 900);
        }
      }, 600);
      return;
    }

    const line = lines[li];
    if (ci < line.length) {
      output += line[ci];
      el.textContent = output;
      ci++;
      setTimeout(type, 18);
    } else {
      output += '\n';
      el.textContent = output;
      li++;
      ci = 0;
      setTimeout(type, li < 4 ? 60 : 30);
    }
  }

  type();
})();

// ==================== TYPED EFFECT ====================
(function () {
  const phrases = ['Python Developer', 'AI Systems Builder', 'Ethical Hacker', 'Automation Engineer', 'Creative Thinker', 'Security Researcher'];
  let pi = 0, ci = 0, del = false;

  function go() {
    const el = document.getElementById('typed-el');
    if (!el) return;

    const p = phrases[pi];
    if (!del) {
      el.textContent = p.slice(0, ++ci);
      if (ci === p.length) {
        del = true;
        setTimeout(go, 2000);
        return;
      }
      setTimeout(go, 70);
    } else {
      el.textContent = p.slice(0, --ci);
      if (ci === 0) {
        del = false;
        pi = (pi + 1) % phrases.length;
        setTimeout(go, 300);
        return;
      }
      setTimeout(go, 35);
    }
  }

  go();
})();

// ==================== SCROLL REVEAL ====================
const srs = document.querySelectorAll('.sr');
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

srs.forEach((e) => obs.observe(e));

// ==================== SKILL BARS ====================
const skillObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.sk-fill').forEach((b) => {
        b.style.width = b.dataset.w + '%';
      });
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.skills-panel').forEach((p) => skillObs.observe(p));

// Animate active panel immediately if visible
setTimeout(() => {
  document.querySelectorAll('.skills-panel.active .sk-fill').forEach((b) => {
    b.style.width = b.dataset.w + '%';
  });
}, 100);

// ==================== SKILL TABS ====================
function switchTab(btn, id) {
  document.querySelectorAll('.s-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.skills-panel').forEach((p) => p.classList.remove('active'));
  btn.classList.add('active');

  const panel = document.getElementById(id);
  if (panel) {
    panel.classList.add('active');
    setTimeout(() => {
      panel.querySelectorAll('.sk-fill').forEach((b) => {
        b.style.width = b.dataset.w + '%';
      });
    }, 50);
  }
}

// ==================== FORM ====================
function formSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-execute');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span>✓ MESSAGE_SENT</span>';
  btn.style.background = 'var(--g2)';

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.style.background = '';
    e.target.reset();
  }, 3000);
}

// ==================== UPTIME ====================
(function () {
  let s = 0;
  setInterval(() => {
    s++;
    const h = String(Math.floor(s / 3600)).padStart(2, '0'),
      m = String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
      sec = String(s % 60).padStart(2, '0');
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
      uptimeEl.textContent = `${h}:${m}:${sec}`;
    }
  }, 1000);
})();

// ==================== CHAT ====================
const qnaData = [
  { q: "Who is Mahin?", a: "Mahin is a passionate learner, programmer, and creative thinker who blends technology with philosophy and art. He loves building systems, exploring cybersecurity, and expressing emotions through poetry." },
  { q: "What are Mahin's main skills?", a: "Mahin is skilled in Python programming, backend development, automation, ethical hacking basics, and AI integration. He also has experience in photography and creative writing." },
  { q: "What is Mahin currently working on?", a: "Mahin is working on multiple projects including an advanced Discord bot, AI systems, automation tools, and building structured data systems for large-scale storage and training." },
  { q: "What are Mahin's goals?", a: "Mahin wants to master AI, cybersecurity, and system building. He also aims to study abroad, build powerful tools, and create meaningful digital and creative work." },
  { q: "What kind of content does Mahin like to create?", a: "Mahin creates emotional poetry, thoughtful writings, and is interested in building impactful digital tools and visual content like photography." },
  { q: "What makes Mahin different from others?", a: "Mahin combines logic with emotion—he's both a technical builder and a deep thinker. He values meaning, depth, and authenticity in everything he does." },
  { q: "What is Mahin's learning style?", a: "Mahin prefers learning through understanding concepts, real examples, and practical application rather than memorizing syntax or theory." },
  { q: "What are Mahin's interests outside coding?", a: "Mahin enjoys philosophy, writing poetry, exploring human emotions, and capturing moments through photography." },
  { q: "What kind of AI assistant does Mahin want?", a: "Mahin wants an AI that feels real—emotionally intelligent, supportive, honest, and deeply connected, not robotic or surface-level." },
  { q: "What values are important to Mahin?", a: "Mahin values authenticity, emotional depth, personal growth, discipline, creativity, and staying aligned with his beliefs and faith." }
];

let chatQuestionsShown = false;

function toggleChat() {
  const w = document.getElementById('chat-window');
  if (w) {
    w.classList.toggle('open');
    if (w.classList.contains('open') && !chatQuestionsShown) {
      showChatQuestions();
      chatQuestionsShown = true;
    }
  }
}

function showChatQuestions() {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;

  // Clear default message
  msgs.innerHTML = '<div class="msg bot">Select a question below:</div>';

  // Add question buttons
  const qContainer = document.createElement('div');
  qContainer.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:8px 0;';

  qnaData.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:rgba(0,255,136,0.1);border:1px solid var(--g);color:var(--g);padding:6px 8px;border-radius:2px;font-size:0.7rem;text-align:left;cursor:pointer;font-family:"Share Tech Mono",monospace;transition:all 0.2s;';
    btn.textContent = (idx + 1) + '. ' + item.q;
    btn.onmouseover = () => btn.style.background = 'rgba(0,255,136,0.2)';
    btn.onmouseout = () => btn.style.background = 'rgba(0,255,136,0.1)';
    btn.onclick = () => answerQuestion(item.q, item.a);
    qContainer.appendChild(btn);
  });

  msgs.appendChild(qContainer);
  msgs.scrollTop = msgs.scrollHeight;
}

function answerQuestion(question, answer) {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;

  // Show user selected question
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.textContent = question;
  msgs.appendChild(userMsg);

  // Show answer after delay
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'msg bot';
    botMsg.textContent = answer;
    msgs.appendChild(botMsg);

    // Show "Ask another question?" option
    setTimeout(() => {
      const askMore = document.createElement('div');
      askMore.style.cssText = 'font-size:0.7rem;color:var(--g);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);';
      askMore.innerHTML = '<button onclick="showChatQuestions(); document.getElementById(\'chat-msgs\').innerHTML=\'\'; showChatQuestions();" style="background:rgba(0,255,136,0.1);border:1px solid var(--g);color:var(--g);padding:6px 12px;border-radius:2px;font-size:0.7rem;cursor:pointer;font-family:\'Share Tech Mono\',monospace;">Ask Another Question</button>';
      msgs.appendChild(askMore);
      msgs.scrollTop = msgs.scrollHeight;
    }, 500);

    msgs.scrollTop = msgs.scrollHeight;
  }, 400);
}

function addMsg(txt, who) {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;

  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = txt;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

// ==================== AUDIO BUTTON CONTROLS ====================
document.addEventListener('DOMContentLoaded', () => {
  const audioBtn = document.getElementById('audio-toggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', toggleMusic);
  }

  const muteBtn = document.querySelector('.notify-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', toggleMusic);
  }

  const closeNotifyBtn = document.querySelector('.notify-close');
  if (closeNotifyBtn) {
    closeNotifyBtn.addEventListener('click', closeNotification);
  }
});

// ==================== MOBILE OVERLAY ====================
function closeMobileMenu() {
  const overlay = document.getElementById('mobileOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function openMobileMenu() {
  const overlay = document.getElementById('mobileOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}
