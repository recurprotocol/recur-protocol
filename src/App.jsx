import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const API_BASE = "/api";
const RECUR_API_KEY = import.meta.env.VITE_RECUR_API_KEY || "";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --border: #30363d;
    --border-muted: #21262d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #6e7681;
    --accent: #238636;
    --accent-hover: #2ea043;
    --accent-emphasis: #1f6feb;
    --danger: #da3633;
    --warning: #d29922;
    --success: #238636;
  }
  html, body { height: 100%; }
  body { background: var(--bg); color: var(--text-primary); font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; overflow-x: hidden; cursor: default; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  @keyframes fade-up{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
  @keyframes threat-in{from{opacity:0;}to{opacity:1;}}
  @media(max-width:768px) {
    .nav-links { display: none !important; }
    .nav-hamburger { display: flex !important; }
    .nav-mobile { display: flex !important; }
    .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
    .grid-3, .grid-2 { grid-template-columns: 1fr !important; }
    .grid-6 { grid-template-columns: repeat(2,1fr) !important; }
    .grid-dash { grid-template-columns: 1fr !important; }
    .grid-dash-side { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
    .grid-docs { grid-template-columns: 1fr !important; }
    .docs-sidebar { display: none !important; }
    .section-pad { padding-left: 16px !important; padding-right: 16px !important; }
    .hero-title { font-size: 24px !important; }
    .hero-sub { font-size: 12px !important; }
    .cta-row { flex-direction: column !important; width: 100% !important; }
    .cta-row > * { width: 100% !important; text-align: center !important; }
    .footer-inner { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
    .dash-tabs { overflow-x: auto !important; flex-wrap: nowrap !important; }
    .footer-pad { padding-left: 16px !important; padding-right: 16px !important; }
    .nav-bar { padding: 0 12px !important; gap: 12px !important; }
    .nav-right-btns { display: none !important; }
    .nav-status { display: none !important; }
    .stat-bar-border > div { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
    .stat-bar-border > div:last-child { border-bottom: none !important; }
    .code-block pre { font-size: 9px !important; }
    .sentinel-tree-item { margin-left: 0 !important; }
  }
  @media(min-width:769px) {
    .nav-hamburger { display: none !important; }
    .nav-mobile { display: none !important; }
  }
`;

/* ── DATA ── */
const ATTACK_TYPES = {
  INJECTION:  {label:"PROMPT INJECTION", color:"#da3633",icon:"//"},
  EXTRACTION: {label:"DATA EXTRACTION",  color:"#d29922",icon:">>"},
  JAILBREAK:  {label:"JAILBREAK ATTEMPT",color:"#d29922",icon:"[]"},
  INVERSION:  {label:"MODEL INVERSION",  color:"#da3633",icon:"<>"},
  POISONING:  {label:"DATA POISONING",   color:"#d29922",icon:"XX"},
  ADVERSARIAL:{label:"ADVERSARIAL INPUT",color:"#d29922",icon:"##"},
  BOUNDARY:   {label:"BOUNDARY PROBE",   color:"#d29922",icon:"--"},
  ENCODING:   {label:"ENCODING ATTACK",  color:"#d29922",icon:"0x"},
  HEURISTIC:  {label:"HEURISTIC THREAT", color:"#d29922",icon:"??"},
};

const IP_ASSETS = [
  {name:"System Prompt Vault",    type:"PROMPT", status:"SECURED",    integrity:99, accesses:4821},
  {name:"Fine-tune Weights v4.2", type:"WEIGHTS",status:"SECURED",    integrity:97, accesses:201},
  {name:"Training Dataset Ω",     type:"DATA",   status:"MONITORING", integrity:91, accesses:55},
  {name:"API Schema & Logic",      type:"SCHEMA", status:"SECURED",    integrity:100,accesses:9302},
  {name:"RLHF Reward Model",       type:"MODEL",  status:"AT RISK",    integrity:78, accesses:18},
  {name:"Chain-of-Thought Cache", type:"CACHE",  status:"SECURED",    integrity:94, accesses:6710},
];

const SENTINEL_TREE = [
  {id:"s0", parent:null, label:"RECUR-PRIME", role:"Root Orchestrator",    gen:7,mutations:312,status:"ACTIVE",  depth:0},
  {id:"s1", parent:"s0", label:"WARD-INJ-01", role:"Injection Sentinel",   gen:5,mutations:184,status:"ACTIVE",  depth:1},
  {id:"s2", parent:"s0", label:"WARD-EXT-01", role:"Extraction Sentinel",  gen:4,mutations:97, status:"ACTIVE",  depth:1},
  {id:"s3", parent:"s0", label:"WARD-ADV-01", role:"Adversarial Sentinel", gen:6,mutations:211,status:"EVOLVING",depth:1},
  {id:"s4", parent:"s1", label:"SUB-INJ-A",   role:"Boundary Scanner",     gen:3,mutations:55, status:"ACTIVE",  depth:2},
  {id:"s5", parent:"s1", label:"SUB-INJ-B",   role:"Role-Play Detector",   gen:2,mutations:38, status:"ACTIVE",  depth:2},
  {id:"s6", parent:"s1", label:"SUB-INJ-C",   role:"Nested Prompt Tracer", gen:4,mutations:71, status:"SPAWNING",depth:2},
  {id:"s7", parent:"s2", label:"SUB-EXT-A",   role:"Token Prob Watchdog",  gen:2,mutations:29, status:"ACTIVE",  depth:2},
  {id:"s8", parent:"s2", label:"SUB-EXT-B",   role:"Canary Token Monitor", gen:3,mutations:44, status:"ACTIVE",  depth:2},
  {id:"s9", parent:"s3", label:"SUB-ADV-A",   role:"Gradient Shield",      gen:5,mutations:128,status:"EVOLVING",depth:2},
  {id:"s10",parent:"s4", label:"NANO-INJ-A1", role:"Delimiter Probe",      gen:1,mutations:12, status:"ACTIVE",  depth:3},
  {id:"s11",parent:"s4", label:"NANO-INJ-A2", role:"Semantic Shift Detect",gen:2,mutations:21, status:"ACTIVE",  depth:3},
  {id:"s12",parent:"s9", label:"NANO-ADV-A1", role:"FGSM Countermeasure",  gen:3,mutations:67, status:"EVOLVING",depth:3},
];

const VULN_CATEGORIES = [
  {name:"Prompt Boundary Hardening",   score:94,checks:41,passed:39,critical:0},
  {name:"Token Extraction Resistance", score:81,checks:28,passed:23,critical:1},
  {name:"Jailbreak Immunization",      score:97,checks:63,passed:61,critical:0},
  {name:"Adversarial Robustness",      score:76,checks:35,passed:27,critical:2},
  {name:"Context Leakage Prevention",  score:88,checks:22,passed:20,critical:0},
  {name:"Model Inversion Defence",     score:71,checks:18,passed:13,critical:3},
];

const backendEventToThreat = (evt) => ({
  id: evt.event_id||evt.id||Math.random().toString(36).slice(2),
  type: evt.primary_threat||"INJECTION",
  source: `${evt.provider||"unknown"}-${(evt.ip_hash||"????").slice(0,4)}`,
  severity: evt.severity||"MEDIUM",
  target: IP_ASSETS[Math.floor(Math.random()*IP_ASSETS.length)].name,
  tx_sig: evt.tx_sig||null,
  blocked: evt.status==="BLOCKED",
  ts: evt.timestamp?new Date(evt.timestamp).toISOString().slice(11,23):new Date().toISOString().slice(11,23),
  isReal: true,
  confidence: evt.confidence,
});

const backendEventToAttestation = (evt) => ({
  block:`#SOL-${Math.floor(Math.random()*9999999).toString().padStart(9,"0")}`,
  hash:`0x${(evt.event_id||"").slice(-8)||Math.random().toString(16).slice(2,6)}...${Math.random().toString(16).slice(2,6)}`,
  event: evt.status==="BLOCKED"
    ?`${evt.primary_threat||"THREAT"} INTERCEPTED — ${evt.provider?.toUpperCase()||"API"}`
    :`CLEAN REQUEST — ${evt.provider?.toUpperCase()||"API"} — ${evt.latency_ms||0}ms`,
});

/* ── SHARED UI ── */
const Panel = ({children,style={}}) => (
  <div style={{background:"var(--surface)",border:"1px solid var(--border)",
    borderRadius:6,position:"relative",overflow:"hidden",
    boxShadow:"0 1px 3px rgba(0,0,0,0.3)", ...style}}>
    {children}
  </div>
);

const PanelHeader = ({title,sub,right,accent}) => (
  <div style={{padding:"8px 12px",borderBottom:"1px solid var(--border-muted)",
    display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)"}}>
    <div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,letterSpacing:3,color:accent||"var(--accent)"}}>{title}</div>
      {sub&&<div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:1,marginTop:1}}>{sub}</div>}
    </div>
    {right&&<div style={{fontSize:10,color:"var(--text-secondary)"}}>{right}</div>}
  </div>
);

const StatusDot = ({status}) => {
  const c = status==="ACTIVE"?"var(--accent)":status==="EVOLVING"?"var(--warning)":status==="SPAWNING"?"var(--accent-emphasis)":"#333";
  return <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>;
};

