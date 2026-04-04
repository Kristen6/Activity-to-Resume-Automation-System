'use client';

import { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

let achievements: Array<any> = [];
let selectedCat = 'work';
let currentFilter = 'all';
let isRecording = false;
let recognition: any = null;
let timerInterval: any = null;
let recordStart: any = null;
let waveInterval: any = null;
let fullTranscript = '';

// ── API helpers ──

function getToken(): string {
  return localStorage.getItem('token') || '';
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}

async function saveToBackend() {
  await apiFetch('/save', {
    method: 'POST',
    body: JSON.stringify({ achievements }),
  });
}

async function loadFromBackend() {
  const res = await apiFetch('/get');
  if (res.ok) {
    achievements = await res.json();
  }
}

// ── Pages ──
function showPage(p: string) {
  ['record', 'inspect', 'export'].forEach((x, i) => {
    document.getElementById('page-' + x)!.style.display = x === p ? 'block' : 'none';
    document.querySelectorAll('.tab-btn')[i].classList.toggle('active', x === p);
  });
  if (p === 'inspect') renderList();
  if (p === 'export') renderExportSummary();
}

// ── Mode toggle ──
function setMode(m: string) {
  document.getElementById('type-mode')!.style.display = m === 'type' ? 'block' : 'none';
  document.getElementById('voice-mode')!.style.display = m === 'voice' ? 'block' : 'none';
  document.getElementById('mode-type')!.classList.toggle('active', m === 'type');
  document.getElementById('mode-voice')!.classList.toggle('active', m === 'voice');
}

// ── Type mode: save ──
async function saveAchievement(data: any) {
  const a = data || {
    id: Date.now(),
    cat: selectedCat,
    title: (document.getElementById('f-title')! as HTMLInputElement).value.trim(),
    org: (document.getElementById('f-org')! as HTMLInputElement).value.trim(),
    date: (document.getElementById('f-date')! as HTMLInputElement).value.trim(),
    desc: (document.getElementById('f-desc')! as HTMLInputElement).value.trim(),
  };
  if (!a.title) {
    if (!data) {
      document.getElementById('f-title')!.focus();
      document.getElementById('f-title')!.style.borderColor = '#e24b4a';
    }
    return false;
  }
  achievements.unshift(a);
  await saveToBackend();
  if (!data) {
    ['f-title', 'f-org', 'f-date', 'f-desc'].forEach(
      (id) => ((document.getElementById(id)! as HTMLInputElement).value = '')
    );
    document.getElementById('f-title')!.style.borderColor = '';
    const btn = document.getElementById('type-save-btn');
    btn!.textContent = 'Saved!';
    btn!.style.background = '#0f6e56';
    setTimeout(() => { btn!.textContent = 'Save achievement'; btn!.style.background = ''; }, 1500);
  }
  return true;
}

// ── Voice recording ──
function toggleRecording() {
  if (isRecording) stopRecording();
  else startRecording();
}

function startRecording() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { setVoiceStatus('Speech recognition not supported in this browser.', 'error'); return; }
  fullTranscript = '';
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('mic-btn')!.classList.add('recording');
    document.getElementById('mic-ring')!.classList.add('recording');
    document.getElementById('mic-icon')!.style.display = 'none';
    document.getElementById('stop-icon')!.style.display = 'block';
    setVoiceStatus('Recording…', 'recording');
    startTimer(); startWave();
    document.getElementById('transcript-box')!.style.display = 'block';
    (document.getElementById('transcript-text')! as HTMLTextAreaElement).value = '';
  };

  recognition.onresult = (e: any) => {
    let interim = ''; let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    fullTranscript += final;
    (document.getElementById('transcript-text')! as HTMLTextAreaElement).value = (fullTranscript + interim).trim();
  };

  recognition.onerror = (e: any) => { stopRecording(); setVoiceStatus('Mic error: ' + e.error, 'error'); };
  recognition.onend = () => { if (isRecording) stopRecording(); };
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  if (recognition) { try { recognition.stop(); } catch (e) { } }
  document.getElementById('mic-btn')!.classList.remove('recording');
  document.getElementById('mic-ring')!.classList.remove('recording');
  document.getElementById('mic-icon')!.style.display = 'block';
  document.getElementById('stop-icon')!.style.display = 'none';
  stopTimer(); stopWave();
  const txt = (document.getElementById('transcript-text')! as HTMLTextAreaElement).value.trim();
  if (txt) setVoiceStatus('Recording complete', '');
  else { setVoiceStatus('Tap to record', ''); document.getElementById('transcript-box')!.style.display = 'none'; }
}

