'use client';

import { useState } from 'react';

// let achievements = JSON.parse(localStorage.getItem('achievements')||'[]');
let achievements: Array<any> = [];
let selectedCat = 'work';
let currentFilter = 'all';
let isRecording = false;
let recognition: any = null;
let timerInterval: any = null;
let recordStart: any = null;
let waveInterval: any = null;
let fullTranscript = '';

function save(){localStorage.setItem('achievements',JSON.stringify(achievements))}

// ── Pages ──
function showPage(p: string){
  ['record','inspect','export'].forEach((x,i)=>{
    document.getElementById('page-'+x)!.style.display=x===p?'block':'none';
    document.querySelectorAll('.tab-btn')[i].classList.toggle('active',x===p);
  });
  if(p==='inspect')renderList();
  if(p==='export')renderExportSummary();
}

// ── Mode toggle ──
function setMode(m: string){
  document.getElementById('type-mode')!.style.display=m==='type'?'block':'none';
  document.getElementById('voice-mode')!.style.display=m==='voice'?'block':'none';
  document.getElementById('mode-type')!.classList.toggle('active',m==='type');
  document.getElementById('mode-voice')!.classList.toggle('active',m==='voice');
}

// ── Type mode: save ──
// TODO: figure out the type of data
function saveAchievement(data: any){
  const a = data || {
    id:Date.now(),
    cat:selectedCat,
    // TODO: Property 'value' does not exist on type 'HTMLElement'.
    // maybe it's cool?
    title:(document.getElementById('f-title')! as HTMLInputElement).value.trim(),
    org:(document.getElementById('f-org')! as HTMLInputElement).value.trim(),
    date:(document.getElementById('f-date')! as HTMLInputElement).value.trim(),
    desc:(document.getElementById('f-desc')! as HTMLInputElement).value.trim()
  };
  if(!a.title){
    if(!data){document.getElementById('f-title')!.focus();document.getElementById('f-title')!.style.borderColor='#e24b4a';}
    return false;
  }
  achievements.unshift(a);
  save();
  if(!data){
    // TODO: Property 'value' does not exist on type 'HTMLElement'.
    ['f-title','f-org','f-date','f-desc'].forEach(id=>document.getElementById(id)!.innerText='');
    document.getElementById('f-title')!.style.borderColor='';
    const btn=document.getElementById('type-save-btn');
    btn!.textContent='Saved!';btn!.style.background='#0f6e56';
    setTimeout(()=>{btn!.textContent='Save achievement';btn!.style.background='';},1500);
  }
  return true;
}

// ── Voice recording ──
function toggleRecording(){
  if(isRecording) stopRecording();
  else startRecording();
}

function startRecording(){
  // TODO: implement speech stuff
  const SR = (window as any).SpeechRecognition || (window as any).WebkitSpeechRecognition;
  if(!SR){
    setVoiceStatus('Speech recognition not supported in this browser.','error');
    return;
  }
  fullTranscript = '';
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = ()=>{
    isRecording = true;
    document.getElementById('mic-btn')!.classList.add('recording');
    document.getElementById('mic-ring')!.classList.add('recording');
    document.getElementById('mic-icon')!.style.display='none';
    document.getElementById('stop-icon')!.style.display='block';
    setVoiceStatus('Recording…','recording');
    startTimer();
    startWave();
    document.getElementById('transcript-box')!.style.display='block';
    (document.getElementById('transcript-text')! as HTMLInputElement).value='';
  };

  // TODO: e should be SpeechRecognitionEvent
  recognition.onresult = (e: any)=>{
    let interim='';
    let final='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal) final+=e.results[i][0].transcript+' ';
      else interim+=e.results[i][0].transcript;
    }
    fullTranscript+=final;
    (document.getElementById('transcript-text')! as HTMLInputElement).value=(fullTranscript+interim).trim();
  };

  // TODO: e type
  recognition.onerror = (e: any)=>{
    stopRecording();
    setVoiceStatus('Mic error: '+e.error,'error');
  };

  recognition.onend = ()=>{
    if(isRecording) stopRecording();
  };

  recognition.start();
}