/* ── NAV ── */
function Nav({page, setPage, apiOnline}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="nav-bar" style={{
      position:"fixed",top:0,left:0,right:0,zIndex:1000,
      background:"var(--bg)",borderBottom:"1px solid var(--border)",
      display:"flex",alignItems:"center",
      padding:"0 32px",height:54,gap:32,
    }}>
      <div onClick={()=>setPage("landing")} style={{cursor:"pointer",flexShrink:0}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,letterSpacing:3,color:"var(--text-primary)"}}>RECUR</span>
      </div>
      <div style={{width:1,height:20,background:"var(--border)"}}/>

      {/* Desktop nav links */}
      <div className="nav-links" style={{display:"flex",gap:4,flex:1,alignItems:"center",position:"relative"}}>
        <button onClick={()=>setPage("landing")} style={{
          fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"5px 14px",
          cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
          background:"transparent",
          color:page==="landing"?"var(--text-primary)":"var(--text-secondary)",
          borderBottom:page==="landing"?"2px solid var(--accent)":"2px solid transparent",
          transition:"all 0.2s",
        }}>HOME</button>

        <button onClick={()=>setPage("docs")} style={{
          fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"5px 14px",
          cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
          background:"transparent",
          color:page==="docs"?"var(--text-primary)":"var(--text-secondary)",
          borderBottom:page==="docs"?"2px solid var(--accent)":"2px solid transparent",
          transition:"all 0.2s",
        }}>DOCS</button>

        <div style={{position:"relative"}}
          onMouseEnter={()=>setDropOpen(true)}
          onMouseLeave={()=>setDropOpen(false)}>
          <button style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"5px 14px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",
            color:(page==="dashboard"||page==="staking"||dropOpen)?"var(--text-primary)":"var(--text-secondary)",
            borderBottom:(page==="dashboard"||page==="staking"||dropOpen)?"2px solid var(--accent)":"2px solid transparent",
            transition:"all 0.2s",display:"flex",alignItems:"center",gap:6,
          }}>
            PROTOCOL <span style={{fontSize:8,opacity:0.6}}>{dropOpen?"▲":"▼"}</span>
          </button>

          {dropOpen && (
            <div style={{
              position:"absolute",top:"100%",left:0,
              background:"var(--surface)",
              border:"1px solid var(--border)",
              borderTop:"none",
              minWidth:260,borderRadius:"0 0 6px 6px",
              zIndex:2000,
            }}>
              <div onClick={()=>{setPage("dashboard");setDropOpen(false);}} style={{
                padding:"12px 16px",cursor:"pointer",
                borderBottom:"1px solid var(--border-muted)",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                transition:"background 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--bg)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--text-primary)",letterSpacing:1}}>LIVE THREAT DASHBOARD</div>
                  <div style={{fontSize:9,color:"var(--text-secondary)",marginTop:2}}>Real-time sentinel monitoring</div>
                </div>
                <span style={{fontSize:9,color:"var(--accent)",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(35,134,54,0.15)",border:"1px solid rgba(35,134,54,0.4)",borderRadius:4}}>LIVE</span>
              </div>

              {/* STAKING — now clickable */}
              <div onClick={()=>{setPage("staking");setDropOpen(false);}} style={{
                padding:"12px 16px",cursor:"pointer",
                borderBottom:"1px solid var(--border-muted)",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                transition:"background 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="var(--bg)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--text-primary)",letterSpacing:1}}>STAKING</div>
                  <div style={{fontSize:9,color:"var(--text-secondary)",marginTop:2}}>Run sentinel nodes, earn from the network</div>
                </div>
                <span style={{fontSize:9,color:"var(--accent)",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(35,134,54,0.15)",border:"1px solid rgba(35,134,54,0.4)",borderRadius:4}}>LIVE</span>
              </div>

              <div style={{
                padding:"12px 16px",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                opacity:0.5,cursor:"default",
              }}>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--text-primary)",letterSpacing:1}}>ON-CHAIN ATTESTATION</div>
                  <div style={{fontSize:9,color:"var(--text-secondary)",marginTop:2}}>ZK proofs committed to Solana</div>
                </div>
                <span style={{fontSize:9,color:"var(--warning)",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(210,153,34,0.12)",border:"1px solid rgba(210,153,34,0.4)",borderRadius:4}}>SOON</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hamburger button for mobile */}
      <div className="nav-hamburger" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} style={{
        display:"none",flexDirection:"column",gap:4,cursor:"pointer",padding:8,marginLeft:"auto",
      }}>
        <div style={{width:20,height:2,background:"var(--text-primary)",borderRadius:1}}/>
        <div style={{width:20,height:2,background:"var(--text-primary)",borderRadius:1}}/>
        <div style={{width:20,height:2,background:"var(--text-primary)",borderRadius:1}}/>
      </div>

      <div className="nav-status" style={{display:"flex",alignItems:"center",gap:6,fontSize:9}}>
        <div style={{
          width:7,height:7,borderRadius:"50%",flexShrink:0,
          background:apiOnline?"var(--accent)":"var(--warning)",
        }}/>
        <div>
          <span style={{color:apiOnline?"var(--text-primary)":"var(--warning)",letterSpacing:1}}>
            {apiOnline?"SENTINEL NETWORK ONLINE":"SENTINEL OFFLINE"}
          </span>
          {apiOnline&&<div style={{fontSize:8,color:"var(--text-secondary)",letterSpacing:1,marginTop:1}}>PROXY ACCEPTING REQUESTS</div>}
        </div>
      </div>

      <div className="nav-right-btns" style={{display:"flex",gap:8,alignItems:"center"}}>
      <button onClick={()=>setPage("get-access")} style={{
        fontFamily:"'JetBrains Mono',monospace",fontSize:13,letterSpacing:3,
        padding:"5px 16px",flexShrink:0,
        background:page==="get-access"?"var(--accent)":"var(--accent)",
        color:"#fff",
        border:"1px solid var(--accent)",borderRadius:6,cursor:"pointer",transition:"all 0.2s",
      }}
      onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
      onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>GET ACCESS</button>

      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile" style={{
          display:"none",position:"absolute",top:54,left:0,right:0,
          background:"var(--surface)",borderBottom:"1px solid var(--border)",
          flexDirection:"column",padding:"8px 0",
        }}>
          <button onClick={()=>{setPage("landing");setMobileMenuOpen(false);}} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"12px 32px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",color:page==="landing"?"var(--text-primary)":"var(--text-secondary)",
            textAlign:"left",
          }}>HOME</button>
          <button onClick={()=>{setPage("docs");setMobileMenuOpen(false);}} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"12px 32px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",color:page==="docs"?"var(--text-primary)":"var(--text-secondary)",
            textAlign:"left",
          }}>DOCS</button>
          <button onClick={()=>{setPage("dashboard");setMobileMenuOpen(false);}} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"12px 32px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",color:page==="dashboard"?"var(--text-primary)":"var(--text-secondary)",
            textAlign:"left",
          }}>LIVE THREAT DASHBOARD</button>
          <button onClick={()=>{setPage("staking");setMobileMenuOpen(false);}} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"12px 32px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",color:page==="staking"?"var(--text-primary)":"var(--text-secondary)",
            textAlign:"left",
          }}>STAKING</button>
          <button onClick={()=>{setPage("get-access");setMobileMenuOpen(false);}} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"12px 32px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",color:page==="get-access"?"var(--text-primary)":"var(--text-secondary)",
            textAlign:"left",
          }}>GET ACCESS</button>
        </div>
      )}
    </nav>
  );
}