function setVoiceStatus(msg: string, cls: string) {
  const el = document.getElementById('voice-status');
  el!.textContent = msg;
  el!.className = 'voice-status' + (cls ? ' ' + cls : '');
}

function startTimer() {
  recordStart = Date.now();
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - recordStart) / 1000);
    const m = Math.floor(s / 60);
    document.getElementById('voice-timer')!.textContent = `${m}:${String(s % 60).padStart(2, '0')}`;
  }, 500);
}
function stopTimer() { clearInterval(timerInterval); document.getElementById('voice-timer')!.textContent = ''; }

function startWave() {
  const bars = Array.from({ length: 12 }, (_, i) => document.getElementById('wb' + i));
  waveInterval = setInterval(() => {
    bars.forEach(b => { const h = isRecording ? (4 + Math.random() * 22).toFixed(0) : 4; b!.style.height = h + 'px'; });
  }, 80);
}
function stopWave() {
  clearInterval(waveInterval);
  Array.from({ length: 12 }, (_, i) => document.getElementById('wb' + i)).forEach(b => b!.style.height = '4px');
}

function clearVoice() {
  fullTranscript = '';
  (document.getElementById('transcript-text')! as HTMLTextAreaElement).value = '';
  document.getElementById('transcript-box')!.style.display = 'none';
  document.getElementById('parsed-preview')!.style.display = 'none';
  setVoiceStatus('Tap to record', '');
}

async function parseTranscript() {
  const txt = (document.getElementById('transcript-text')! as HTMLTextAreaElement).value.trim();
  if (!txt) return;
  const btn = document.getElementById('parse-btn');
  (btn! as HTMLButtonElement).disabled = true; btn!.textContent = 'Extracting…';
  try {
    const res = await apiFetch('/parse', { method: 'POST', body: JSON.stringify({ text: txt }) });
    const data = await res.json();
    const raw = data.result.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    showParsedPreview(parsed);
  } catch (e) {
    document.getElementById('parsed-preview')!.innerHTML = `<div style="font-size:13px;color:#a32d2d">Could not parse. Try editing the transcript manually.</div>`;
    document.getElementById('parsed-preview')!.style.display = 'block';
  } finally {
    (btn! as HTMLButtonElement).disabled = false; btn!.textContent = 'Extract with AI';
  }
}

function showParsedPreview(p: any) {
  const catColors: any = { work: '#eaf3de|#3b6d11', education: '#e6f1fb|#185fa5', project: '#faece7|#993c1d', leadership: '#fbeaf0|#993556', award: '#faeeda|#854f0b', volunteer: '#e1f5ee|#0f6e56' };
  const [bg, col] = (catColors[p.cat] || catColors.work).split('|');
  const el = document.getElementById('parsed-preview');
  el!.style.display = 'block';
  el!.innerHTML = `<div class="parsed-preview">
    <div class="pp-label">Extracted — review & save</div>
    <div class="pp-row"><span class="pp-key">Category</span><span class="pp-val" style="background:${bg};color:${col};padding:2px 10px;border-radius:12px;font-size:12px">${p.cat}</span></div>
    <div class="pp-row"><span class="pp-key">Title</span><span class="pp-val">${esc(p.title || '—')}</span></div>
    ${p.org ? `<div class="pp-row"><span class="pp-key">Org</span><span class="pp-val">${esc(p.org)}</span></div>` : ''}
    ${p.date ? `<div class="pp-row"><span class="pp-key">Date</span><span class="pp-val">${esc(p.date)}</span></div>` : ''}
    ${p.desc ? `<div class="pp-row" style="align-items:flex-start"><span class="pp-key">Details</span><span class="pp-val" style="font-weight:400;color:#5f5e5a;line-height:1.5">${esc(p.desc)}</span></div>` : ''}
    <button class="save-btn" style="margin-top:12px" onclick='confirmVoiceSave(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Save achievement</button>
  </div>`;
}