function stopRecording(){
  isRecording=false;
  if(recognition){try{recognition.stop();}catch(e){}}
  document.getElementById('mic-btn')!.classList.remove('recording');
  document.getElementById('mic-ring')!.classList.remove('recording');
  document.getElementById('mic-icon')!.style.display='block';
  document.getElementById('stop-icon')!.style.display='none';
  stopTimer();
  stopWave();
  const txt=document.getElementById('transcript-text')!.innerText.trim();
  if(txt){
    setVoiceStatus('Recording complete','');
  } else {
    setVoiceStatus('Tap to record','');
    document.getElementById('transcript-box')!.style.display='none';
  }
}

function setVoiceStatus(msg: string, cls: string){
  const el=document.getElementById('voice-status');
  el!.textContent=msg;
  el!.className='voice-status'+(cls?' '+cls:'');
}

function startTimer(){
  recordStart=Date.now();
  timerInterval=setInterval(()=>{
    const s=Math.floor((Date.now()-recordStart)/1000);
    const m=Math.floor(s/60);
    document.getElementById('voice-timer')!.textContent=`${m}:${String(s%60).padStart(2,'0')}`;
  },500);
}
function stopTimer(){
  clearInterval(timerInterval);
  document.getElementById('voice-timer')!.textContent='';
}

function startWave(){
  const bars=Array.from({length:12},(_,i)=>document.getElementById('wb'+i));
  waveInterval=setInterval(()=>{
    bars.forEach(b=>{
      const h=isRecording?(4+Math.random()*22).toFixed(0):4;
      b!.style.height=h+'px';
    });
  },80);
}
function stopWave(){
  clearInterval(waveInterval);
  Array.from({length:12},(_,i)=>document.getElementById('wb'+i)).forEach(b=>b!.style.height='4px');
}

function clearVoice(){
  fullTranscript='';
  document.getElementById('transcript-text')!.innerText='';
  document.getElementById('transcript-box')!.style.display='none';
  document.getElementById('parsed-preview')!.style.display='none';
  setVoiceStatus('Tap to record','');
}

async function parseTranscript(){
  const txt=document.getElementById('transcript-text')!.innerText.trim();
  if(!txt)return;
  const btn=document.getElementById('parse-btn');
  (btn! as HTMLButtonElement).disabled=true;btn!.textContent='Extracting…';

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:400,
        system:'You extract achievement info from spoken text and return ONLY a JSON object with keys: cat (one of: work, education, project, leadership, award, volunteer), title (concise 1-line title), org (organization or context, or ""), date (date or period, or ""), desc (details and impact, or ""). No markdown, no backticks, just raw JSON.',
        messages:[{role:'user',content:txt}]
      })
    });
    const data=await res.json();
    const raw=data.content.map((b: any)=>b!.text||'').join('').replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(raw);
    showParsedPreview(parsed);
  }catch(e){
    document.getElementById('parsed-preview')!.innerHTML=`<div style="font-size:13px;color:#a32d2d">Could not parse. Try editing the transcript manually.</div>`;
    document.getElementById('parsed-preview')!.style.display='block';
  }finally{
    (btn! as HTMLButtonElement).disabled=false;btn!.textContent='Extract with AI';
  }
}

// TODO: what is the type of p
function showParsedPreview(p: any){
  const catColors={work:'#eaf3de|#3b6d11',education:'#e6f1fb|#185fa5',project:'#faece7|#993c1d',leadership:'#fbeaf0|#993556',award:'#faeeda|#854f0b',volunteer:'#e1f5ee|#0f6e56'};
  // convert to Object first before subscripting
  const [bg,col]=(Object(catColors)[p.cat]||catColors.work).split('|');
  const el=document.getElementById('parsed-preview');
  el!.style.display='block';
  el!.innerHTML=`<div className="parsed-preview">
    <div className="pp-label">Extracted — review & save</div>
    <div className="pp-row"><span className="pp-key">Category</span><span className="pp-val" style="background:${bg};color:${col};padding:2px 10px;border-radius:12px;font-size:12px">${p.cat}</span></div>
    <div className="pp-row"><span className="pp-key">Title</span><span className="pp-val">${esc(p.title||'—')}</span></div>
    ${p.org?`<div className="pp-row"><span className="pp-key">Org</span><span className="pp-val">${esc(p.org)}</span></div>`:''}
    ${p.date?`<div className="pp-row"><span className="pp-key">Date</span><span className="pp-val">${esc(p.date)}</span></div>`:''}
    ${p.desc?`<div className="pp-row" style="align-items:flex-start"><span className="pp-key">Details</span><span className="pp-val" style="font-weight:400;color:#5f5e5a;line-height:1.5">${esc(p.desc)}</span></div>`:''}
    <button className="save-btn" style="margin-top:12px" onClick='confirmVoiceSave(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Save achievement</button>
  </div>`;
}