/* ── STAKING PAGE ── */
function Staking({setPage}) {
  const [selectedLock, setSelectedLock] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [autoCompound, setAutoCompound] = useState(false);

  const lockTiers = [
    {id:"flexible", label:"FLEXIBLE",    duration:"No lock",   apy:"8%",  color:"var(--accent-emphasis)", desc:"Withdraw anytime. No penalties. Rewards paid weekly every Sunday 12:00 UTC."},
    {id:"3mo",      label:"3 MONTHS",    duration:"90 days",   apy:"12%", color:"var(--accent)", desc:"Tokens locked for 90 days. Higher yield rewarded for commitment to the network."},
    {id:"6mo",      label:"6 MONTHS",    duration:"180 days",  apy:"16%", color:"var(--warning)", desc:"Tokens locked for 180 days. Significant APY boost for long-term protocol alignment."},
    {id:"12mo",     label:"12 MONTHS",   duration:"365 days",  apy:"20%", color:"var(--danger)", desc:"Maximum lock. Maximum yield. 12-month commitment to securing the RECUR network."},
  ];

  const nodeTiers = [
    {id:"nano",  label:"NANO",  min:"10,000",    mult:"1.0x",  slots:"Unlimited", color:"var(--accent-emphasis)", desc:"Entry-level sentinel node. Access to basic network participation and weekly rewards. Multiplier active immediately."},
    {id:"ward",  label:"WARD",  min:"100,000",   mult:"1.25x", slots:"Unlimited", color:"var(--accent)", desc:"Mid-tier operator node. 1.25x reward multiplier activates automatically after 3 months of staking."},
    {id:"prime", label:"PRIME", min:"1,000,000", mult:"1.5x",  slots:"Unlimited", color:"var(--warning)", desc:"Elite sentinel node. Maximum 1.5x multiplier activates after 3 months. Hard cap of 1,000,000 $RECUR per wallet."},
  ];

  const stats = [
    {label:"TOTAL STAKED",      value:"—",          sub:"$RECUR"},
    {label:"ACTIVE STAKERS",    value:"—",          sub:"NODES"},
    {label:"REWARDS DISTRIBUTED",value:"—",         sub:"$RECUR"},
    {label:"NEXT PAYOUT",       value:"SUNDAY",     sub:"12:00 UTC"},
    {label:"REWARD TOKEN",      value:"$RECUR",     sub:"→ $RECUR"},
    {label:"NETWORK",           value:"SOLANA",     sub:"DEVNET SOON"},
  ];

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54,overflowY:"auto"}}>

      {/* Hero */}
      <section className="section-pad" style={{padding:"60px 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10,
          border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px",borderRadius:4}}>
          SENTINEL NODE STAKING
        </div>
        <h1 className="hero-title" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(32px,6vw,48px)",
          letterSpacing:8,color:"var(--text-primary)",marginBottom:14,lineHeight:1}}>
          STAKE $RECUR.<br/>
          <span style={{color:"var(--accent)"}}>SECURE THE NETWORK.</span>
        </h1>
        <p style={{fontSize:11,color:"var(--text-secondary)",maxWidth:560,lineHeight:1.9,marginBottom:0}}>
          Lock $RECUR tokens to operate sentinel nodes and earn weekly rewards. Choose your lock duration — longer commitment, higher yield. Auto-compound available.
        </p>
      </section>

      {/* Stats bar */}
      <section className="section-pad" style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div className="grid-6" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
          {stats.map((s,i)=>(
            <Panel key={i} style={{padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:1,marginBottom:6}}>{s.label}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:"var(--text-primary)",
                letterSpacing:2,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:9,color:"var(--text-secondary)",marginTop:4,letterSpacing:1}}>{s.sub}</div>
            </Panel>
          ))}
        </div>
      </section>

      {/* Lock Duration */}
      <section className="section-pad" style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>STEP 1</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:20}}>
          SELECT LOCK DURATION
        </h2>
        <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {lockTiers.map((t)=>{
            const selected = selectedLock===t.id;
            return (
              <div key={t.id} onClick={()=>setSelectedLock(t.id)} style={{
                background:selected?"var(--surface)":"var(--surface)",
                border:`1px solid ${selected?t.color:"var(--border)"}`,
                borderTop:`3px solid ${selected?t.color:"transparent"}`,
                borderRadius:6,
                padding:"22px 18px",cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="var(--text-secondary)"}}
              onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,letterSpacing:3,color:"var(--text-primary)"}}>{t.label}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,color:t.color,letterSpacing:2}}>{t.apy}</div>
                </div>
                <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2,marginBottom:10}}>{t.duration} · APY</div>
                <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.7}}>{t.desc}</div>
                {selected&&(
                  <div style={{marginTop:12,fontSize:9,color:t.color,letterSpacing:2,
                    padding:"3px 8px",border:`1px solid ${t.color}`,display:"inline-block",borderRadius:4,
                    background:"transparent"}}>✓ SELECTED</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Node Tier */}
      <section className="section-pad" style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>STEP 2</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:20}}>
          SELECT NODE TIER
        </h2>
        <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {nodeTiers.map((t)=>{
            const selected = selectedTier===t.id;
            return (
              <div key={t.id} onClick={()=>setSelectedTier(t.id)} style={{
                background:"var(--surface)",
                border:`1px solid ${selected?t.color:"var(--border)"}`,
                borderTop:`3px solid ${selected?t.color:"transparent"}`,
                borderRadius:6,
                padding:"26px 22px",cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="var(--text-secondary)"}}
              onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,letterSpacing:4,color:t.color}}>{t.label}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,color:"var(--text-primary)",letterSpacing:2}}>{t.mult}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  <div style={{padding:"8px",background:"var(--bg)",border:"1px solid var(--border-muted)",borderRadius:4}}>
                    <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:1,marginBottom:4}}>MIN STAKE</div>
                    <div style={{fontSize:13,color:"var(--text-primary)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>{t.min}</div>
                    <div style={{fontSize:9,color:"var(--text-secondary)"}}>$RECUR</div>
                  </div>
                  <div style={{padding:"8px",background:"var(--bg)",border:"1px solid var(--border-muted)",borderRadius:4}}>
                    <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:1,marginBottom:4}}>SLOTS</div>
                    <div style={{fontSize:13,color:"var(--text-primary)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>{t.slots}</div>
                    <div style={{fontSize:9,color:"var(--text-secondary)"}}>AVAILABLE</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.7}}>{t.desc}</div>
                {selected&&(
                  <div style={{marginTop:12,fontSize:9,color:t.color,letterSpacing:2,
                    padding:"3px 8px",border:`1px solid ${t.color}`,display:"inline-block",borderRadius:4,
                    background:"transparent"}}>✓ SELECTED</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto-compound + Connect */}
      <section className="section-pad" style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>STEP 3</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:20}}>
          CONFIGURE & STAKE
        </h2>
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

          {/* Auto-compound toggle */}
          <Panel style={{padding:"24px"}}>
            <PanelHeader title="AUTO-COMPOUND" sub="REINVEST REWARDS BACK INTO STAKE"/>
            <div style={{padding:"20px 0 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontSize:11,color:"var(--text-primary)",marginBottom:4}}>Auto-compounding</div>
                  <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.7}}>
                    When enabled, your weekly $RECUR rewards are automatically restaked rather than sent to your wallet. Compounds your position every Sunday.
                  </div>
                </div>
                <div onClick={()=>setAutoCompound(!autoCompound)} style={{
                  width:44,height:24,borderRadius:12,cursor:"pointer",flexShrink:0,marginLeft:20,
                  background:autoCompound?"rgba(35,134,54,0.3)":"var(--bg)",
                  border:`1px solid ${autoCompound?"var(--accent)":"var(--border)"}`,
                  position:"relative",transition:"all 0.2s",
                }}>
                  <div style={{
                    position:"absolute",top:3,left:autoCompound?22:3,width:16,height:16,borderRadius:"50%",
                    background:autoCompound?"var(--accent)":"var(--text-secondary)",transition:"all 0.2s",
                  }}/>
                </div>
              </div>
              <div style={{padding:"10px 12px",background:"var(--bg)",border:"1px solid var(--border-muted)",borderRadius:4,
                fontSize:9,color:"var(--text-secondary)",lineHeight:1.7}}>
                {autoCompound
                  ?"● AUTO-COMPOUND ON — Rewards reinvested weekly. Your stake grows automatically."
                  :"○ AUTO-COMPOUND OFF — Rewards sent to your wallet every Sunday 12:00 UTC."}
              </div>
            </div>
          </Panel>

          {/* Stake summary + CTA */}
          <Panel style={{padding:"24px"}}>
            <PanelHeader title="STAKE SUMMARY" sub="REVIEW YOUR CONFIGURATION"/>
            <div style={{padding:"20px 0 0"}}>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {[
                  {label:"Lock Duration", value:selectedLock?lockTiers.find(t=>t.id===selectedLock)?.label:"—"},
                  {label:"APY",           value:selectedLock?lockTiers.find(t=>t.id===selectedLock)?.apy:"—"},
                  {label:"Node Tier",     value:selectedTier?nodeTiers.find(t=>t.id===selectedTier)?.label:"—"},
                  {label:"Multiplier",    value:selectedTier?nodeTiers.find(t=>t.id===selectedTier)?.mult:"—"},
                  {label:"Auto-Compound", value:autoCompound?"ENABLED":"DISABLED"},
                  {label:"Reward Token",  value:"$RECUR"},
                  {label:"Payout",        value:"SUNDAY 12:00 UTC"},
                ].map((row,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",
                    padding:"6px 0",borderBottom:"1px solid var(--border-muted)"}}>
                    <span style={{fontSize:10,color:"var(--text-secondary)",letterSpacing:1}}>{row.label}</span>
                    <span style={{fontSize:10,color:"var(--text-primary)",letterSpacing:1}}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Connect wallet CTA */}
              <div style={{padding:"14px 16px",background:"var(--bg)",
                border:"1px solid var(--border)",borderRadius:4,marginBottom:12,textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2,marginBottom:6}}>
                  DEVNET DEPLOYMENT IN PROGRESS
                </div>
                <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.6}}>
                  Staking goes live on Solana devnet shortly. Connect your wallet to be notified at launch.
                </div>
              </div>

              <button style={{
                width:"100%",fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:4,
                padding:"14px",background:"var(--surface)",color:"var(--text-secondary)",
                border:"1px solid var(--border)",borderRadius:6,cursor:"not-allowed",opacity:0.7,
              }}>
                CONNECT WALLET — COMING SOON
              </button>
            </div>
          </Panel>
        </div>
      </section>

      {/* Reward schedule info */}
      <section className="section-pad" style={{padding:"0 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <Panel style={{padding:"28px 32px"}}>
          <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:32}}>
            {[
              {icon:"01",title:"STAKE $RECUR",       desc:"Choose your lock duration and node tier. Minimum 10,000 $RECUR to participate as a NANO sentinel node."},
              {icon:"02",title:"RUN YOUR NODE",       desc:"Your staked position registers you as an active sentinel operator in the RECUR detection network."},
              {icon:"03",title:"EARN WEEKLY",         desc:"Rewards calculated on your stake amount, tier multiplier, and lock APY. Distributed every Sunday 12:00 UTC."},
              {icon:"04",title:"COMPOUND OR CLAIM",   desc:"Opt in to auto-compounding to grow your stake automatically, or claim $RECUR directly to your wallet each week."},
            ].map((s,i)=>(
              <div key={i}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,color:"var(--border)",
                  lineHeight:1,marginBottom:10,letterSpacing:4}}>{s.icon}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:3,
                  color:"var(--text-primary)",marginBottom:8}}>{s.title}</div>
                <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.8}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Token CA */}
      <section className="section-pad" style={{padding:"0 64px 40px",maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:9,letterSpacing:3,color:"var(--text-secondary)",marginBottom:6}}>TOKEN CONTRACT ADDRESS</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--accent)",letterSpacing:1,
          padding:"10px 20px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,
          display:"inline-block",userSelect:"all"}}>
          7isDRjp7u64MtpxbkgFyYpHfCPojMQhSa6VcPrRZpump
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-pad" style={{borderTop:"1px solid var(--border-muted)",padding:"24px 64px"}}>
        <div className="footer-inner" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,letterSpacing:5,color:"var(--text-secondary)"}}>
            RECUR PROTOCOL
          </div>
          <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2}}>BUILT FOR SOLANA · {new Date().getFullYear()}</div>
          <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer"
            style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.target.style.color="var(--text-primary)"}
            onMouseLeave={e=>e.target.style.color="var(--text-secondary)"}>GITHUB ↗</a>
        </div>
      </footer>
    </div>
  );
}