async function confirmVoiceSave(p: any) {
  const a = { id: Date.now(), cat: p.cat || 'work', title: p.title || '', org: p.org || '', date: p.date || '', desc: p.desc || '' };
  if (!a.title) return;
  achievements.unshift(a);
  await saveToBackend();
  clearVoice();
  setVoiceStatus('Saved!', '');
  setTimeout(() => setVoiceStatus('Tap to record', ''), 1800);
}

// ── Inspect ──
const catColors: any = { work: { bg: '#eaf3de', color: '#3b6d11' }, education: { bg: '#e6f1fb', color: '#185fa5' }, project: { bg: '#faece7', color: '#993c1d' }, leadership: { bg: '#fbeaf0', color: '#993556' }, award: { bg: '#faeeda', color: '#854f0b' }, volunteer: { bg: '#e1f5ee', color: '#0f6e56' } };

function renderList() {
  const filtered = currentFilter === 'all' ? achievements : achievements.filter((a: any) => a.cat === currentFilter);
  document.getElementById('count-label')!.textContent = `${filtered.length} of ${achievements.length}`;
  const el = document.getElementById('achievements-list');
  if (!filtered.length) { el!.innerHTML = `<div class="empty">${achievements.length ? 'No achievements in this category.' : 'No achievements yet. Go to Record to add some.'}</div>`; return; }
  el!.innerHTML = filtered.map((a: any) => {
    const c = catColors[a.cat] || catColors.work;
    return `<div class="achievement-card">
      <div class="ac-header">
        <span class="ac-tag" style="background:${c.bg};color:${c.color}">${a.cat}</span>
        <div class="ac-actions"><button class="icon-btn del" onclick="deleteAchievement(${a.id})">Delete</button></div>
      </div>
      <div class="ac-title">${esc(a.title)}</div>
      <div class="ac-meta">${[a.org, a.date].filter(Boolean).join(' · ')}</div>
      ${a.desc ? `<div class="ac-desc">${esc(a.desc)}</div>` : ''}
    </div>`;
  }).join('');
}

async function deleteAchievement(id: any) {
  achievements = achievements.filter((a: any) => a.id !== id);
  await saveToBackend();
  renderList();
}