function confirmVoiceSave(p: any){
  const a={id:Date.now(),cat:p.cat||'work',title:p.title||'',org:p.org||'',date:p.date||'',desc:p.desc||''};
  if(!a.title)return;
  achievements.unshift(a);save();
  clearVoice();
  setVoiceStatus('Saved!','');
  setTimeout(()=>setVoiceStatus('Tap to record',''),1800);
}

// ── Inspect ──
const catColors={work:{bg:'#eaf3de',color:'#3b6d11'},education:{bg:'#e6f1fb',color:'#185fa5'},project:{bg:'#faece7',color:'#993c1d'},leadership:{bg:'#fbeaf0',color:'#993556'},award:{bg:'#faeeda',color:'#854f0b'},volunteer:{bg:'#e1f5ee',color:'#0f6e56'}};

function renderList(){
  // TODO: address
  const filtered=currentFilter==='all'?achievements:achievements.filter((a: any)=>a.cat===currentFilter);
  document.getElementById('count-label')!.textContent=`${filtered.length} of ${achievements.length}`;
  const el=document.getElementById('achievements-list');
  if(!filtered.length){el!.innerHTML=`<div className="empty">${achievements.length?'No achievements in this category.':'No achievements yet. Go to Record to add some.'}</div>`;return;}
  el!.innerHTML=filtered.map((a: any)=>{
    // TODO: address
    const c=Object(catColors)[a.cat]||catColors.work;
    return `<div className="achievement-card">
      <div className="ac-header">
        <span className="ac-tag" style="background:${c.bg};color:${c.color}">${a.cat}</span>
        <div className="ac-actions"><button className="icon-btn del" onClick="deleteAchievement(${a.id})">Delete</button></div>
      </div>
      <div className="ac-title">${esc(a.title)}</div>
      <div className="ac-meta">${[a.org,a.date].filter(Boolean).join(' · ')}</div>
      ${a.desc?`<div className="ac-desc">${esc(a.desc)}</div>`:''}
    </div>`;
  }).join('');
}