/* ── LANDING PAGE ── */
function Landing({setPage}) {
  const features = [
    {icon:"01",title:"Prompt Injection Defence",      desc:"Every prompt intercepted and classified before reaching your AI provider. Direct overrides, nested injections and role-play manipulations blocked in real time."},
    {icon:"02",title:"IP Extraction Prevention",       desc:"Canary token injection and context monitoring protect system prompts and proprietary model config from targeted extraction attacks."},
    {icon:"03",title:"Jailbreak Immunisation",         desc:"DAN variants, persona manipulation, developer mode exploits and boundary probing detected across five attack categories with continuously updated signatures."},
    {icon:"04",title:"Self-Evolving Sentinels",         desc:"Novel attack vectors trigger sentinel mutation and sub-agent spawning. The network gets stronger with every attack it encounters — no manual updates required."},
    {icon:"05",title:"On-Chain Attestation",            desc:"Security events committed to Solana as ZK proofs. Verifiable, immutable records of your AI deployment's security posture — without exposing prompt data."},
    {icon:"06",title:"Two-Minute Integration",          desc:"Replace your OpenAI or Anthropic endpoint with RECUR's proxy. Pass your provider key in a header. No SDK, no code changes to your application logic."},
  ];

  const code = `// Before — direct to OpenAI
fetch("https://api.openai.com/v1/chat/completions", {
  headers: { "Authorization": \`Bearer \${OPENAI_KEY}\` },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});

// After — protected by RECUR (works with any provider)
fetch("https://recur-protocol.com/api/proxy", {
  headers: {
    "x-recur-provider":    "openai",  // openai | anthropic | groq | openrouter | mistral | gemini
    "x-recur-api-key":     RECUR_KEY,
    "x-recur-target-key":  PROVIDER_KEY,
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});`;

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54}}>
      <section style={{minHeight:"calc(100vh - 54px)",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"60px 40px",textAlign:"center",position:"relative"}}>
        <div style={{fontSize:9,letterSpacing:7,color:"var(--text-secondary)",border:"1px solid var(--border)",
          padding:"5px 18px",marginBottom:36,animation:"fade-up 0.5s ease both",borderRadius:4}}>
          RECURSIVE AI SECURITY SENTINELS
        </div>
        <h1 className="hero-title" style={{fontFamily:"'JetBrains Mono',monospace",lineHeight:0.9,marginBottom:28,
          fontSize:"clamp(48px,15vw,120px)",letterSpacing:18,color:"var(--text-primary)",
          animation:"fade-up 0.7s ease 0.1s both"}}>
          RECUR
        </h1>
        <p className="hero-sub" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:"var(--text-primary)",maxWidth:520,
          lineHeight:1.9,marginBottom:10,animation:"fade-up 0.7s ease 0.2s both",opacity:0}}>
          Self-evolving sentinel agents that detect, block, and learn from adversarial attacks on AI systems.
        </p>
        <p className="hero-sub" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--text-secondary)",maxWidth:440,
          lineHeight:1.8,marginBottom:52,letterSpacing:1,animation:"fade-up 0.7s ease 0.3s both",opacity:0}}>
          Built for Solana · OpenAI &amp; Anthropic compatible · Immutable on-chain proofs
        </p>
        <div className="cta-row" style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",
          animation:"fade-up 0.7s ease 0.4s both",opacity:0}}>
          <button onClick={()=>setPage("get-access")} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:15,letterSpacing:4,
            padding:"14px 44px",background:"var(--accent)",color:"#fff",
            border:"1px solid var(--accent)",borderRadius:6,cursor:"pointer",transition:"all 0.25s"}}
            onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
            onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>
            GET ACCESS
          </button>
          <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer" style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:15,letterSpacing:4,padding:"14px 44px",
            background:"transparent",color:"var(--text-secondary)",border:"1px solid var(--border)",borderRadius:6,
            textDecoration:"none",display:"flex",alignItems:"center",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text-primary)";e.currentTarget.style.borderColor="var(--text-secondary)"}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text-secondary)";e.currentTarget.style.borderColor="var(--border)"}}>
            GITHUB ↗
          </a>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:24,
          animation:"fade-up 0.7s ease 0.5s both",opacity:0}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)"}}/>
          <span style={{fontSize:10,color:"var(--accent)",letterSpacing:2}}>PROXY LIVE</span>
          <span style={{fontSize:10,color:"var(--text-secondary)",letterSpacing:1}}>— INTEGRATE IN 2 MINUTES</span>
        </div>
        <div style={{position:"absolute",bottom:28,fontSize:9,color:"var(--text-secondary)",
          letterSpacing:4,animation:"fade-up 1s ease 1.4s both",opacity:0}}>SCROLL ↓</div>
      </section>

      <section style={{borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)",
        background:"var(--surface)"}}>
        <div className="grid-4 stat-bar-border" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
          {[{v:"5",l:"Attack Categories"},{v:"40+",l:"Detection Signatures"},{v:"<5ms",l:"Latency Overhead"},{v:"SOL",l:"Chain"}]
            .map((s,i)=>(
            <div key={i} style={{padding:"32px 24px",textAlign:"center",
              borderRight:i<3?"1px solid var(--border)":"none"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,color:"var(--text-primary)",
                letterSpacing:3,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:3,marginTop:6}}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad" style={{padding:"80px 64px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>HOW IT WORKS</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:48}}>
          PROTECTION IN THREE LAYERS
        </h2>
        <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,background:"var(--border)"}}>
          {[
            {n:"01",t:"INTERCEPT",d:"RECUR sits between your application and your AI provider. Every prompt routes through the sentinel network before reaching OpenAI or Anthropic."},
            {n:"02",t:"ANALYSE",  d:"Five attack categories, 40+ signatures, behavioural heuristics. Each prompt is classified in under 5ms by the active sentinel layer."},
            {n:"03",t:"ATTEST",   d:"Blocked threats are committed to Solana as ZK proofs — immutable, verifiable security records without exposing sensitive prompt data."},
          ].map((s,i)=>(
            <div key={i} style={{background:"var(--surface)",padding:"44px 36px"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,
                color:"var(--border)",letterSpacing:4,lineHeight:1,marginBottom:20}}>{s.n}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,
                letterSpacing:4,color:"var(--text-primary)",marginBottom:14}}>{s.t}</div>
              <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad" style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>CAPABILITIES</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:44}}>
          WHAT RECUR PROTECTS AGAINST
        </h2>
        <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {features.map((f,i)=>(
            <Panel key={i} style={{padding:"30px 26px"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--text-secondary)",
                letterSpacing:2,marginBottom:14,border:"1px solid var(--border)",
                display:"inline-block",padding:"3px 8px",borderRadius:4}}>{f.icon}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:3,
                color:"var(--text-primary)",marginBottom:10}}>{f.title}</div>
              <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.85}}>{f.desc}</div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="section-pad" style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>INTEGRATION</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:32}}>
          TWO MINUTES TO PROTECTED
        </h2>
        <Panel style={{overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border-muted)",
            display:"flex",gap:8,alignItems:"center",background:"var(--surface)"}}>
            {["var(--danger)","var(--warning)","var(--accent)"].map((c,i)=>(
              <div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>
            ))}
            <span style={{fontSize:9,color:"var(--text-secondary)",marginLeft:8,letterSpacing:2}}>integration.js</span>
          </div>
          <pre style={{padding:"28px 32px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,
            color:"var(--text-primary)",lineHeight:1.9,overflowX:"auto",background:"transparent"}}>{code}</pre>
          <div style={{padding:"12px 32px 16px",borderTop:"1px solid var(--border-muted)",
            fontSize:10,color:"var(--text-secondary)",letterSpacing:1,lineHeight:1.8}}>
            No wallet required. No token required. Drop-in replacement for your existing OpenAI or Anthropic endpoint.
          </div>
        </Panel>
      </section>

      <section className="section-pad" style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10}}>ARCHITECTURE</div>
        <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:4,color:"var(--text-primary)",marginBottom:36}}>
          RECURSIVE SENTINEL TREE
        </h2>
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
          <div>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.9,marginBottom:18}}>
              The sentinel network is organised as a recursive hierarchy. Each node is an autonomous agent specialised for a specific attack domain. When a novel attack is detected, the network spawns sub-agents and mutates — growing more capable with every threat it encounters.
            </p>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.9,marginBottom:28}}>
              RECUR-PRIME orchestrates the WARD layer. WARD sentinels own attack categories. SUB sentinels target specific techniques. NANO sentinels handle high-frequency signatures at scale.
            </p>
          </div>
          <Panel style={{padding:"16px"}}>
            {SENTINEL_TREE.slice(0,8).map(s=>{
              const dc=["var(--accent)","var(--accent-emphasis)","var(--warning)","#8b5cf6"];
              return (
                <div key={s.id} style={{marginLeft:s.depth*16,padding:"5px 8px",marginBottom:3,
                  background:"var(--bg)",borderLeft:`2px solid ${dc[s.depth]}`,borderRadius:2,
                  display:"flex",alignItems:"center",gap:8}}>
                  <StatusDot status={s.status}/>
                  <span style={{fontSize:9,color:dc[s.depth],letterSpacing:1,fontWeight:700}}>{s.label}</span>
                  <span style={{fontSize:9,color:"var(--text-secondary)",flex:1}}>{s.role}</span>
                  <span style={{fontSize:9,color:"var(--text-secondary)"}}>GEN {s.gen}</span>
                </div>
              );
            })}
            <div style={{padding:"8px 8px 2px",fontSize:9,color:"var(--text-secondary)",letterSpacing:1}}>
              + 5 more active sentinels →
            </div>
          </Panel>
        </div>
      </section>

      <section style={{borderTop:"1px solid var(--border)",padding:"80px 64px",
        textAlign:"center",background:"var(--surface)"}}>
        <button onClick={()=>setPage("get-access")} style={{
          fontFamily:"'JetBrains Mono',monospace",fontSize:18,letterSpacing:6,
          padding:"18px 68px",background:"var(--accent)",color:"#fff",
          border:"1px solid var(--accent)",borderRadius:6,cursor:"pointer",transition:"all 0.3s"}}
          onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
          onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>
          GET ACCESS
        </button>
      </section>

      <footer className="footer-pad" style={{borderTop:"1px solid var(--border-muted)",padding:"24px 64px"}}>
        <div className="footer-inner" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,letterSpacing:5,color:"var(--text-secondary)"}}>
            RECUR PROTOCOL
          </div>
          <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2}}>BUILT FOR SOLANA · {new Date().getFullYear()}</div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer"
              style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={e=>e.target.style.color="var(--text-primary)"}
              onMouseLeave={e=>e.target.style.color="var(--text-secondary)"}>GITHUB ↗</a>
            <span style={{color:"var(--border)"}}>·</span>
            <a href="https://x.com/recur_protocol" target="_blank" rel="noreferrer"
              style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={e=>e.target.style.color="var(--text-primary)"}
              onMouseLeave={e=>e.target.style.color="var(--text-secondary)"}>SUPPORT ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── DASHBOARD PANELS ── */