function setFilter(f: any, el: Element) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function esc(s: any) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ── Export ──
function renderExportSummary() {
  const el = document.getElementById('export-summary');
  if (!achievements.length) { el!.innerHTML = '<p style="font-size:13px;color:#888780">No achievements recorded yet.</p>'; return; }
  const cats: any = {};
  achievements.forEach((a: any) => { cats[a.cat] = (cats[a.cat] || 0) + 1; });
  el!.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">
    <div class="summary-stat"><span>Total achievements</span><span>${achievements.length}</span></div>
    ${Object.entries(cats).map(([k, v]) => `<div class="summary-stat"><span style="text-transform:capitalize">${k}</span><span>${v}</span></div>`).join('')}
  </div>`;
}

async function generateResume() {
  if (!achievements.length) { document.getElementById('export-status')!.innerHTML = '<div class="status-box error">No achievements to generate from. Please record some first.</div>'; return; }
  const btn = document.getElementById('gen-btn');
  (btn! as HTMLButtonElement).disabled = true;
  document.getElementById('export-status')!.innerHTML = '<div class="status-box"><span class="progress-dot"></span>Sending to AI — this may take a moment...</div>';
  document.getElementById('ai-output-container')!.innerHTML = '';
  try {
    const res = await apiFetch('/gen', {
      method: 'POST',
      body: JSON.stringify({
        achievements,
        name: (document.getElementById('e-name')! as HTMLInputElement).value.trim(),
        email: (document.getElementById('e-email')! as HTMLInputElement).value.trim(),
        role: (document.getElementById('e-role')! as HTMLInputElement).value.trim(),
        location: (document.getElementById('e-loc')! as HTMLInputElement).value.trim(),
        prompt: (document.getElementById('e-prompt')! as HTMLTextAreaElement).value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Server error');
    document.getElementById('export-status')!.innerHTML = '<div class="status-box success">Resume generated. Copy or print this page.</div>';
    document.getElementById('ai-output-container')!.innerHTML = `<div class="ai-output">${esc(data.resume)}</div>`;
  } catch (e) {
    document.getElementById('export-status')!.innerHTML = `<div class="status-box error">Error: ${esc((e! as Error).message)}</div>`;
  } finally {
    (btn as HTMLButtonElement).disabled = false;
  }
}

// ── Make functions accessible from inline HTML ──
if (typeof window !== 'undefined') {
  (window as any).deleteAchievement = deleteAchievement;
  (window as any).confirmVoiceSave = confirmVoiceSave;
  (window as any).setFilter = setFilter;
}

// ── Root component ──
export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [selectedCatState, setSelectedCatState] = useState('work');

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('username');
    if (t) { setToken(t); setCurrentUser(u || ''); }
  }, []);

  useEffect(() => {
    if (token) {
      loadFromBackend().then(() => {
        const page = document.getElementById('page-record');
        if (page) renderList();
      });
    }
  }, [token]);

  async function handleAuth() {
    setAuthLoading(true); setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.detail || 'Something went wrong'); return; }
      if (authMode === 'register') {
        setAuthMode('login');
        setAuthError('');
        setUsername(''); setPassword('');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      setToken(data.token);
      setCurrentUser(username);
    } catch (e) {
      setAuthError('Network error — is the backend running?');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    achievements = [];
    setToken(null);
    setCurrentUser('');
  }

  function handleCatSelect(cat: string) {
    selectedCat = cat;
    setSelectedCatState(cat);
  }

  // ── Auth page ──
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#1a1917' }}>re<span style={{ color: '#2d6a4f' }}>sume</span>.ai</span>
            <p style={{ marginTop: '8px', color: '#888780', fontSize: '14px' }}>
              {authMode === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#5f5e5a', display: 'block', marginBottom: '4px' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="your username"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e4e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#5f5e5a', display: 'block', marginBottom: '4px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder="••••••••"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e4e0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            {authError && <p style={{ color: '#a32d2d', fontSize: '13px', margin: 0 }}>{authError}</p>}
            <button
              onClick={handleAuth}
              disabled={authLoading}
              style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
            >
              {authLoading ? '...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888780' }}>
            {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              style={{ color: '#2d6a4f', cursor: 'pointer', fontWeight: 600 }}
            >
              {authMode === 'login' ? 'Register' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Main app ──
  return (
    <>
      <nav>
        <span className="logo">re<span>sume</span>.ai</span>
        <div className="nav-tabs">
          <button className="tab-btn active" onClick={() => showPage('record')}>Record</button>
          <button className="tab-btn" onClick={() => showPage('inspect')}>Inspect</button>
          <button className="tab-btn" onClick={() => showPage('export')}>Export</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#888780' }}>{currentUser}</span>
          <button
            onClick={handleLogout}
            style={{ fontSize: '13px', color: '#5f5e5a', background: 'none', border: '1px solid #e5e4e0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </nav>

      {/* RECORD PAGE */}
      <main id="page-record">
        <h2>Record achievement</h2>
        <p className="subtitle">Type it in, or just speak — AI will fill in the form for you.</p>

        <div className="mode-toggle">
          <button className="mode-btn active" id="mode-type" onClick={() => setMode('type')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Type
          </button>
          <button className="mode-btn" id="mode-voice" onClick={() => setMode('voice')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" /></svg>
            Voice
          </button>
        </div>

        {/* TYPE MODE */}
        <div id="type-mode">
          <div className="record-form">
            <div className="form-row">
              <label>Category</label>
              <div className="tag-row" id="cat-tags">
                {['work', 'education', 'project', 'leadership', 'award', 'volunteer'].map(cat => (
                  <span key={cat} className={`tag ${cat} ${selectedCatState === cat ? 'selected' : ''}`} onClick={() => handleCatSelect(cat)}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label>Title <span style={{ color: '#d85a30' }}>*</span></label>
              <input type="text" id="f-title" placeholder="e.g. Led migration to microservices architecture" />
            </div>
            <div className="form-grid">
              <div className="form-row" style={{ margin: 0 }}><label>Organization / Context</label><input type="text" id="f-org" placeholder="e.g. Acme Corp, MIT" /></div>
              <div className="form-row" style={{ margin: 0 }}><label>Date / Period</label><input type="text" id="f-date" placeholder="e.g. Jan 2024, 2022–2024" /></div>
            </div>
            <div className="form-row" style={{ marginTop: '16px' }}>
              <label>Details & impact</label>
              <textarea id="f-desc" placeholder="What did you do, how, and what was the result? Numbers help — e.g. reduced latency by 40%."></textarea>
            </div>
            <button className="save-btn" id="type-save-btn" onClick={() => saveAchievement(null)}>Save achievement</button>
          </div>
        </div>

        {/* VOICE MODE */}
        <div id="voice-mode" style={{ display: 'none' }}>
          <div className="voice-panel">
            <p className="voice-hint">Speak naturally about your achievement — what you did, where, and the impact.</p>
            <div className="mic-ring" id="mic-ring">
              <div className="mic-ring-pulse p1"></div>
              <div className="mic-ring-pulse p2"></div>
              <button className="mic-btn" id="mic-btn" onClick={toggleRecording}>
                <svg id="mic-icon" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                  <path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                </svg>
                <svg id="stop-icon" width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{ display: 'none' }}>
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
            <div className="voice-status" id="voice-status">Tap to record</div>
            <div className="voice-timer" id="voice-timer"></div>
            <div className="waveform" id="waveform">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="waveform-bar" id={`wb${i}`} style={{ height: '4px' }}></div>
              ))}
            </div>
            <div className="transcript-box" id="transcript-box" style={{ display: 'none' }}>
              <div className="transcript-label">Transcript</div>
              <textarea className="transcript-text" id="transcript-text" placeholder="Your speech will appear here..."></textarea>
              <div className="transcript-actions">
                <button className="outline-btn" onClick={clearVoice}>Clear</button>
                <button className="parse-btn" id="parse-btn" onClick={parseTranscript}>Extract with AI</button>
              </div>
              <div id="parsed-preview" style={{ display: 'none' }}></div>
            </div>
          </div>
        </div>
      </main>

      {/* INSPECT PAGE */}
      <main id="page-inspect" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
          <h2>Achievements</h2>
          <span className="section-count" id="count-label"></span>
        </div>
        <p className="subtitle">Browse and manage your recorded achievements.</p>
        <div className="filter-row">
          {[['all', 'All'], ['work', 'Work'], ['education', 'Education'], ['project', 'Project'], ['leadership', 'Leadership'], ['award', 'Award'], ['volunteer', 'Volunteer']].map(([f, label]) => (
            <span key={f} className={`filter-chip ${f === 'all' ? 'active' : ''}`} onClick={(e) => setFilter(f, e.currentTarget)}>{label}</span>
          ))}
        </div>
        <div id="achievements-list"></div>
      </main>

      {/* EXPORT PAGE */}
      <main id="page-export" style={{ display: 'none' }}>
        <h2>Export as resume</h2>
        <p className="subtitle">Fill in your profile, add any instructions, and let AI generate your resume.</p>
        <div className="export-card">
          <h3>Your profile</h3>
          <p>Basic information for the resume header.</p>
          <div className="profile-grid">
            <div className="form-row" style={{ margin: 0 }}><label>Full name</label><input type="text" id="e-name" placeholder="Jane Doe" /></div>
            <div className="form-row" style={{ margin: 0 }}><label>Email</label><input type="text" id="e-email" placeholder="jane@email.com" /></div>
            <div className="form-row" style={{ margin: 0 }}><label>Target role</label><input type="text" id="e-role" placeholder="Senior Software Engineer" /></div>
            <div className="form-row" style={{ margin: 0 }}><label>Location</label><input type="text" id="e-loc" placeholder="San Francisco, CA" /></div>
          </div>
        </div>
        <div className="export-card">
          <h3>Special instructions</h3>
          <p>Tailor the resume — paste a job description, set tone, length, or emphasis.</p>
          <textarea className="prompt-area" id="e-prompt" placeholder="e.g. This is for a senior backend role at a fintech startup. Emphasize leadership and system design. Keep it to one page with concise bullet points."></textarea>
        </div>
        <div className="export-card">
          <h3>Achievements summary</h3>
          <div id="export-summary"></div>
        </div>
        <button className="export-btn" id="gen-btn" onClick={generateResume}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Generate resume with AI
        </button>
        <div id="export-status"></div>
        <div id="ai-output-container"></div>
      </main>
    </>
  );
}