// TODO: reduce anys
function deleteAchievement(id: any){achievements=achievements.filter((a: any)=>a.id!==id);save();renderList();}
function setFilter(f: any,el: Element){currentFilter=f;document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderList();}
function esc(s: any){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── Export ──
function renderExportSummary(){
  const el=document.getElementById('export-summary');
  if(!achievements.length){el!.innerHTML='<p style="font-size:13px;color:#888780">No achievements recorded yet.</p>';return;}
  const cats={};achievements.forEach((a: any)=>{Object(cats)[a.cat]=(Object(cats)[a.cat]||0)+1;});
  el!.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px">
    <div className="summary-stat"><span>Total achievements</span><span>${achievements.length}</span></div>
    ${Object.entries(cats).map(([k,v])=>`<div className="summary-stat"><span style="text-transform:capitalize">${k}</span><span>${v}</span></div>`).join('')}
  </div>`;
}

async function generateResume(){
  if(!achievements.length){document.getElementById('export-status')!.innerHTML='<div className="status-box error">No achievements to generate from. Please record some first.</div>';return;}
  const btn=document.getElementById('gen-btn');
  (btn! as HTMLButtonElement).disabled=true;
  document.getElementById('export-status')!.innerHTML='<div className="status-box"><span className="progress-dot"></span>Sending to AI — this may take a moment...</div>';
  document.getElementById('ai-output-container')!.innerHTML='';
  // TODO: address
  const achievementText=achievements.map((a: any,i: number)=>`${i+1}. [${a.cat.toUpperCase()}] ${a.title}${a.org?' at '+a.org:''}${a.date?' ('+a.date+')':''}${a.desc?'\n   Details: '+a.desc:''}`).join('\n\n');

  const name=(document.getElementById('e-name')! as HTMLInputElement).value.trim();
  const email=(document.getElementById('e-email')! as HTMLInputElement).value.trim();
  const role=(document.getElementById('e-role')! as HTMLInputElement).value.trim();
  const loc=(document.getElementById('e-loc')! as HTMLInputElement).value.trim();
  const prompt=(document.getElementById('e-prompt')! as HTMLInputElement).value.trim();
  
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',max_tokens:1500,
        system:'You are a professional resume writer. Generate clean, well-structured resumes in plain text format.',
        messages:[{role:'user',content:`Generate a professional resume.\n\nCANDIDATE:\nName: ${name||'(not provided)'}\nEmail: ${email||'(not provided)'}\nTarget Role: ${role||'(not provided)'}\nLocation: ${loc||'(not provided)'}\n\nACHIEVEMENTS:\n${achievementText}\n\nINSTRUCTIONS:\n${prompt||'Generate a clean, professional resume with concise bullet points organized by category.'}`}]
      })
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const text=data.content.map((b: any)=>b.text||'').join('');
    document.getElementById('export-status')!.innerHTML='<div className="status-box success">Resume generated. Copy or print this page.</div>';
    document.getElementById('ai-output-container')!.innerHTML=`<div className="ai-output">${esc(text)}</div>`;
  }catch(e){
    document.getElementById('export-status')!.innerHTML=`<div className="status-box error">Error: ${esc((e! as Error).message)}</div>`;
  }finally{(btn as HTMLButtonElement).disabled=false;}
}

export default function Home() {
  const [selectedCat, setSelectedCat] = useState('work');
  

  return (
    <>
    <nav>
      <span className="logo">re<span>sume</span>.ai</span>
      <div className="nav-tabs">
        <button className="tab-btn active" onClick={()=>showPage('record')}>Record</button>
        <button className="tab-btn" onClick={()=>showPage('inspect')}>Inspect</button>
        <button className="tab-btn" onClick={()=>showPage('export')}>Export</button>
      </div>
    </nav>

    {/* RECORD PAGE*/}
    <main id="page-record">
      <h2>Record achievement</h2>
      <p className="subtitle">Type it in, or just speak — AI will fill in the form for you.</p>

      <div className="mode-toggle">
        <button className="mode-btn active" id="mode-type" onClick={()=>setMode('type')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Type
        </button>
        <button className="mode-btn" id="mode-voice" onClick={()=>setMode('voice')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/></svg>
          Voice
        </button>
      </div>

      { /* TYPE MODE */ } 
      <div id="type-mode">
        <div className="record-form">
          <div className="form-row">
            <label>Category</label>
            <div className="tag-row" id="cat-tags">
              <span className="tag work selected" data-cat="work">Work</span>
              <span className="tag education" data-cat="education">Education</span>
              <span className="tag project" data-cat="project">Project</span>
              <span className="tag leadership" data-cat="leadership">Leadership</span>
              <span className="tag award" data-cat="award">Award</span>
              <span className="tag volunteer" data-cat="volunteer">Volunteer</span>
            </div>
          </div>
          <div className="form-row">
            <label>Title <span style={{color: '#d85a30'}}>*</span></label>
            <input type="text" id="f-title" placeholder="e.g. Led migration to microservices architecture" />
          </div>
          <div className="form-grid">
            <div className="form-row" style={{margin:0}}><label>Organization / Context</label><input type="text" id="f-org" placeholder="e.g. Acme Corp, MIT" /></div>
            <div className="form-row" style={{margin:0}}><label>Date / Period</label><input type="text" id="f-date" placeholder="e.g. Jan 2024, 2022–2024" /></div>
          </div>
          <div className="form-row" style={{marginTop:'16px'}}>
            <label>Details & impact</label>
            <textarea id="f-desc" placeholder="What did you do, how, and what was the result? Numbers help — e.g. reduced latency by 40%."></textarea>
          </div>
          <button className="save-btn" id="type-save-btn" onClick={saveAchievement}>Save achievement</button>
        </div>
      </div>

      { /* VOICE MODE */ }
      <div id="voice-mode" style={{display:'none'}}>
        <div className="voice-panel">
          <p className="voice-hint">Speak naturally about your achievement — what you did, where, and the impact.</p>

          <div className="mic-ring" id="mic-ring">
            <div className="mic-ring-pulse p1"></div>
            <div className="mic-ring-pulse p2"></div>
            <button className="mic-btn" id="mic-btn" onClick={toggleRecording}>
              <svg id="mic-icon" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2">
                <path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>
              </svg>
              <svg id="stop-icon" width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{display:'none'}}>
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          </div>

          <div className="voice-status" id="voice-status">Tap to record</div>
          <div className="voice-timer" id="voice-timer"></div>

          <div className="waveform" id="waveform">
            <div className="waveform-bar" id="wb0" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb1" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb2" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb3" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb4" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb5" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb6" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb7" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb8" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb9" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb10" style={{height:"4px"}}></div>
            <div className="waveform-bar" id="wb11" style={{height:"4px"}}></div>
          </div>

          <div className="transcript-box" id="transcript-box" style={{display:"none"}}>
            <div className="transcript-label">Transcript</div>
            <textarea className="transcript-text" id="transcript-text" placeholder="Your speech will appear here..."></textarea>
            <div className="transcript-actions">
              <button className="outline-btn" onClick={clearVoice}>Clear</button>
              <button className="parse-btn" id="parse-btn" onClick={parseTranscript}>Extract with AI</button>
            </div>
            <div id="parsed-preview" style={{display:"none"}}></div>
          </div>
        </div>
      </div>
    </main>

    { /* INSPECT PAGE */ }
    <main id="page-inspect" style={{display:"none"}}>
      <div style={{display:"flex", alignItems:"baseline", gap:"12px", marginBottom:"4px"}}>
        <h2>Achievements</h2>
        <span className="section-count" id="count-label"></span>
      </div>
      <p className="subtitle">Browse and manage your recorded achievements.</p>
      <div className="filter-row">
        <span className="filter-chip active" data-filter="all" onClick={(e)=>setFilter('all',e.currentTarget)}>All</span>
        <span className="filter-chip" data-filter="work" onClick={(e)=>setFilter('work',e.currentTarget)}>Work</span>
        <span className="filter-chip" data-filter="education" onClick={(e)=>setFilter('education',e.currentTarget)}>Education</span>
        <span className="filter-chip" data-filter="project" onClick={(e)=>setFilter('project',e.currentTarget)}>Project</span>
        <span className="filter-chip" data-filter="leadership" onClick={(e)=>setFilter('leadership',e.currentTarget)}>Leadership</span>
        <span className="filter-chip" data-filter="award" onClick={(e)=>setFilter('award',e.currentTarget)}>Award</span>
        <span className="filter-chip" data-filter="volunteer" onClick={(e)=>setFilter('volunteer',e.currentTarget)}>Volunteer</span>
      </div>
      <div id="achievements-list"></div>
    </main>

    { /* EXPORT PAGE */ }
    <main id="page-export" style={{display:"none"}}>
      <h2>Export as resume</h2>
      <p className="subtitle">Fill in your profile, add any instructions, and let AI generate your resume.</p>
      <div className="export-card">
        <h3>Your profile</h3>
        <p>Basic information for the resume header.</p>
        <div className="profile-grid">
          <div className="form-row" style={{margin:0}}><label>Full name</label><input type="text" id="e-name" placeholder="Jane Doe"/></div>
          <div className="form-row" style={{margin:0}}><label>Email</label><input type="text" id="e-email" placeholder="jane@email.com"/></div>
          <div className="form-row" style={{margin:0}}><label>Target role</label><input type="text" id="e-role" placeholder="Senior Software Engineer"/></div>
          <div className="form-row" style={{margin:0}}><label>Location</label><input type="text" id="e-loc" placeholder="San Francisco, CA"/></div>
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
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Generate resume with AI
      </button>
      <div id="export-status"></div>
      <div id="ai-output-container"></div>
    </main>
    </>
  );
}