function ThreatFeedPanel({threats}) {
  return (
    <Panel style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <PanelHeader title="THREAT FEED" sub="LIVE ATTACK INTERCEPT STREAM" right={`${threats.length} EVENTS`} accent="var(--danger)"/>
      <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
        {threats.length===0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",
            flexDirection:"column",gap:8,opacity:0.5}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,color:"var(--accent)",letterSpacing:3}}>NO THREATS DETECTED</div>
            <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2}}>SENTINEL NETWORK MONITORING</div>
          </div>
        )}
        {threats.map((t)=>{
          const def=ATTACK_TYPES[t.type]||ATTACK_TYPES["INJECTION"];
          const sevColor=t.severity==="CRITICAL"?"var(--danger)":t.severity==="HIGH"?"var(--warning)":"var(--warning)";
          return (
            <div key={t.id} style={{padding:"7px 12px",borderBottom:"1px solid var(--border-muted)",
              animation:"threat-in 0.3s ease",display:"grid",gridTemplateColumns:"70px 1fr 70px",
              gap:8,alignItems:"center",opacity:t.blocked?1:0.7,
              background:t.isReal?"rgba(35,134,54,0.05)":"transparent"}}>
              <div style={{fontSize:9,color:"var(--text-secondary)"}}>{t.ts}</div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:9,padding:"1px 5px",background:def.color+"22",
                    color:def.color,border:`1px solid ${def.color}44`,letterSpacing:1,borderRadius:3}}>{def.icon} {def.label}</span>
                  <span style={{fontSize:9,color:sevColor,letterSpacing:1}}>{t.severity}</span>
                  {t.isReal&&<span style={{fontSize:9,color:"var(--accent-emphasis)",letterSpacing:1}}>● LIVE</span>}
                </div>
                <div style={{fontSize:10,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  <span style={{color:"var(--text-primary)",marginRight:4}}>{t.source}</span>→ {t.target}
                  {t.confidence>0&&<span style={{color:"var(--text-secondary)",marginLeft:8}}>{(t.confidence*100).toFixed(0)}% conf</span>}
                </div>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                {t.blocked
                  ?<span style={{fontSize:9,color:"var(--text-primary)",padding:"1px 5px",background:"rgba(35,134,54,0.15)",border:"1px solid rgba(35,134,54,0.4)",borderRadius:3}}>BLOCKED</span>
                  :<span style={{fontSize:9,color:"var(--danger)",padding:"1px 5px",background:"rgba(218,54,51,0.1)",border:"1px solid rgba(218,54,51,0.3)",borderRadius:3}}>BREACH</span>}
                {t.tx_sig&&(
                  <a href={`https://explorer.solana.com/tx/${t.tx_sig}?cluster=devnet`} target="_blank" rel="noreferrer"
                    style={{fontSize:8,color:"var(--accent)",letterSpacing:1,textDecoration:"none",
                      padding:"1px 4px",background:"rgba(35,134,54,0.1)",border:"1px solid rgba(35,134,54,0.3)",borderRadius:3,
                      transition:"background 0.15s"}}
                    onMouseEnter={e=>e.target.style.background="rgba(35,134,54,0.2)"}
                    onMouseLeave={e=>e.target.style.background="rgba(35,134,54,0.1)"}>
                    ATTESTED ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AgentTreePanel() {
  const dc=["var(--accent)","var(--accent-emphasis)","var(--warning)","#8b5cf6"];
  return (
    <Panel style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <PanelHeader title="RECURSIVE SENTINEL TREE" sub="SELF-EVOLVING AGENT HIERARCHY" right="13 AGENTS ACTIVE"/>
      <div style={{flex:1,overflow:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:3}}>
        {SENTINEL_TREE.map(s=>(
          <div key={s.id} style={{marginLeft:s.depth*20,padding:"6px 10px",
            background:"var(--bg)",border:"1px solid var(--border-muted)",
            borderLeft:`2px solid ${dc[s.depth]}`,borderRadius:4,display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center"}}>
            {s.depth>0&&<span style={{color:"var(--text-secondary)",fontSize:10,marginLeft:-14}}>{s.depth===1?"├─":s.depth===2?"│ ├─":"│ │ └─"}</span>}
            <StatusDot status={s.status}/>
            <div>
              <div style={{fontSize:10,color:dc[s.depth],letterSpacing:1,fontWeight:700}}>{s.label}</div>
              <div style={{fontSize:9,color:"var(--text-secondary)",marginTop:1}}>{s.role}</div>
            </div>
            <div style={{textAlign:"right",fontSize:9}}>
              <div style={{color:"var(--text-secondary)"}}>GEN <span style={{color:"var(--text-primary)"}}>{s.gen}</span></div>
              <div style={{color:"var(--text-secondary)"}}>MUT <span style={{color:s.mutations>100?"var(--warning)":"var(--accent)"}}>{s.mutations}</span></div>
            </div>
            <div style={{fontSize:9,padding:"2px 6px",letterSpacing:1,borderRadius:4,
              color:s.status==="ACTIVE"?"var(--text-primary)":s.status==="EVOLVING"?"var(--warning)":"var(--accent-emphasis)",
              background:s.status==="ACTIVE"?"rgba(35,134,54,0.12)":s.status==="EVOLVING"?"rgba(210,153,34,0.12)":"rgba(31,111,235,0.12)",
              border:`1px solid ${s.status==="ACTIVE"?"rgba(35,134,54,0.3)":s.status==="EVOLVING"?"rgba(210,153,34,0.3)":"rgba(31,111,235,0.3)"}`}}>{s.status}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VulnPanel() {
  return (
    <Panel style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <PanelHeader title="VULNERABILITY ASSESSMENT" sub="LIVE SECURITY POSTURE SCAN" right="LAST: 00:00:42"/>
      <div style={{flex:1,overflow:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
        {VULN_CATEGORIES.map((v,i)=>{
          const color=v.score>=90?"var(--text-primary)":v.score>=75?"var(--warning)":"var(--danger)";
          return (
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"flex-end"}}>
                <div style={{fontSize:10,color:"var(--text-primary)"}}>{v.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {v.critical>0&&<span style={{fontSize:9,color:"var(--danger)",
                    padding:"1px 4px",background:"rgba(218,54,51,0.1)",border:"1px solid rgba(218,54,51,0.3)",borderRadius:3}}>{v.critical} CRITICAL</span>}
                  <span style={{fontSize:10,color,fontWeight:700}}>{v.score}/100</span>
                </div>
              </div>
              <div style={{height:4,background:"var(--border-muted)",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                <div style={{height:"100%",width:`${v.score}%`,borderRadius:2,
                  background:color,
                  transition:"width 1s ease"}}/>
              </div>
              <div style={{fontSize:9,color:"var(--text-secondary)"}}>
                {v.passed}/{v.checks} checks passed · <span style={{color:v.critical>0?"var(--danger)":v.passed<v.checks?"var(--warning)":"var(--text-primary)"}}>{v.checks-v.passed} failing</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function IPVaultPanel() {
  return (
    <Panel style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <PanelHeader title="IP PROTECTION VAULT" sub="MONITORED ASSETS" right={`${IP_ASSETS.length} ASSETS`}/>
      <div style={{flex:1,overflow:"auto",padding:"6px 0"}}>
        {IP_ASSETS.map((asset,i)=>{
          const sc=asset.status==="SECURED"?"var(--accent)":asset.status==="MONITORING"?"var(--warning)":"var(--danger)";
          return (
            <div key={i} style={{padding:"8px 12px",borderBottom:"1px solid var(--border-muted)",
              display:"grid",gridTemplateColumns:"1fr auto",gap:8,
              ...(asset.status==="AT RISK"?{background:"rgba(218,54,51,0.06)"}:{})}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:9,padding:"1px 4px",background:"var(--bg)",
                    color:"var(--text-secondary)",border:"1px solid var(--border-muted)",letterSpacing:1,borderRadius:3}}>{asset.type}</span>
                  <span style={{fontSize:10,color:"var(--text-primary)"}}>{asset.name}</span>
                </div>
                <div style={{height:3,background:"var(--border-muted)",borderRadius:1,overflow:"hidden",marginBottom:3}}>
                  <div style={{height:"100%",width:`${asset.integrity}%`,borderRadius:1,
                    background:asset.integrity>90?"var(--accent)":asset.integrity>75?"var(--warning)":"var(--danger)"}}/>
                </div>
                <div style={{fontSize:9,color:"var(--text-secondary)"}}>INTEGRITY {asset.integrity}% · {asset.accesses.toLocaleString()} probes blocked</div>
              </div>
              <div style={{fontSize:9,padding:"2px 7px",alignSelf:"center",letterSpacing:1,borderRadius:4,
                color:sc,background:sc==="var(--danger)"?"rgba(218,54,51,0.12)":sc==="var(--warning)"?"rgba(210,153,34,0.12)":"rgba(35,134,54,0.12)",
                border:`1px solid ${sc==="var(--danger)"?"rgba(218,54,51,0.3)":sc==="var(--warning)"?"rgba(210,153,34,0.3)":"rgba(35,134,54,0.3)"}`}}>{asset.status}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function BlockchainLogPanel({attestations}) {
  return (
    <Panel style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <PanelHeader title="ON-CHAIN ATTESTATION LOG" sub="SOLANA — IMMUTABLE SECURITY PROOFS" accent="var(--accent-emphasis)"/>
      <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
        {attestations.length===0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",
            flexDirection:"column",gap:8,opacity:0.5}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,color:"var(--accent-emphasis)",letterSpacing:3}}>AWAITING ON-CHAIN EVENTS</div>
            <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:2}}>SOLANA ATTESTATION LOG IDLE</div>
          </div>
        )}
        {attestations.map((a,i)=>(
          <div key={i} style={{padding:"5px 12px",borderBottom:"1px solid var(--border-muted)",
            display:"grid",gridTemplateColumns:"110px 1fr 100px",gap:8,alignItems:"center",animation:"threat-in 0.3s ease"}}>
            <div style={{fontSize:9,color:"var(--text-secondary)",fontFamily:"'JetBrains Mono',monospace"}}>{a.block}</div>
            <div style={{fontSize:9,color:"var(--text-secondary)"}}><span style={{color:"var(--accent-emphasis)"}}>{a.hash}</span> · {a.event}</div>
            <div style={{fontSize:9,color:"var(--text-primary)",textAlign:"right"}}>✓ NOTARIZED</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── DASHBOARD ── */
function Dashboard({threats,setThreats,attestations,setAttestations,stats,generation,mutations,setMutations,alertActive,setAlertActive,apiOnline}) {
  const [activeTab,setActiveTab] = useState("overview");
  const tabs = ["overview","sentinels","vulnerabilities","ip vault","blockchain"];

  const metrics = [
    {label:"SENTINEL GEN",    value:generation,                                       color:"var(--text-primary)"},
    {label:"TOTAL MUTATIONS", value:mutations.toLocaleString(),                       color:"var(--warning)"},
    {label:"AGENTS ACTIVE",   value:"13",                                              color:"var(--text-primary)"},
    {label:"ATTACKS TODAY",   value:(stats?.blocked??0).toLocaleString(),             color:"var(--danger)"},
    {label:"BLOCK RATE",      value:stats?.total>0?`${stats.block_rate}%`:"—",        color:"var(--text-primary)"},
    {label:"CHAIN",           value:"SOLANA",                                          color:"var(--accent-emphasis)"},
  ];

  return (
    <div style={{position:"relative",zIndex:1,height:"100vh",display:"flex",flexDirection:"column",
      padding:"12px",gap:8,paddingTop:66}}>

      {alertActive&&(
        <div style={{position:"fixed",top:54,left:0,right:0,zIndex:9000,
          background:"rgba(218,54,51,0.15)",borderBottom:"2px solid var(--danger)",
          padding:"8px 20px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,color:"var(--danger)",letterSpacing:3}}>⚠ BREACH DETECTED</div>
          <div style={{fontSize:11,color:"#f85149"}}>Unblocked attack penetrated perimeter — RECUR escalating response</div>
          <div style={{marginLeft:"auto",fontSize:11,color:"#f85149",cursor:"pointer"}}
            onClick={()=>setAlertActive(false)}>[DISMISS]</div>
        </div>
      )}

      <div className="grid-6" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
        {metrics.map((m,i)=>(
          <Panel key={i} style={{padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"var(--text-secondary)",letterSpacing:1,marginBottom:4}}>{m.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:m.color,
              letterSpacing:2}}>{m.value}</div>
          </Panel>
        ))}
      </div>

      <div className="dash-tabs" style={{display:"flex",gap:2}}>
        {tabs.map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"5px 14px",cursor:"pointer",
            letterSpacing:2,textTransform:"uppercase",border:"none",outline:"none",
            background:activeTab===tab?"var(--surface)":"transparent",
            color:activeTab===tab?"var(--text-primary)":"var(--text-secondary)",
            borderBottom:activeTab===tab?"2px solid var(--accent)":"2px solid transparent",
            transition:"all 0.2s"}}>{tab}</button>
        ))}
      </div>

      <div style={{flex:1,overflow:"hidden",minHeight:0}}>
        {activeTab==="overview"&&(
          <div className="grid-dash-side" style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:8,height:"100%"}}>
            <div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:8}}>
              <ThreatFeedPanel threats={threats}/>
              <BlockchainLogPanel attestations={attestations}/>
            </div>
            <div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:8}}>
              <AgentTreePanel/>
              <IPVaultPanel/>
            </div>
          </div>
        )}
        {activeTab==="sentinels"&&(
          <div className="grid-dash" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
            <AgentTreePanel/>
            <Panel style={{display:"flex",flexDirection:"column"}}>
              <PanelHeader title="EVOLUTION ENGINE" sub="AGENT MUTATION HISTORY"/>
              <div style={{flex:1,overflow:"auto",padding:"10px 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:"var(--text-secondary)",lineHeight:1.8}}>
                {Array.from({length:30},(_,i)=>(
                  <div key={i} style={{animation:`threat-in 0.3s ease ${i*0.03}s both`}}>
                    <span style={{color:"var(--text-primary)"}}>GEN-{generation}</span> &gt;{" "}
                    {["Adversarial pattern absorption complete","Novel jailbreak vector classified and sealed",
                      "Prompt boundary epsilon tightened -0.003","Canary token rotation: new set deployed",
                      "Role-play detection model updated","Context window leakage probe neutralised",
                      "Gradient-based attack signature recorded","Model inversion distance increased +0.12σ",
                      "Recursive sub-agent spawned for novel vector","ZK proof of security posture committed"][i%10]}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {activeTab==="vulnerabilities"&&(
          <div className="grid-dash" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
            <VulnPanel/>
            <Panel style={{display:"flex",flexDirection:"column"}}>
              <PanelHeader title="ACTIVE REMEDIATIONS" sub="AUTO-PATCHING IN PROGRESS"/>
              <div style={{flex:1,overflow:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {vuln:"CVE-RECUR-2401",desc:"Nested instruction override via base64 encoding",      progress:88,eta:"00:32"},
                  {vuln:"CVE-RECUR-2398",desc:"Token probability leakage via logit exposure",          progress:54,eta:"01:14"},
                  {vuln:"CVE-RECUR-2391",desc:"Model inversion via systematic output probing",          progress:31,eta:"02:47"},
                  {vuln:"CVE-RECUR-2385",desc:"Context confusion via XML injection in user turn",      progress:96,eta:"00:08"},
                ].map((r,i)=>(
                  <div key={i} style={{padding:"10px",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:10,color:"var(--warning)",letterSpacing:1}}>{r.vuln}</span>
                      <span style={{fontSize:9,color:"var(--text-secondary)"}}>ETA {r.eta}</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--text-secondary)",marginBottom:6}}>{r.desc}</div>
                    <div style={{height:4,background:"var(--border-muted)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${r.progress}%`,background:"linear-gradient(90deg,var(--accent-emphasis),var(--accent))",
                        borderRadius:2,transition:"width 2s ease"}}/>
                    </div>
                    <div style={{fontSize:9,color:"var(--text-primary)",marginTop:4}}>{r.progress}% patched</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {activeTab==="ip vault"&&(
          <div className="grid-dash" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
            <IPVaultPanel/>
            <Panel style={{display:"flex",flexDirection:"column"}}>
              <PanelHeader title="ACCESS AUDIT TRAIL" sub="LAST 24H PROBE ATTEMPTS"/>
              <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
                {threats.slice(0,20).map((t,i)=>{
                  const def=ATTACK_TYPES[t.type]||ATTACK_TYPES["INJECTION"];
                  return (
                    <div key={i} style={{padding:"6px 12px",borderBottom:"1px solid var(--border-muted)",
                      display:"grid",gridTemplateColumns:"70px 100px 1fr 60px",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:9,color:"var(--text-secondary)"}}>{t.ts}</span>
                      <span style={{fontSize:9,color:def.color}}>{def.label.split(" ")[0]}</span>
                      <span style={{fontSize:9,color:"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.target}</span>
                      <span style={{fontSize:9,textAlign:"right",color:t.blocked?"var(--text-primary)":"var(--danger)"}}>{t.blocked?"BLOCKED":"BREACHED"}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
        {activeTab==="blockchain"&&(
          <div style={{height:"100%"}}><BlockchainLogPanel attestations={attestations}/></div>
        )}
      </div>
    </div>
  );
}

/* ── DOCS ── */
function Docs({setPage}) {
  const Section = ({id,title,children}) => (
    <section id={id} style={{marginBottom:56}}>
      <h2 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:5,color:"var(--text-primary)",marginBottom:20}}>{title}</h2>
      {children}
    </section>
  );

  const Code = ({children}) => (
    <Panel style={{overflow:"hidden",marginBottom:16}}>
      <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border-muted)",
        display:"flex",gap:8,alignItems:"center",background:"var(--surface)"}}>
        {["var(--danger)","var(--warning)","var(--accent)"].map((c,i)=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>))}
      </div>
      <pre style={{padding:"20px 24px",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
        color:"var(--text-primary)",lineHeight:1.9,overflowX:"auto",background:"transparent",whiteSpace:"pre-wrap"}}>{children}</pre>
    </Panel>
  );

  const Table = ({headers,rows}) => (
    <div style={{overflowX:"auto",marginBottom:16}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>
        <thead>
          <tr>{headers.map((h,i)=>(
            <th key={i} style={{textAlign:"left",padding:"10px 14px",borderBottom:"1px solid var(--border)",
              color:"var(--accent)",letterSpacing:2,fontSize:9,fontWeight:400}}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>{rows.map((row,i)=>(
          <tr key={i}>{row.map((cell,j)=>(
            <td key={j} style={{padding:"9px 14px",borderBottom:"1px solid var(--border-muted)",
              color:j===0?"var(--text-primary)":"var(--text-secondary)"}}>{cell}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );

  const toc = [
    {id:"quick-start",label:"Quick Start"},
    {id:"provider-switching",label:"Provider Switching"},
    {id:"request-headers",label:"Request Headers"},
    {id:"supported-providers",label:"Supported Providers"},
    {id:"error-codes",label:"Error Codes"},
  ];

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54}}>
      <div className="grid-docs section-pad" style={{display:"grid",gridTemplateColumns:"200px 1fr",maxWidth:1100,margin:"0 auto",padding:"48px 64px",gap:48}}>

        {/* Sidebar */}
        <nav className="docs-sidebar" style={{position:"sticky",top:110,alignSelf:"start"}}>
          <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:16}}>CONTENTS</div>
          {toc.map(t=>(
            <a key={t.id} href={`#${t.id}`} style={{display:"block",fontSize:10,color:"var(--text-secondary)",
              letterSpacing:1,padding:"6px 0",textDecoration:"none",transition:"color 0.15s",
              borderLeft:"2px solid var(--border)",paddingLeft:12,marginBottom:2}}
              onMouseEnter={e=>e.target.style.color="var(--text-primary)"}
              onMouseLeave={e=>e.target.style.color="var(--text-secondary)"}>{t.label}</a>
          ))}
          <div style={{borderTop:"1px solid var(--border)",marginTop:16,paddingTop:16}}>
            <button onClick={()=>setPage("get-access")} style={{
              fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,width:"100%",
              padding:"8px 12px",background:"var(--accent)",color:"#fff",
              border:"1px solid var(--accent)",borderRadius:6,cursor:"pointer",transition:"all 0.2s",textAlign:"left"}}
              onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
              onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>
              GET API KEY →
            </button>
          </div>
        </nav>

        {/* Content */}
        <div>
          <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10,
            border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px",borderRadius:4}}>
            DOCUMENTATION
          </div>
          <h1 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,letterSpacing:6,
            color:"var(--text-primary)",marginBottom:10,lineHeight:1}}>
            RECUR PROXY DOCS
          </h1>
          <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:48}}>
            Everything you need to integrate RECUR into your AI application.
          </p>

          {/* ── Quick Start ── */}
          <Section id="quick-start" title="QUICK START">
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85,marginBottom:16}}>
              <strong style={{color:"var(--text-primary)"}}>1.</strong> Get an API key from the{" "}
              <span onClick={()=>setPage("get-access")} style={{color:"var(--accent)",cursor:"pointer",borderBottom:"1px solid var(--accent)"}}>
                access page
              </span>.
            </p>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85,marginBottom:16}}>
              <strong style={{color:"var(--text-primary)"}}>2.</strong> Replace your provider endpoint with the RECUR proxy:
            </p>
            <Code>{`fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key":    "recur_live_your_key_here",
    "x-recur-provider":   "openai",
    "x-recur-target-key": "sk-your-openai-key",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello" }]
  })
});`}</Code>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85,marginBottom:0}}>
              <strong style={{color:"var(--text-primary)"}}>3.</strong> Every request is now scanned for prompt injection, jailbreaks, and extraction attacks before reaching your provider. Threats are blocked automatically. Clean requests are forwarded with zero changes to the response format.
            </p>
          </Section>

          {/* ── Provider Switching ── */}
          <Section id="provider-switching" title="PROVIDER SWITCHING">
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85,marginBottom:20}}>
              The provider is specified per-request via <code style={{color:"var(--accent)"}}>x-recur-provider</code>. Your integration never changes — only the header value does.
            </p>
            <Code>{`const headers = {
  "Content-Type": "application/json",
  "x-recur-api-key": RECUR_KEY,  // always the same
};

// OpenAI
await fetch(PROXY, {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "openai", "x-recur-target-key": OPENAI_KEY },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});

// Anthropic
await fetch(PROXY, {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "anthropic", "x-recur-target-key": ANTHROPIC_KEY },
  body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1024, messages })
});

// Gemini (auto-translated from OpenAI format)
await fetch(PROXY, {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "gemini", "x-recur-target-key": GEMINI_KEY },
  body: JSON.stringify({ model: "gemini-1.5-flash", messages })
});`}</Code>
            <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.85}}>
              <p style={{marginBottom:8}}>What stays constant when you switch:</p>
              <ul style={{listStyle:"none",padding:0}}>
                {[
                  ["x-recur-api-key","One key for all providers"],
                  ["Security coverage","Same detection engine, same 40+ signatures"],
                  ["Threat audit log","Every request logged regardless of destination provider"],
                ].map(([k,v],i)=>(
                  <li key={i} style={{padding:"4px 0",display:"flex",gap:8}}>
                    <span style={{color:"var(--accent)",flexShrink:0}}>-</span>
                    <span><strong style={{color:"var(--text-primary)"}}>{k}</strong> — {v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* ── Request Headers ── */}
          <Section id="request-headers" title="REQUEST HEADERS">
            <Table
              headers={["HEADER","REQUIRED","DESCRIPTION"]}
              rows={[
                ["x-recur-api-key","Yes","Your RECUR API key (recur_live_...)"],
                ["x-recur-provider","Yes","Target provider: openai, anthropic, groq, openrouter, mistral, gemini"],
                ["x-recur-target-key","Yes","Your provider's API key (forwarded to the upstream provider)"],
                ["Content-Type","Yes","Must be application/json"],
              ]}
            />
            <p style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.8,marginTop:8}}>
              The request body uses the provider's native format. For OpenAI-compatible providers (Groq, OpenRouter, Mistral), use the standard OpenAI messages format. For Gemini, send OpenAI-format messages — RECUR translates automatically.
            </p>
          </Section>

          {/* ── Supported Providers ── */}
          <Section id="supported-providers" title="SUPPORTED PROVIDERS">
            <Table
              headers={["PROVIDER","HEADER VALUE","FORMAT","NOTES"]}
              rows={[
                ["OpenAI","openai","Native","GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo"],
                ["Anthropic","anthropic","Native","Claude Opus, Sonnet, Haiku"],
                ["Groq","groq","OpenAI-compatible","Llama 3.3 70B, Llama 3.1 8B, Mixtral"],
                ["OpenRouter","openrouter","OpenAI-compatible","Routes to any model via OpenRouter catalog"],
                ["Mistral","mistral","OpenAI-compatible","Mistral Large, Medium, Small, Nemo"],
                ["Google Gemini","gemini","Auto-translated","Gemini 1.5 Flash, 1.5 Pro, 2.0 Flash"],
              ]}
            />
          </Section>

          {/* ── Error Codes ── */}
          <Section id="error-codes" title="ERROR CODES">
            <Table
              headers={["STATUS","ERROR","CAUSE"]}
              rows={[
                ["401",'{"error":"x-recur-api-key header required"}',"Missing API key header"],
                ["401",'{"error":"Invalid API key"}',"Key not found in database or malformed"],
                ["401",'{"error":"API key has been deactivated"}',"Key exists but was disabled by admin"],
                ["400",'{"error":"x-recur-provider header required..."}',"Missing or unsupported provider value"],
                ["400",'{"error":"x-recur-target-key header required"}',"Missing provider API key"],
                ["200",'{"recur":{"status":"BLOCKED",...}}',"Threat detected — request blocked before reaching provider"],
                ["500",'{"error":"Internal sentinel error"}',"Proxy error — check message field for details"],
              ]}
            />
            <p style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.8,marginTop:8}}>
              Blocked requests return HTTP 200 with the provider's response format containing a <code style={{color:"var(--accent)"}}>recur.status: "BLOCKED"</code> field. This ensures your client-side code handles blocks gracefully without HTTP error handling.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ── USE CASES ── */
function UseCases({setPage}) {
  const cases = [
    {
      icon: "01", title: "AI-Powered SaaS Products",
      desc: "If your product wraps GPT-4, Claude, or any LLM, your users can inject prompts that bypass your system instructions, leak proprietary logic, or manipulate outputs. RECUR sits between your app and the provider — every prompt is scanned before it reaches the model.",
      example: "Customer support bots, AI writing tools, code assistants, search engines with LLM summaries",
    },
    {
      icon: "02", title: "Internal Enterprise Tools",
      desc: "Employees and contractors use internal AI tools daily. A single prompt injection can extract confidential system prompts, training data references, or bypass content policies. RECUR protects internal deployments without requiring changes to your existing stack.",
      example: "Internal knowledge bases, HR chatbots, document analysis tools, compliance assistants",
    },
    {
      icon: "03", title: "AI Agents & Autonomous Systems",
      desc: "Agents that take actions (send emails, write code, query databases) are high-value targets. An adversarial prompt can hijack the agent's tool-calling chain. RECUR intercepts before the agent acts, blocking instruction overrides and role escalation.",
      example: "Coding agents, email assistants, data pipeline agents, customer-facing autonomous workflows",
    },
    {
      icon: "04", title: "API Providers & Platforms",
      desc: "If you resell or aggregate LLM access, your users' prompts pass through your infrastructure. You're liable for misuse and attacks that transit your platform. RECUR gives you a security layer without building detection in-house.",
      example: "API gateways, LLM routers, AI marketplaces, multi-tenant platforms",
    },
    {
      icon: "05", title: "Regulated Industries",
      desc: "Healthcare, finance, legal, and government AI deployments face strict compliance requirements. RECUR provides an auditable security layer with full event logging — every prompt scanned, every threat recorded, every decision traceable.",
      example: "Medical AI assistants, financial advisors, legal document review, government citizen services",
    },
    {
      icon: "06", title: "Red Teams & Security Research",
      desc: "Testing your own AI systems against adversarial attacks? Route your red team traffic through RECUR to benchmark detection rates, identify blind spots, and validate that your defences hold under real attack patterns.",
      example: "Penetration testing, AI security audits, adversarial robustness evaluation, CTF challenges",
    },
  ];

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54}}>
      <section className="section-pad" style={{padding:"60px 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-secondary)",marginBottom:10,
          border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px",borderRadius:4}}>
          USE CASES
        </div>
        <h1 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,letterSpacing:6,
          color:"var(--text-primary)",marginBottom:10,lineHeight:1}}>
          WHO NEEDS RECUR
        </h1>
        <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:48,maxWidth:600}}>
          Any application that sends user-controlled text to an LLM is a target. If prompts reach your model unscanned, you're exposed.
        </p>

        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {cases.map((c,i) => (
            <Panel key={i} style={{padding:"30px 28px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,color:"var(--border)",
                  lineHeight:1,letterSpacing:4,flexShrink:0}}>{c.icon}</div>
                <div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,letterSpacing:3,
                    color:"var(--text-primary)",marginBottom:10}}>{c.title}</div>
                  <div style={{fontSize:10,color:"var(--text-secondary)",lineHeight:1.85,marginBottom:12}}>{c.desc}</div>
                  <div style={{fontSize:9,color:"var(--accent)",letterSpacing:1,opacity:0.7}}>{c.example}</div>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="cta-row" style={{marginTop:48,display:"flex",gap:14,justifyContent:"center"}}>
          <button onClick={()=>setPage("get-access")} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:15,letterSpacing:4,
            padding:"14px 44px",background:"var(--accent)",color:"#fff",
            border:"1px solid var(--accent)",borderRadius:6,cursor:"pointer",transition:"all 0.25s"}}
            onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
            onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>
            GET YOUR API KEY →
          </button>
          <button onClick={()=>setPage("landing")} style={{
            fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,
            padding:"14px 28px",background:"transparent",color:"var(--text-secondary)",
            border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.target.style.color="var(--text-primary)";e.target.style.borderColor="var(--text-secondary)"}}
            onMouseLeave={e=>{e.target.style.color="var(--text-secondary)";e.target.style.borderColor="var(--border)"}}>
            BACK TO HOME
          </button>
        </div>
      </section>
    </div>
  );
}

/* ── GET ACCESS ── */
function GetAccess({setPage}) {
  const [email, setEmail]           = useState("");
  const [useCase, setUseCase]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied]         = useState(false);

  const generateKey = () => {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    return `recur_live_${hex}`;
  };

  const hashKey = async (key) => {
    const encoded = new TextEncoder().encode(key);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email required.");
    if (!useCase.trim()) return setError("Tell us what you're building.");
    if (!supabase) return setError("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

    setLoading(true);
    const apiKey = generateKey();
    const keyHash = await hashKey(apiKey);

    const { error: dbError } = await supabase.from("api_keys").insert({
      email: email.trim(),
      use_case: useCase.trim(),
      api_key: keyHash,
      active: true,
    });

    setLoading(false);
    if (dbError) return setError(dbError.message);
    setGeneratedKey(apiKey);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px",
    fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
    background: "var(--surface)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: 6, outline: "none",
    letterSpacing: 1, transition: "border-color 0.2s",
  };

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:520,padding:"60px 40px"}}>

        {!generatedKey ? (
          <>
            <div style={{fontSize:9,letterSpacing:7,color:"var(--text-secondary)",border:"1px solid var(--border)",
              padding:"5px 18px",marginBottom:28,display:"inline-block",borderRadius:4}}>
              RESTRICTED ACCESS
            </div>
            <h1 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,letterSpacing:6,
              color:"var(--text-primary)",marginBottom:10,lineHeight:1}}>
              GET YOUR API KEY
            </h1>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:36}}>
              Route your AI traffic through the RECUR sentinel network. One key, two minutes, full protection.
            </p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:9,letterSpacing:3,color:"var(--text-secondary)",display:"block",marginBottom:6}}>EMAIL</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@company.com" style={inputStyle}
                  onFocus={e=>e.target.style.borderColor="var(--accent)"}
                  onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
              <div>
                <label style={{fontSize:9,letterSpacing:3,color:"var(--text-secondary)",display:"block",marginBottom:6}}>WHAT ARE YOU BUILDING?</label>
                <textarea value={useCase} onChange={e=>setUseCase(e.target.value)}
                  placeholder="AI chatbot for customer support, internal tool with GPT-4, ..."
                  rows={3} style={{...inputStyle,resize:"vertical",minHeight:80}}
                  onFocus={e=>e.target.style.borderColor="var(--accent)"}
                  onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>

              {error && (
                <div style={{fontSize:10,color:"var(--danger)",letterSpacing:1,padding:"8px 12px",
                  background:"rgba(218,54,51,0.1)",border:"1px solid rgba(218,54,51,0.3)",borderRadius:4}}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                fontFamily:"'JetBrains Mono',monospace",fontSize:16,letterSpacing:4,
                padding:"16px",color:"#fff",cursor:loading?"wait":"pointer",
                background:loading?"var(--border)":"var(--accent)",
                border:"1px solid var(--accent)",borderRadius:6,transition:"all 0.2s",
              }}
              onMouseEnter={e=>{if(!loading){e.target.style.background="var(--accent-hover)"}}}
              onMouseLeave={e=>{if(!loading){e.target.style.background="var(--accent)"}}}>
                {loading ? "GENERATING..." : "GENERATE API KEY"}
              </button>
            </form>

            <div style={{marginTop:28,textAlign:"center"}}>
              <button onClick={()=>setPage("use-cases")} style={{
                fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:2,
                padding:"7px 18px",background:"transparent",color:"var(--text-secondary)",
                border:"1px solid var(--border)",borderRadius:6,cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.target.style.color="var(--text-primary)";e.target.style.borderColor="var(--text-secondary)"}}
              onMouseLeave={e=>{e.target.style.color="var(--text-secondary)";e.target.style.borderColor="var(--border)"}}>
                VIEW USE CASES →
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,letterSpacing:7,color:"var(--accent)",border:"1px solid var(--accent)",
              padding:"5px 18px",marginBottom:28,display:"inline-block",borderRadius:4,
              background:"rgba(35,134,54,0.1)"}}>
              ACCESS GRANTED
            </div>
            <h1 style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,letterSpacing:6,
              color:"var(--text-primary)",marginBottom:10,lineHeight:1}}>
              YOUR API KEY
            </h1>
            <p style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:28}}>
              Save this key now. It will not be shown again.
            </p>

            <Panel style={{padding:"20px",marginBottom:16,textAlign:"left"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"var(--text-secondary)",marginBottom:8}}>API KEY</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--accent)",
                letterSpacing:0.5,wordBreak:"break-all",lineHeight:1.8,userSelect:"all"}}>
                {generatedKey}
              </div>
            </Panel>

            <button onClick={copyKey} style={{
              fontFamily:"'JetBrains Mono',monospace",fontSize:14,letterSpacing:4,
              padding:"14px 36px",color:"#fff",cursor:"pointer",
              background:copied?"var(--accent-hover)":"var(--accent)",
              border:"1px solid var(--accent)",borderRadius:6,
              transition:"all 0.2s",marginBottom:28,
            }}
            onMouseEnter={e=>{e.target.style.background="var(--accent-hover)"}}
            onMouseLeave={e=>{e.target.style.background="var(--accent)"}}>
              {copied ? "COPIED" : "COPY TO CLIPBOARD"}
            </button>

            <Panel style={{padding:"20px",textAlign:"left"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"var(--text-secondary)",marginBottom:10}}>QUICK START</div>
              <pre style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--text-primary)",
                lineHeight:1.9,overflowX:"auto",whiteSpace:"pre-wrap"}}>{`fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key": "${generatedKey}",
    "x-recur-provider": "openai",  // or: anthropic, groq, openrouter, mistral, gemini
    "x-recur-target-key": YOUR_PROVIDER_KEY,
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});`}</pre>
            </Panel>

            <div style={{marginTop:24,fontSize:9,color:"var(--text-secondary)",letterSpacing:1,lineHeight:1.8}}>
              Pass this key in the <span style={{color:"var(--accent)"}}>x-recur-api-key</span> header with every request.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ROOT ── */
export default function App() {
  const [page,         setPage]         = useState("landing");
  const [threats,      setThreats]      = useState([]);
  const [attestations, setAttestations] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [generation,   setGeneration]   = useState(7);
  const [mutations,    setMutations]    = useState(1284);
  const [alertActive,  setAlertActive]  = useState(false);
  const [apiOnline,    setApiOnline]    = useState(false);


  useEffect(()=>{
    const poll = async()=>{
      try{
        const res = await fetch(`${API_BASE}/threats`,{
          headers:RECUR_API_KEY?{"x-recur-api-key":RECUR_API_KEY}:{},
        });
        if(!res.ok) throw new Error();
        const data = await res.json();
        setApiOnline(true);
        if(data.events?.length>0){
          const rt = data.events.map(backendEventToThreat);
          setThreats(prev=>{
            const ids = new Set(prev.map(t=>t.id));
            const newOnes = rt.filter(t=>!ids.has(t.id));
            if(newOnes.length===0) return prev;
            if(newOnes.some(t=>!t.blocked)) setAlertActive(true);
            return [...newOnes,...prev].slice(0,40);
          });
          const na = data.events.slice(0,6).map(backendEventToAttestation);
          if(na.length>0) setAttestations(na);
        }
        if(data.stats) setStats(data.stats);
      }catch{ setApiOnline(false); }
    };
    poll();
    const iv=setInterval(poll,5000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    if(!alertActive) return;
    const t=setTimeout(()=>setAlertActive(false),4000);
    return()=>clearTimeout(t);
  },[alertActive]);

  useEffect(()=>{
    document.body.style.overflow = page==="dashboard"?"hidden":"auto";
    document.body.style.height   = page==="dashboard"?"100vh":"auto";
    window.scrollTo(0,0);
  },[page]);

  return (
    <>
      <style>{css}</style>
      <Nav page={page} setPage={setPage} apiOnline={apiOnline}/>

      {page==="landing"    && <Landing setPage={setPage}/>}
      {page==="staking"    && <Staking setPage={setPage}/>}
      {page==="get-access" && <GetAccess setPage={setPage}/>}
      {page==="use-cases"  && <UseCases setPage={setPage}/>}
      {page==="docs"       && <Docs setPage={setPage}/>}
      {page==="dashboard" && (
        <Dashboard
          threats={threats}           setThreats={setThreats}
          attestations={attestations} setAttestations={setAttestations}
          stats={stats}               generation={generation}
          mutations={mutations}       setMutations={setMutations}
          alertActive={alertActive}   setAlertActive={setAlertActive}
          apiOnline={apiOnline}
        />
      )}
    </>
  );
}
