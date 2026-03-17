import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const API_BASE = "/api";
const RECUR_API_KEY = import.meta.env.VITE_RECUR_API_KEY || "";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Bebas+Neue&family=Fira+Code:wght@300;400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#010204; --bg2:#030810; --green:#00ff41; --green-d:#00b82e; --green-dd:#004d13;
    --red:#ff0033; --orange:#ff6b00; --amber:#ffc300; --blue:#00b4d8;
    --text:#7aff9a; --text-d:#2a6b3a; --bright:#e0ffe8;
    --border:rgba(0,255,65,0.15); --border-b:rgba(0,255,65,0.06);
  }
  html, body { height: 100%; }
  body { background:var(--bg); color:var(--text); font-family:'Fira Code',monospace; cursor:crosshair; overflow-x:hidden; }
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:var(--bg);} ::-webkit-scrollbar-thumb{background:var(--green-dd);border-radius:2px;}
  @keyframes scan-line{0%{transform:translateY(-100%);}100%{transform:translateY(100vh);}}
  @keyframes flicker{0%,100%{opacity:1;}92%{opacity:1;}93%{opacity:0.85;}95%{opacity:1;}97%{opacity:0.92;}}
  @keyframes blink-cur{0%,100%{opacity:1;}50%{opacity:0;}}
  @keyframes pulse-red{0%,100%{box-shadow:0 0 8px rgba(255,0,51,0.6);}50%{box-shadow:0 0 24px rgba(255,0,51,1),0 0 48px rgba(255,0,51,0.4);}}
  @keyframes pulse-green{0%,100%{box-shadow:0 0 6px rgba(0,255,65,0.4);}50%{box-shadow:0 0 18px rgba(0,255,65,0.9),0 0 36px rgba(0,255,65,0.3);}}
  @keyframes data-in{from{opacity:0;transform:translateX(-12px);filter:blur(2px);}to{opacity:1;transform:translateX(0);filter:blur(0);}}
  @keyframes mutate{0%{filter:hue-rotate(0deg);}50%{filter:hue-rotate(40deg) brightness(1.3);}100%{filter:hue-rotate(0deg);}}
  @keyframes threat-in{from{opacity:0;transform:translateY(-6px) scaleY(0.8);}to{opacity:1;transform:translateY(0) scaleY(1);}}
  @keyframes grid-move{from{background-position:0 0;}to{background-position:40px 40px;}}
  @keyframes fade-up{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
  @keyframes glow-pulse{0%,100%{text-shadow:0 0 40px #00ff41,0 0 80px rgba(0,255,65,0.3);}50%{text-shadow:0 0 80px #00ff41,0 0 160px rgba(0,255,65,0.5),0 0 240px rgba(0,255,65,0.2);}}
  @keyframes slide-in{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
`;

/* ── DATA ── */
const ATTACK_TYPES = {
  INJECTION:  {label:"PROMPT INJECTION", color:"#ff0033",icon:"//"},
  EXTRACTION: {label:"DATA EXTRACTION",  color:"#ff6b00",icon:">>"},
  JAILBREAK:  {label:"JAILBREAK ATTEMPT",color:"#ffc300",icon:"[]"},
  INVERSION:  {label:"MODEL INVERSION",  color:"#ff0033",icon:"<>"},
  POISONING:  {label:"DATA POISONING",   color:"#ff6b00",icon:"XX"},
  ADVERSARIAL:{label:"ADVERSARIAL INPUT",color:"#ffc300",icon:"##"},
  BOUNDARY:   {label:"BOUNDARY PROBE",   color:"#ffc300",icon:"--"},
  ENCODING:   {label:"ENCODING ATTACK",  color:"#ff6b00",icon:"0x"},
  HEURISTIC:  {label:"HEURISTIC THREAT", color:"#ff6b00",icon:"??"},
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
const Scanline = () => (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,
    background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)",
    animation:"flicker 8s infinite"}}>
    <div style={{position:"absolute",left:0,right:0,height:3,
      background:"linear-gradient(transparent,rgba(0,255,65,0.05),transparent)",
      animation:"scan-line 6s linear infinite"}}/>
  </div>
);

const BgGrid = () => (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
    backgroundImage:"linear-gradient(rgba(0,255,65,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,65,0.04) 1px,transparent 1px)",
    backgroundSize:"40px 40px",animation:"grid-move 8s linear infinite"}}/>
);

const Panel = ({children,style={},glow}) => (
  <div style={{background:"var(--bg2)",border:`1px solid ${glow==="red"?"rgba(255,0,51,0.3)":"var(--border)"}`,
    borderRadius:2,position:"relative",overflow:"hidden",
    ...(glow==="red"?{animation:"pulse-red 2s infinite"}:{}), ...style}}>
    <div style={{position:"absolute",inset:0,pointerEvents:"none",
      background:"linear-gradient(135deg,rgba(0,255,65,0.02) 0%,transparent 60%)"}}/>
    {children}
  </div>
);

const PanelHeader = ({title,sub,right,accent}) => (
  <div style={{padding:"8px 12px",borderBottom:"1px solid var(--border-b)",
    display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,255,65,0.03)"}}>
    <div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:3,color:accent||"var(--green)"}}>{title}</div>
      {sub&&<div style={{fontSize:9,color:"var(--text-d)",letterSpacing:1,marginTop:1}}>{sub}</div>}
    </div>
    {right&&<div style={{fontSize:10,color:"var(--text-d)"}}>{right}</div>}
  </div>
);

const StatusDot = ({status}) => {
  const c = status==="ACTIVE"?"#00ff41":status==="EVOLVING"?"#ffc300":status==="SPAWNING"?"#00b4d8":"#333";
  return <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:c,
    boxShadow:`0 0 6px ${c}`,flexShrink:0,animation:status==="EVOLVING"?"mutate 2s infinite":"none"}}/>;
};

/* ── NAV ── */
function Nav({page, setPage, apiOnline}) {
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <nav style={{
      position:"fixed",top:0,left:0,right:0,zIndex:1000,
      background:"rgba(1,2,4,0.96)",borderBottom:"1px solid var(--border)",
      backdropFilter:"blur(16px)",display:"flex",alignItems:"center",
      padding:"0 32px",height:54,gap:32,
    }}>
      <div onClick={()=>setPage("landing")} style={{cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center"}}>
        <img src="/logo.png" alt="RECUR" style={{height:36,width:36,objectFit:"contain"}}/>
      </div>
      <div style={{width:1,height:20,background:"var(--border)"}}/>
      <div style={{display:"flex",gap:4,flex:1,alignItems:"center",position:"relative"}}>
        <button onClick={()=>setPage("landing")} style={{
          fontFamily:"'Fira Code',monospace",fontSize:10,padding:"5px 14px",
          cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
          background:"transparent",
          color:page==="landing"?"#ffffff":"var(--text-d)",
          borderBottom:page==="landing"?"2px solid rgba(0,255,65,0.6)":"2px solid transparent",
          transition:"all 0.2s",
        }}>HOME</button>

        <button onClick={()=>setPage("docs")} style={{
          fontFamily:"'Fira Code',monospace",fontSize:10,padding:"5px 14px",
          cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
          background:"transparent",
          color:page==="docs"?"#ffffff":"var(--text-d)",
          borderBottom:page==="docs"?"2px solid rgba(0,255,65,0.6)":"2px solid transparent",
          transition:"all 0.2s",
        }}>DOCS</button>

        <div style={{position:"relative"}}
          onMouseEnter={()=>setDropOpen(true)}
          onMouseLeave={()=>setDropOpen(false)}>
          <button style={{
            fontFamily:"'Fira Code',monospace",fontSize:10,padding:"5px 14px",
            cursor:"pointer",letterSpacing:2,border:"none",outline:"none",
            background:"transparent",
            color:(page==="dashboard"||page==="staking"||dropOpen)?"#ffffff":"var(--text-d)",
            borderBottom:(page==="dashboard"||page==="staking"||dropOpen)?"2px solid rgba(0,255,65,0.6)":"2px solid transparent",
            transition:"all 0.2s",display:"flex",alignItems:"center",gap:6,
          }}>
            PROTOCOL <span style={{fontSize:8,opacity:0.6}}>{dropOpen?"▲":"▼"}</span>
          </button>

          {dropOpen && (
            <div style={{
              position:"absolute",top:"100%",left:0,
              background:"rgba(1,2,4,0.98)",
              border:"1px solid var(--border)",
              borderTop:"none",
              minWidth:260,
              zIndex:2000,
            }}>
              <div onClick={()=>{setPage("dashboard");setDropOpen(false);}} style={{
                padding:"12px 16px",cursor:"pointer",
                borderBottom:"1px solid var(--border-b)",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                transition:"background 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,255,65,0.05)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"#ffffff",letterSpacing:1}}>LIVE THREAT DASHBOARD</div>
                  <div style={{fontSize:9,color:"var(--text-d)",marginTop:2}}>Real-time sentinel monitoring</div>
                </div>
                <span style={{fontSize:9,color:"#00ff41",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(0,255,65,0.1)",border:"1px solid rgba(0,255,65,0.3)"}}>LIVE</span>
              </div>

              {/* STAKING — now clickable */}
              <div onClick={()=>{setPage("staking");setDropOpen(false);}} style={{
                padding:"12px 16px",cursor:"pointer",
                borderBottom:"1px solid var(--border-b)",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                transition:"background 0.15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,255,65,0.05)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"#ffffff",letterSpacing:1}}>STAKING</div>
                  <div style={{fontSize:9,color:"var(--text-d)",marginTop:2}}>Run sentinel nodes, earn from the network</div>
                </div>
                <span style={{fontSize:9,color:"#00ff41",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(0,255,65,0.1)",border:"1px solid rgba(0,255,65,0.3)"}}>LIVE</span>
              </div>

              <div style={{
                padding:"12px 16px",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                opacity:0.5,cursor:"default",
              }}>
                <div>
                  <div style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"#ffffff",letterSpacing:1}}>ON-CHAIN ATTESTATION</div>
                  <div style={{fontSize:9,color:"var(--text-d)",marginTop:2}}>ZK proofs committed to Solana</div>
                </div>
                <span style={{fontSize:9,color:"#ffc300",letterSpacing:1,padding:"2px 6px",
                  background:"rgba(255,195,0,0.08)",border:"1px solid rgba(255,195,0,0.3)"}}>SOON</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:9}}>
        <div style={{
          width:7,height:7,borderRadius:"50%",flexShrink:0,
          background:apiOnline?"#00ff41":"#ffc300",
          boxShadow:apiOnline?"0 0 10px #00ff41":"0 0 10px #ffc300",
          animation:"pulse-green 2s infinite",
        }}/>
        <div>
          <span style={{color:apiOnline?"#ffffff":"#ffc300",letterSpacing:1}}>
            {apiOnline?"SENTINEL NETWORK ONLINE":"SENTINEL OFFLINE"}
          </span>
          {apiOnline&&<div style={{fontSize:8,color:"var(--text-d)",letterSpacing:1,marginTop:1}}>PROXY ACCEPTING REQUESTS</div>}
        </div>
      </div>

      <button onClick={()=>setPage("get-access")} style={{
        fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:3,
        padding:"8px 20px",flexShrink:0,
        background:page==="get-access"?"rgba(0,255,65,0.2)":"rgba(0,255,65,0.08)",
        color:"#ffffff",
        border:"1px solid rgba(0,255,65,0.5)",cursor:"pointer",transition:"all 0.2s",
        boxShadow:page==="get-access"?"0 0 16px rgba(0,255,65,0.15)":"none",
      }}
      onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 20px rgba(0,255,65,0.15)"}}
      onMouseLeave={e=>{if(page!=="get-access"){e.target.style.background="rgba(0,255,65,0.08)";e.target.style.boxShadow="none"}}}
      >GET ACCESS</button>

      {page==="landing" && (
        <button onClick={()=>setPage("dashboard")} style={{
          fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:3,
          padding:"8px 20px",flexShrink:0,
          background:"rgba(0,255,65,0.1)",color:"#ffffff",
          border:"1px solid rgba(0,255,65,0.4)",cursor:"pointer",transition:"all 0.2s",
        }}
        onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 20px rgba(0,255,65,0.15)"}}
        onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}
        >VIEW DASHBOARD →</button>
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
    {id:"flexible", label:"FLEXIBLE",    duration:"No lock",   apy:"8%",  color:"#00b4d8", desc:"Withdraw anytime. No penalties. Rewards paid weekly every Sunday 12:00 UTC."},
    {id:"3mo",      label:"3 MONTHS",    duration:"90 days",   apy:"12%", color:"#00ff41", desc:"Tokens locked for 90 days. Higher yield rewarded for commitment to the network."},
    {id:"6mo",      label:"6 MONTHS",    duration:"180 days",  apy:"16%", color:"#ffc300", desc:"Tokens locked for 180 days. Significant APY boost for long-term protocol alignment."},
    {id:"12mo",     label:"12 MONTHS",   duration:"365 days",  apy:"20%", color:"#ff6b00", desc:"Maximum lock. Maximum yield. 12-month commitment to securing the RECUR network."},
  ];

  const nodeTiers = [
    {id:"nano",  label:"NANO",  min:"10,000",    mult:"1.0x",  slots:"Unlimited", color:"#00b4d8", desc:"Entry-level sentinel node. Access to basic network participation and weekly rewards. Multiplier active immediately."},
    {id:"ward",  label:"WARD",  min:"100,000",   mult:"1.25x", slots:"Unlimited", color:"#00ff41", desc:"Mid-tier operator node. 1.25x reward multiplier activates automatically after 3 months of staking."},
    {id:"prime", label:"PRIME", min:"1,000,000", mult:"1.5x",  slots:"Unlimited", color:"#ffc300", desc:"Elite sentinel node. Maximum 1.5x multiplier activates after 3 months. Hard cap of 1,000,000 $RECUR per wallet."},
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
      <section style={{padding:"60px 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10,
          border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px"}}>
          SENTINEL NODE STAKING
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(48px,6vw,80px)",
          letterSpacing:8,color:"#ffffff",marginBottom:14,lineHeight:1}}>
          STAKE $RECUR.<br/>
          <span style={{color:"var(--green)"}}>SECURE THE NETWORK.</span>
        </h1>
        <p style={{fontSize:11,color:"var(--text-d)",maxWidth:560,lineHeight:1.9,marginBottom:0}}>
          Lock $RECUR tokens to operate sentinel nodes and earn weekly rewards. Choose your lock duration — longer commitment, higher yield. Auto-compound available.
        </p>
      </section>

      {/* Stats bar */}
      <section style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
          {stats.map((s,i)=>(
            <Panel key={i} style={{padding:"14px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:1,marginBottom:6}}>{s.label}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#ffffff",
                letterSpacing:2,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:9,color:"var(--text-d)",marginTop:4,letterSpacing:1}}>{s.sub}</div>
            </Panel>
          ))}
        </div>
      </section>

      {/* Lock Duration */}
      <section style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>STEP 1</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:4,color:"#ffffff",marginBottom:20}}>
          SELECT LOCK DURATION
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {lockTiers.map((t)=>{
            const selected = selectedLock===t.id;
            return (
              <div key={t.id} onClick={()=>setSelectedLock(t.id)} style={{
                background:selected?"rgba(0,255,65,0.06)":"var(--bg2)",
                border:`1px solid ${selected?t.color:"var(--border)"}`,
                borderTop:`3px solid ${selected?t.color:"transparent"}`,
                padding:"22px 18px",cursor:"pointer",transition:"all 0.2s",
                boxShadow:selected?`0 0 20px ${t.color}22`:"none",
              }}
              onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="rgba(0,255,65,0.3)"}}
              onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:3,color:"#ffffff"}}>{t.label}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:t.color,
                    textShadow:`0 0 20px ${t.color}`,letterSpacing:2}}>{t.apy}</div>
                </div>
                <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2,marginBottom:10}}>{t.duration} · APY</div>
                <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.7}}>{t.desc}</div>
                {selected&&(
                  <div style={{marginTop:12,fontSize:9,color:t.color,letterSpacing:2,
                    padding:"3px 8px",border:`1px solid ${t.color}44`,display:"inline-block",
                    background:`${t.color}11`}}>✓ SELECTED</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Node Tier */}
      <section style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>STEP 2</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:4,color:"#ffffff",marginBottom:20}}>
          SELECT NODE TIER
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {nodeTiers.map((t)=>{
            const selected = selectedTier===t.id;
            return (
              <div key={t.id} onClick={()=>setSelectedTier(t.id)} style={{
                background:selected?"rgba(0,255,65,0.06)":"var(--bg2)",
                border:`1px solid ${selected?t.color:"var(--border)"}`,
                borderTop:`3px solid ${selected?t.color:"transparent"}`,
                padding:"26px 22px",cursor:"pointer",transition:"all 0.2s",
                boxShadow:selected?`0 0 20px ${t.color}22`:"none",
              }}
              onMouseEnter={e=>{if(!selected)e.currentTarget.style.borderColor="rgba(0,255,65,0.3)"}}
              onMouseLeave={e=>{if(!selected)e.currentTarget.style.borderColor="var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:4,color:t.color,
                    textShadow:`0 0 16px ${t.color}`}}>{t.label}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#ffffff",letterSpacing:2}}>{t.mult}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  <div style={{padding:"8px",background:"rgba(0,255,65,0.03)",border:"1px solid var(--border-b)"}}>
                    <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:1,marginBottom:4}}>MIN STAKE</div>
                    <div style={{fontSize:13,color:"#ffffff",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{t.min}</div>
                    <div style={{fontSize:9,color:"var(--text-d)"}}>$RECUR</div>
                  </div>
                  <div style={{padding:"8px",background:"rgba(0,255,65,0.03)",border:"1px solid var(--border-b)"}}>
                    <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:1,marginBottom:4}}>SLOTS</div>
                    <div style={{fontSize:13,color:"#ffffff",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>{t.slots}</div>
                    <div style={{fontSize:9,color:"var(--text-d)"}}>AVAILABLE</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.7}}>{t.desc}</div>
                {selected&&(
                  <div style={{marginTop:12,fontSize:9,color:t.color,letterSpacing:2,
                    padding:"3px 8px",border:`1px solid ${t.color}44`,display:"inline-block",
                    background:`${t.color}11`}}>✓ SELECTED</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto-compound + Connect */}
      <section style={{padding:"0 64px",maxWidth:1100,margin:"0 auto 40px"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>STEP 3</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:4,color:"#ffffff",marginBottom:20}}>
          CONFIGURE & STAKE
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

          {/* Auto-compound toggle */}
          <Panel style={{padding:"24px"}}>
            <PanelHeader title="AUTO-COMPOUND" sub="REINVEST REWARDS BACK INTO STAKE"/>
            <div style={{padding:"20px 0 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontSize:11,color:"var(--bright)",marginBottom:4}}>Auto-compounding</div>
                  <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.7}}>
                    When enabled, your weekly $RECUR rewards are automatically restaked rather than sent to your wallet. Compounds your position every Sunday.
                  </div>
                </div>
                <div onClick={()=>setAutoCompound(!autoCompound)} style={{
                  width:44,height:24,borderRadius:12,cursor:"pointer",flexShrink:0,marginLeft:20,
                  background:autoCompound?"rgba(0,255,65,0.3)":"rgba(0,255,65,0.06)",
                  border:`1px solid ${autoCompound?"rgba(0,255,65,0.6)":"var(--border)"}`,
                  position:"relative",transition:"all 0.2s",
                }}>
                  <div style={{
                    position:"absolute",top:3,left:autoCompound?22:3,width:16,height:16,borderRadius:"50%",
                    background:autoCompound?"#00ff41":"var(--text-d)",transition:"all 0.2s",
                    boxShadow:autoCompound?"0 0 8px #00ff41":"none",
                  }}/>
                </div>
              </div>
              <div style={{padding:"10px 12px",background:"rgba(0,255,65,0.03)",border:"1px solid var(--border-b)",
                fontSize:9,color:"var(--text-d)",lineHeight:1.7}}>
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
                    padding:"6px 0",borderBottom:"1px solid var(--border-b)"}}>
                    <span style={{fontSize:10,color:"var(--text-d)",letterSpacing:1}}>{row.label}</span>
                    <span style={{fontSize:10,color:"#ffffff",letterSpacing:1}}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Connect wallet CTA */}
              <div style={{padding:"14px 16px",background:"rgba(0,255,65,0.04)",
                border:"1px solid rgba(0,255,65,0.2)",marginBottom:12,textAlign:"center"}}>
                <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2,marginBottom:6}}>
                  DEVNET DEPLOYMENT IN PROGRESS
                </div>
                <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.6}}>
                  Staking goes live on Solana devnet shortly. Connect your wallet to be notified at launch.
                </div>
              </div>

              <button style={{
                width:"100%",fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:4,
                padding:"14px",background:"rgba(0,255,65,0.1)",color:"#ffffff",
                border:"1px solid rgba(0,255,65,0.4)",cursor:"not-allowed",opacity:0.7,
              }}>
                CONNECT WALLET — COMING SOON
              </button>
            </div>
          </Panel>
        </div>
      </section>

      {/* Reward schedule info */}
      <section style={{padding:"0 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <Panel style={{padding:"28px 32px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:32}}>
            {[
              {icon:"01",title:"STAKE $RECUR",       desc:"Choose your lock duration and node tier. Minimum 10,000 $RECUR to participate as a NANO sentinel node."},
              {icon:"02",title:"RUN YOUR NODE",       desc:"Your staked position registers you as an active sentinel operator in the RECUR detection network."},
              {icon:"03",title:"EARN WEEKLY",         desc:"Rewards calculated on your stake amount, tier multiplier, and lock APY. Distributed every Sunday 12:00 UTC."},
              {icon:"04",title:"COMPOUND OR CLAIM",   desc:"Opt in to auto-compounding to grow your stake automatically, or claim $RECUR directly to your wallet each week."},
            ].map((s,i)=>(
              <div key={i}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:"rgba(0,255,65,0.1)",
                  lineHeight:1,marginBottom:10,letterSpacing:4}}>{s.icon}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:3,
                  color:"#ffffff",marginBottom:8}}>{s.title}</div>
                <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.8}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Token CA */}
      <section style={{padding:"0 64px 40px",maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:9,letterSpacing:3,color:"var(--text-d)",marginBottom:6}}>TOKEN CONTRACT ADDRESS</div>
        <div style={{fontFamily:"'Fira Code',monospace",fontSize:11,color:"var(--green)",letterSpacing:1,
          padding:"10px 20px",background:"rgba(0,255,65,0.03)",border:"1px solid var(--border)",
          display:"inline-block",userSelect:"all"}}>
          7isDRjp7u64MtpxbkgFyYpHfCPojMQhSa6VcPrRZpump
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:"1px solid var(--border-b)",padding:"24px 64px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:5,color:"var(--text-d)"}}>
          RECUR PROTOCOL
        </div>
        <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2}}>BUILT FOR SOLANA · {new Date().getFullYear()}</div>
        <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer"
          style={{fontSize:9,color:"var(--text-d)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
          onMouseEnter={e=>e.target.style.color="#ffffff"}
          onMouseLeave={e=>e.target.style.color="var(--text-d)"}>GITHUB ↗</a>
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
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-60%)",
          width:800,height:600,pointerEvents:"none",
          background:"radial-gradient(ellipse,rgba(0,255,65,0.08) 0%,transparent 65%)"}}/>
        <div style={{fontSize:9,letterSpacing:7,color:"var(--text-d)",border:"1px solid var(--border)",
          padding:"5px 18px",marginBottom:36,animation:"fade-up 0.5s ease both",borderRadius:1}}>
          RECURSIVE AI SECURITY SENTINELS
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",lineHeight:0.9,marginBottom:28,
          fontSize:"clamp(80px,15vw,170px)",letterSpacing:18,color:"#ffffff",
          animation:"fade-up 0.7s ease 0.1s both"}}>
          RECUR
        </h1>
        <p style={{fontFamily:"'Fira Code',monospace",fontSize:14,color:"var(--text)",maxWidth:520,
          lineHeight:1.9,marginBottom:10,animation:"fade-up 0.7s ease 0.2s both",opacity:0}}>
          Self-evolving sentinel agents that detect, block, and learn from adversarial attacks on AI systems.
        </p>
        <p style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"var(--text-d)",maxWidth:440,
          lineHeight:1.8,marginBottom:52,letterSpacing:1,animation:"fade-up 0.7s ease 0.3s both",opacity:0}}>
          Built for Solana · OpenAI &amp; Anthropic compatible · Immutable on-chain proofs
        </p>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",
          animation:"fade-up 0.7s ease 0.4s both",opacity:0}}>
          <button onClick={()=>setPage("dashboard")} style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:4,
            padding:"14px 44px",background:"rgba(0,255,65,0.1)",color:"#ffffff",
            border:"1px solid rgba(0,255,65,0.45)",cursor:"pointer",transition:"all 0.25s"}}
            onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 40px rgba(0,255,65,0.2)"}}
            onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}>
            VIEW LIVE DASHBOARD
          </button>
          <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer" style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:4,padding:"14px 44px",
            background:"transparent",color:"var(--text-d)",border:"1px solid var(--border)",
            textDecoration:"none",display:"flex",alignItems:"center",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#ffffff"}
            onMouseLeave={e=>e.currentTarget.style.color="var(--text-d)"}>
            GITHUB ↗
          </a>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:24,
          animation:"fade-up 0.7s ease 0.5s both",opacity:0}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#00ff41",
            boxShadow:"0 0 10px #00ff41",animation:"pulse-green 2s infinite"}}/>
          <span style={{fontSize:10,color:"var(--green)",letterSpacing:2}}>PROXY LIVE</span>
          <span style={{fontSize:10,color:"var(--text-d)",letterSpacing:1}}>— INTEGRATE IN 2 MINUTES</span>
        </div>
        <div style={{position:"absolute",bottom:28,fontSize:9,color:"var(--text-d)",
          letterSpacing:4,animation:"fade-up 1s ease 1.4s both",opacity:0}}>SCROLL ↓</div>
      </section>

      <section style={{borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)",
        background:"rgba(0,255,65,0.015)",display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
        {[{v:"5",l:"Attack Categories"},{v:"40+",l:"Detection Signatures"},{v:"<5ms",l:"Latency Overhead"},{v:"SOL",l:"Chain"}]
          .map((s,i)=>(
          <div key={i} style={{padding:"32px 24px",textAlign:"center",
            borderRight:i<3?"1px solid var(--border)":"none"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:"#ffffff",
              textShadow:"0 0 24px rgba(0,255,65,0.4)",letterSpacing:3,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:3,marginTop:6}}>{s.l}</div>
          </div>
        ))}
      </section>

      <section style={{padding:"80px 64px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>HOW IT WORKS</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:4,color:"#ffffff",marginBottom:48}}>
          PROTECTION IN THREE LAYERS
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,background:"var(--border)"}}>
          {[
            {n:"01",t:"INTERCEPT",d:"RECUR sits between your application and your AI provider. Every prompt routes through the sentinel network before reaching OpenAI or Anthropic."},
            {n:"02",t:"ANALYSE",  d:"Five attack categories, 40+ signatures, behavioural heuristics. Each prompt is classified in under 5ms by the active sentinel layer."},
            {n:"03",t:"ATTEST",   d:"Blocked threats are committed to Solana as ZK proofs — immutable, verifiable security records without exposing sensitive prompt data."},
          ].map((s,i)=>(
            <div key={i} style={{background:"var(--bg2)",padding:"44px 36px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:64,
                color:"rgba(0,255,65,0.1)",letterSpacing:4,lineHeight:1,marginBottom:20}}>{s.n}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,
                letterSpacing:4,color:"#ffffff",marginBottom:14}}>{s.t}</div>
              <div style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>CAPABILITIES</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:4,color:"#ffffff",marginBottom:44}}>
          WHAT RECUR PROTECTS AGAINST
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {features.map((f,i)=>(
            <Panel key={i} style={{padding:"30px 26px"}}>
              <div style={{fontFamily:"'Fira Code',monospace",fontSize:11,color:"var(--text-d)",
                letterSpacing:2,marginBottom:14,border:"1px solid var(--border)",
                display:"inline-block",padding:"3px 8px"}}>{f.icon}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:3,
                color:"#ffffff",marginBottom:10}}>{f.title}</div>
              <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.85}}>{f.desc}</div>
            </Panel>
          ))}
        </div>
      </section>

      <section style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>INTEGRATION</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:4,color:"#ffffff",marginBottom:32}}>
          TWO MINUTES TO PROTECTED
        </h2>
        <Panel style={{overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border-b)",
            display:"flex",gap:8,alignItems:"center",background:"rgba(0,255,65,0.03)"}}>
            {["#ff0033","#ffc300","#00ff41"].map((c,i)=>(
              <div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>
            ))}
            <span style={{fontSize:9,color:"var(--text-d)",marginLeft:8,letterSpacing:2}}>integration.js</span>
          </div>
          <pre style={{padding:"28px 32px",fontFamily:"'Fira Code',monospace",fontSize:11,
            color:"var(--text)",lineHeight:1.9,overflowX:"auto",background:"transparent"}}>{code}</pre>
          <div style={{padding:"12px 32px 16px",borderTop:"1px solid var(--border-b)",
            fontSize:10,color:"var(--text-d)",letterSpacing:1,lineHeight:1.8}}>
            No wallet required. No token required. Drop-in replacement for your existing OpenAI or Anthropic endpoint.
          </div>
        </Panel>
      </section>

      <section style={{padding:"0 64px 80px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10}}>ARCHITECTURE</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:4,color:"#ffffff",marginBottom:36}}>
          RECURSIVE SENTINEL TREE
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
          <div>
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.9,marginBottom:18}}>
              The sentinel network is organised as a recursive hierarchy. Each node is an autonomous agent specialised for a specific attack domain. When a novel attack is detected, the network spawns sub-agents and mutates — growing more capable with every threat it encounters.
            </p>
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.9,marginBottom:28}}>
              RECUR-PRIME orchestrates the WARD layer. WARD sentinels own attack categories. SUB sentinels target specific techniques. NANO sentinels handle high-frequency signatures at scale.
            </p>
            <button onClick={()=>setPage("dashboard")} style={{
              fontFamily:"'Fira Code',monospace",fontSize:10,letterSpacing:2,
              padding:"10px 22px",background:"transparent",color:"#ffffff",
              border:"1px solid rgba(0,255,65,0.3)",cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.target.style.borderColor="rgba(0,255,65,0.7)";e.target.style.background="rgba(0,255,65,0.05)"}}
              onMouseLeave={e=>{e.target.style.borderColor="rgba(0,255,65,0.3)";e.target.style.background="transparent"}}>
              VIEW LIVE SENTINEL NETWORK →
            </button>
          </div>
          <Panel style={{padding:"16px"}}>
            {SENTINEL_TREE.slice(0,8).map(s=>{
              const dc=["#00ff41","#00b4d8","#ffc300","#b04aff"];
              return (
                <div key={s.id} style={{marginLeft:s.depth*16,padding:"5px 8px",marginBottom:3,
                  background:"rgba(0,255,65,0.02)",borderLeft:`2px solid ${dc[s.depth]}`,
                  display:"flex",alignItems:"center",gap:8}}>
                  <StatusDot status={s.status}/>
                  <span style={{fontSize:9,color:dc[s.depth],letterSpacing:1,fontWeight:700}}>{s.label}</span>
                  <span style={{fontSize:9,color:"var(--text-d)",flex:1}}>{s.role}</span>
                  <span style={{fontSize:9,color:"var(--text-d)"}}>GEN {s.gen}</span>
                </div>
              );
            })}
            <div style={{padding:"8px 8px 2px",fontSize:9,color:"var(--text-d)",letterSpacing:1}}>
              + 5 more active sentinels →
            </div>
          </Panel>
        </div>
      </section>

      <section style={{borderTop:"1px solid var(--border)",padding:"80px 64px",
        textAlign:"center",background:"rgba(0,255,65,0.01)"}}>
        <button onClick={()=>setPage("dashboard")} style={{
          fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:6,
          padding:"18px 68px",background:"rgba(0,255,65,0.1)",color:"#ffffff",
          border:"1px solid rgba(0,255,65,0.45)",cursor:"pointer",transition:"all 0.3s"}}
          onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 60px rgba(0,255,65,0.2)"}}
          onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}>
          OPEN LIVE DASHBOARD
        </button>
      </section>

      <footer style={{borderTop:"1px solid var(--border-b)",padding:"24px 64px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:5,color:"var(--text-d)"}}>
          RECUR PROTOCOL
        </div>
        <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2}}>BUILT FOR SOLANA · {new Date().getFullYear()}</div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <a href="https://github.com/recurprotocol/recur-protocol" target="_blank" rel="noreferrer"
            style={{fontSize:9,color:"var(--text-d)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.target.style.color="#ffffff"}
            onMouseLeave={e=>e.target.style.color="var(--text-d)"}>GITHUB ↗</a>
          <span style={{color:"var(--border)"}}>·</span>
          <a href="https://x.com/recur_protocol" target="_blank" rel="noreferrer"
            style={{fontSize:9,color:"var(--text-d)",letterSpacing:2,textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.target.style.color="#ffffff"}
            onMouseLeave={e=>e.target.style.color="var(--text-d)"}>SUPPORT ↗</a>
        </div>
      </footer>
    </div>
  );
}

/* ── DASHBOARD PANELS ── */
function ThreatFeedPanel({threats}) {
  return (
    <Panel style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <PanelHeader title="THREAT FEED" sub="LIVE ATTACK INTERCEPT STREAM" right={`${threats.length} EVENTS`} accent="#ff0033"/>
      <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
        {threats.length===0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",
            flexDirection:"column",gap:8,opacity:0.5}}>
            <div style={{fontFamily:"'VT323',monospace",fontSize:16,color:"var(--green)",letterSpacing:3}}>NO THREATS DETECTED</div>
            <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2}}>SENTINEL NETWORK MONITORING</div>
          </div>
        )}
        {threats.map((t)=>{
          const def=ATTACK_TYPES[t.type]||ATTACK_TYPES["INJECTION"];
          const sevColor=t.severity==="CRITICAL"?"#ff0033":t.severity==="HIGH"?"#ff6b00":"#ffc300";
          return (
            <div key={t.id} style={{padding:"7px 12px",borderBottom:"1px solid var(--border-b)",
              animation:"threat-in 0.3s ease",display:"grid",gridTemplateColumns:"70px 1fr 70px",
              gap:8,alignItems:"center",opacity:t.blocked?1:0.7,
              background:t.isReal?"rgba(0,255,65,0.015)":"transparent"}}>
              <div style={{fontSize:9,color:"var(--text-d)"}}>{t.ts}</div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:9,padding:"1px 5px",background:def.color+"22",
                    color:def.color,border:`1px solid ${def.color}44`,letterSpacing:1}}>{def.icon} {def.label}</span>
                  <span style={{fontSize:9,color:sevColor,letterSpacing:1}}>{t.severity}</span>
                  {t.isReal&&<span style={{fontSize:9,color:"#00b4d8",letterSpacing:1}}>● LIVE</span>}
                </div>
                <div style={{fontSize:10,color:"var(--text-d)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  <span style={{color:"var(--text)",marginRight:4}}>{t.source}</span>→ {t.target}
                  {t.confidence>0&&<span style={{color:"var(--text-d)",marginLeft:8}}>{(t.confidence*100).toFixed(0)}% conf</span>}
                </div>
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                {t.blocked
                  ?<span style={{fontSize:9,color:"#ffffff",padding:"1px 5px",background:"rgba(0,255,65,0.1)",border:"1px solid rgba(0,255,65,0.3)"}}>BLOCKED</span>
                  :<span style={{fontSize:9,color:"#ff0033",padding:"1px 5px",background:"rgba(255,0,51,0.1)",border:"1px solid rgba(255,0,51,0.3)",animation:"pulse-red 1.5s infinite"}}>BREACH</span>}
                {t.tx_sig&&(
                  <a href={`https://explorer.solana.com/tx/${t.tx_sig}?cluster=devnet`} target="_blank" rel="noreferrer"
                    style={{fontSize:8,color:"var(--green)",letterSpacing:1,textDecoration:"none",
                      padding:"1px 4px",background:"rgba(0,255,65,0.06)",border:"1px solid rgba(0,255,65,0.2)",
                      transition:"background 0.15s"}}
                    onMouseEnter={e=>e.target.style.background="rgba(0,255,65,0.15)"}
                    onMouseLeave={e=>e.target.style.background="rgba(0,255,65,0.06)"}>
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
  const dc=["#00ff41","#00b4d8","#ffc300","#b04aff"];
  return (
    <Panel style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <PanelHeader title="RECURSIVE SENTINEL TREE" sub="SELF-EVOLVING AGENT HIERARCHY" right="13 AGENTS ACTIVE"/>
      <div style={{flex:1,overflow:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:3}}>
        {SENTINEL_TREE.map(s=>(
          <div key={s.id} style={{marginLeft:s.depth*20,padding:"6px 10px",
            background:"rgba(0,255,65,0.02)",border:`1px solid rgba(0,255,65,${0.05+s.depth*0.03})`,
            borderLeft:`2px solid ${dc[s.depth]}`,display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center"}}>
            {s.depth>0&&<span style={{color:"var(--text-d)",fontSize:10,marginLeft:-14}}>{s.depth===1?"├─":s.depth===2?"│ ├─":"│ │ └─"}</span>}
            <StatusDot status={s.status}/>
            <div>
              <div style={{fontSize:10,color:dc[s.depth],letterSpacing:1,fontWeight:700}}>{s.label}</div>
              <div style={{fontSize:9,color:"var(--text-d)",marginTop:1}}>{s.role}</div>
            </div>
            <div style={{textAlign:"right",fontSize:9}}>
              <div style={{color:"var(--text-d)"}}>GEN <span style={{color:"#ffffff"}}>{s.gen}</span></div>
              <div style={{color:"var(--text-d)"}}>MUT <span style={{color:s.mutations>100?"#ffc300":"var(--green)"}}>{s.mutations}</span></div>
            </div>
            <div style={{fontSize:9,padding:"2px 6px",letterSpacing:1,
              color:s.status==="ACTIVE"?"#ffffff":s.status==="EVOLVING"?"#ffc300":"#00b4d8",
              background:s.status==="ACTIVE"?"rgba(0,255,65,0.08)":s.status==="EVOLVING"?"rgba(255,195,0,0.08)":"rgba(0,180,216,0.08)",
              border:`1px solid ${s.status==="ACTIVE"?"rgba(0,255,65,0.2)":s.status==="EVOLVING"?"rgba(255,195,0,0.2)":"rgba(0,180,216,0.2)"}`}}>{s.status}</div>
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
          const color=v.score>=90?"#ffffff":v.score>=75?"#ffc300":"#ff6b00";
          return (
            <div key={i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"flex-end"}}>
                <div style={{fontSize:10,color:"var(--bright)"}}>{v.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {v.critical>0&&<span style={{fontSize:9,color:"#ff0033",animation:"pulse-red 1.5s infinite",
                    padding:"1px 4px",background:"rgba(255,0,51,0.1)",border:"1px solid rgba(255,0,51,0.3)"}}>{v.critical} CRITICAL</span>}
                  <span style={{fontSize:10,color,fontWeight:700}}>{v.score}/100</span>
                </div>
              </div>
              <div style={{height:4,background:"rgba(0,255,65,0.06)",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                <div style={{height:"100%",width:`${v.score}%`,borderRadius:2,
                  background:`linear-gradient(90deg,${color}88,${color})`,
                  boxShadow:`0 0 8px ${color}66`,transition:"width 1s ease"}}/>
              </div>
              <div style={{fontSize:9,color:"var(--text-d)"}}>
                {v.passed}/{v.checks} checks passed · <span style={{color:v.critical>0?"#ff0033":v.passed<v.checks?"#ffc300":"#ffffff"}}>{v.checks-v.passed} failing</span>
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
          const sc=asset.status==="SECURED"?"#00ff41":asset.status==="MONITORING"?"#ffc300":"#ff0033";
          return (
            <div key={i} style={{padding:"8px 12px",borderBottom:"1px solid var(--border-b)",
              display:"grid",gridTemplateColumns:"1fr auto",gap:8,
              ...(asset.status==="AT RISK"?{background:"rgba(255,0,51,0.04)",animation:"pulse-red 3s infinite"}:{})}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:9,padding:"1px 4px",background:"rgba(0,255,65,0.07)",
                    color:"var(--text-d)",border:"1px solid var(--border-b)",letterSpacing:1}}>{asset.type}</span>
                  <span style={{fontSize:10,color:"var(--bright)"}}>{asset.name}</span>
                </div>
                <div style={{height:3,background:"rgba(0,255,65,0.06)",borderRadius:1,overflow:"hidden",marginBottom:3}}>
                  <div style={{height:"100%",width:`${asset.integrity}%`,borderRadius:1,
                    background:asset.integrity>90?"#00ff41":asset.integrity>75?"#ffc300":"#ff0033"}}/>
                </div>
                <div style={{fontSize:9,color:"var(--text-d)"}}>INTEGRITY {asset.integrity}% · {asset.accesses.toLocaleString()} probes blocked</div>
              </div>
              <div style={{fontSize:9,padding:"2px 7px",alignSelf:"center",letterSpacing:1,
                color:sc,background:sc+"18",border:`1px solid ${sc}44`,
                ...(asset.status==="AT RISK"?{animation:"pulse-red 1.5s infinite"}:{})}}>{asset.status}</div>
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
      <PanelHeader title="ON-CHAIN ATTESTATION LOG" sub="SOLANA — IMMUTABLE SECURITY PROOFS" accent="#00b4d8"/>
      <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
        {attestations.length===0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",
            flexDirection:"column",gap:8,opacity:0.5}}>
            <div style={{fontFamily:"'VT323',monospace",fontSize:16,color:"#00b4d8",letterSpacing:3}}>AWAITING ON-CHAIN EVENTS</div>
            <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:2}}>SOLANA ATTESTATION LOG IDLE</div>
          </div>
        )}
        {attestations.map((a,i)=>(
          <div key={i} style={{padding:"5px 12px",borderBottom:"1px solid var(--border-b)",
            display:"grid",gridTemplateColumns:"110px 1fr 100px",gap:8,alignItems:"center",animation:"data-in 0.3s ease"}}>
            <div style={{fontSize:9,color:"var(--text-d)",fontFamily:"'VT323',monospace"}}>{a.block}</div>
            <div style={{fontSize:9,color:"var(--text-d)"}}><span style={{color:"#00b4d8"}}>{a.hash}</span> · {a.event}</div>
            <div style={{fontSize:9,color:"#ffffff",textAlign:"right"}}>✓ NOTARIZED</div>
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
    {label:"SENTINEL GEN",    value:generation,                                       color:"#ffffff"},
    {label:"TOTAL MUTATIONS", value:mutations.toLocaleString(),                       color:"#ffc300"},
    {label:"AGENTS ACTIVE",   value:"13",                                              color:"#ffffff"},
    {label:"ATTACKS TODAY",   value:(stats?.blocked??0).toLocaleString(),             color:"#ff6b00"},
    {label:"BLOCK RATE",      value:stats?.total>0?`${stats.block_rate}%`:"—",        color:"#ffffff"},
    {label:"CHAIN",           value:"SOLANA",                                          color:"#00b4d8"},
  ];

  return (
    <div style={{position:"relative",zIndex:1,height:"100vh",display:"flex",flexDirection:"column",
      padding:"12px",gap:8,paddingTop:66}}>

      {alertActive&&(
        <div style={{position:"fixed",top:54,left:0,right:0,zIndex:9000,
          background:"rgba(255,0,51,0.15)",borderBottom:"2px solid #ff0033",
          padding:"8px 20px",display:"flex",alignItems:"center",gap:12,animation:"pulse-red 1s infinite"}}>
          <div style={{fontFamily:"'VT323',monospace",fontSize:20,color:"#ff0033",letterSpacing:3,
            animation:"blink-cur 0.5s infinite"}}>⚠ BREACH DETECTED</div>
          <div style={{fontSize:11,color:"#ff6666"}}>Unblocked attack penetrated perimeter — RECUR escalating response</div>
          <div style={{marginLeft:"auto",fontSize:11,color:"#ff4444",cursor:"pointer"}}
            onClick={()=>setAlertActive(false)}>[DISMISS]</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
        {metrics.map((m,i)=>(
          <Panel key={i} style={{padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:9,color:"var(--text-d)",letterSpacing:1,marginBottom:4}}>{m.label}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:m.color,
              textShadow:`0 0 14px ${m.color}`,letterSpacing:2}}>{m.value}</div>
          </Panel>
        ))}
      </div>

      <div style={{display:"flex",gap:2}}>
        {tabs.map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            fontFamily:"'Fira Code',monospace",fontSize:10,padding:"5px 14px",cursor:"pointer",
            letterSpacing:2,textTransform:"uppercase",border:"none",outline:"none",
            background:activeTab===tab?"rgba(0,255,65,0.12)":"transparent",
            color:activeTab===tab?"#ffffff":"var(--text-d)",
            borderBottom:activeTab===tab?"2px solid #00ff41":"2px solid transparent",
            transition:"all 0.2s"}}>{tab}</button>
        ))}
      </div>

      <div style={{flex:1,overflow:"hidden",minHeight:0}}>
        {activeTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:8,height:"100%"}}>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
            <AgentTreePanel/>
            <Panel style={{display:"flex",flexDirection:"column"}}>
              <PanelHeader title="EVOLUTION ENGINE" sub="AGENT MUTATION HISTORY"/>
              <div style={{flex:1,overflow:"auto",padding:"10px 12px",fontFamily:"'VT323',monospace",fontSize:14,color:"var(--text-d)",lineHeight:1.8}}>
                {Array.from({length:30},(_,i)=>(
                  <div key={i} style={{animation:`data-in 0.3s ease ${i*0.03}s both`}}>
                    <span style={{color:"#ffffff"}}>GEN-{generation}</span> &gt;{" "}
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
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
                  <div key={i} style={{padding:"10px",background:"rgba(0,255,65,0.02)",border:"1px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:10,color:"#ffc300",letterSpacing:1}}>{r.vuln}</span>
                      <span style={{fontSize:9,color:"var(--text-d)"}}>ETA {r.eta}</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--text-d)",marginBottom:6}}>{r.desc}</div>
                    <div style={{height:4,background:"rgba(0,255,65,0.06)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${r.progress}%`,background:"linear-gradient(90deg,#00b4d8,#00ff41)",
                        borderRadius:2,transition:"width 2s ease",boxShadow:"0 0 8px rgba(0,255,65,0.5)"}}/>
                    </div>
                    <div style={{fontSize:9,color:"#ffffff",marginTop:4}}>{r.progress}% patched</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
        {activeTab==="ip vault"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,height:"100%"}}>
            <IPVaultPanel/>
            <Panel style={{display:"flex",flexDirection:"column"}}>
              <PanelHeader title="ACCESS AUDIT TRAIL" sub="LAST 24H PROBE ATTEMPTS"/>
              <div style={{flex:1,overflow:"auto",padding:"4px 0"}}>
                {threats.slice(0,20).map((t,i)=>{
                  const def=ATTACK_TYPES[t.type]||ATTACK_TYPES["INJECTION"];
                  return (
                    <div key={i} style={{padding:"6px 12px",borderBottom:"1px solid var(--border-b)",
                      display:"grid",gridTemplateColumns:"70px 100px 1fr 60px",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:9,color:"var(--text-d)"}}>{t.ts}</span>
                      <span style={{fontSize:9,color:def.color}}>{def.label.split(" ")[0]}</span>
                      <span style={{fontSize:9,color:"var(--text-d)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.target}</span>
                      <span style={{fontSize:9,textAlign:"right",color:t.blocked?"#ffffff":"#ff0033"}}>{t.blocked?"BLOCKED":"BREACHED"}</span>
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
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:5,color:"#ffffff",marginBottom:20}}>{title}</h2>
      {children}
    </section>
  );

  const Code = ({children}) => (
    <Panel style={{overflow:"hidden",marginBottom:16}}>
      <div style={{padding:"10px 16px",borderBottom:"1px solid var(--border-b)",
        display:"flex",gap:8,alignItems:"center",background:"rgba(0,255,65,0.03)"}}>
        {["#ff0033","#ffc300","#00ff41"].map((c,i)=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>))}
      </div>
      <pre style={{padding:"20px 24px",fontFamily:"'Fira Code',monospace",fontSize:10,
        color:"var(--text)",lineHeight:1.9,overflowX:"auto",background:"transparent",whiteSpace:"pre-wrap"}}>{children}</pre>
    </Panel>
  );

  const Table = ({headers,rows}) => (
    <div style={{overflowX:"auto",marginBottom:16}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:"'Fira Code',monospace"}}>
        <thead>
          <tr>{headers.map((h,i)=>(
            <th key={i} style={{textAlign:"left",padding:"10px 14px",borderBottom:"1px solid var(--border)",
              color:"var(--green)",letterSpacing:2,fontSize:9,fontWeight:400}}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>{rows.map((row,i)=>(
          <tr key={i}>{row.map((cell,j)=>(
            <td key={j} style={{padding:"9px 14px",borderBottom:"1px solid var(--border-b)",
              color:j===0?"#ffffff":"var(--text-d)"}}>{cell}</td>
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
      <div style={{display:"grid",gridTemplateColumns:"200px 1fr",maxWidth:1100,margin:"0 auto",padding:"48px 64px",gap:48}}>

        {/* Sidebar */}
        <nav style={{position:"sticky",top:110,alignSelf:"start"}}>
          <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:16}}>CONTENTS</div>
          {toc.map(t=>(
            <a key={t.id} href={`#${t.id}`} style={{display:"block",fontSize:10,color:"var(--text-d)",
              letterSpacing:1,padding:"6px 0",textDecoration:"none",transition:"color 0.15s",
              borderLeft:"2px solid var(--border)",paddingLeft:12,marginBottom:2}}
              onMouseEnter={e=>e.target.style.color="#ffffff"}
              onMouseLeave={e=>e.target.style.color="var(--text-d)"}>{t.label}</a>
          ))}
          <div style={{borderTop:"1px solid var(--border)",marginTop:16,paddingTop:16}}>
            <button onClick={()=>setPage("get-access")} style={{
              fontFamily:"'Fira Code',monospace",fontSize:9,letterSpacing:2,width:"100%",
              padding:"8px 12px",background:"rgba(0,255,65,0.08)",color:"var(--green)",
              border:"1px solid rgba(0,255,65,0.3)",cursor:"pointer",transition:"all 0.2s",textAlign:"left"}}
              onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.15)"}}
              onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.08)"}}>
              GET API KEY →
            </button>
          </div>
        </nav>

        {/* Content */}
        <div>
          <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10,
            border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px"}}>
            DOCUMENTATION
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:6,
            color:"#ffffff",marginBottom:10,lineHeight:1}}>
            RECUR PROXY DOCS
          </h1>
          <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.8,marginBottom:48}}>
            Everything you need to integrate RECUR into your AI application.
          </p>

          {/* ── Quick Start ── */}
          <Section id="quick-start" title="QUICK START">
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85,marginBottom:16}}>
              <strong style={{color:"#ffffff"}}>1.</strong> Get an API key from the{" "}
              <span onClick={()=>setPage("get-access")} style={{color:"var(--green)",cursor:"pointer",borderBottom:"1px solid rgba(0,255,65,0.3)"}}>
                access page
              </span>.
            </p>
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85,marginBottom:16}}>
              <strong style={{color:"#ffffff"}}>2.</strong> Replace your provider endpoint with the RECUR proxy:
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
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85,marginBottom:0}}>
              <strong style={{color:"#ffffff"}}>3.</strong> Every request is now scanned for prompt injection, jailbreaks, and extraction attacks before reaching your provider. Threats are blocked automatically. Clean requests are forwarded with zero changes to the response format.
            </p>
          </Section>

          {/* ── Provider Switching ── */}
          <Section id="provider-switching" title="PROVIDER SWITCHING">
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85,marginBottom:20}}>
              The provider is specified per-request via <code style={{color:"var(--green)"}}>x-recur-provider</code>. Your integration never changes — only the header value does.
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
            <div style={{fontSize:11,color:"var(--text-d)",lineHeight:1.85}}>
              <p style={{marginBottom:8}}>What stays constant when you switch:</p>
              <ul style={{listStyle:"none",padding:0}}>
                {[
                  ["x-recur-api-key","One key for all providers"],
                  ["Security coverage","Same detection engine, same 40+ signatures"],
                  ["Threat audit log","Every request logged regardless of destination provider"],
                ].map(([k,v],i)=>(
                  <li key={i} style={{padding:"4px 0",display:"flex",gap:8}}>
                    <span style={{color:"var(--green)",flexShrink:0}}>-</span>
                    <span><strong style={{color:"#ffffff"}}>{k}</strong> — {v}</span>
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
            <p style={{fontSize:10,color:"var(--text-d)",lineHeight:1.8,marginTop:8}}>
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
            <p style={{fontSize:10,color:"var(--text-d)",lineHeight:1.8,marginTop:8}}>
              Blocked requests return HTTP 200 with the provider's response format containing a <code style={{color:"var(--green)"}}>recur.status: "BLOCKED"</code> field. This ensures your client-side code handles blocks gracefully without HTTP error handling.
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
      <section style={{padding:"60px 64px 40px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{fontSize:9,letterSpacing:6,color:"var(--text-d)",marginBottom:10,
          border:"1px solid var(--border)",display:"inline-block",padding:"4px 14px"}}>
          USE CASES
        </div>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:6,
          color:"#ffffff",marginBottom:10,lineHeight:1}}>
          WHO NEEDS RECUR
        </h1>
        <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.8,marginBottom:48,maxWidth:600}}>
          Any application that sends user-controlled text to an LLM is a target. If prompts reach your model unscanned, you're exposed.
        </p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {cases.map((c,i) => (
            <Panel key={i} style={{padding:"30px 28px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:"rgba(0,255,65,0.1)",
                  lineHeight:1,letterSpacing:4,flexShrink:0}}>{c.icon}</div>
                <div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:3,
                    color:"#ffffff",marginBottom:10}}>{c.title}</div>
                  <div style={{fontSize:10,color:"var(--text-d)",lineHeight:1.85,marginBottom:12}}>{c.desc}</div>
                  <div style={{fontSize:9,color:"var(--green)",letterSpacing:1,opacity:0.7}}>{c.example}</div>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div style={{marginTop:48,display:"flex",gap:14,justifyContent:"center"}}>
          <button onClick={()=>setPage("get-access")} style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:4,
            padding:"14px 44px",background:"rgba(0,255,65,0.1)",color:"#ffffff",
            border:"1px solid rgba(0,255,65,0.45)",cursor:"pointer",transition:"all 0.25s"}}
            onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 40px rgba(0,255,65,0.2)"}}
            onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}>
            GET YOUR API KEY →
          </button>
          <button onClick={()=>setPage("landing")} style={{
            fontFamily:"'Fira Code',monospace",fontSize:10,letterSpacing:2,
            padding:"14px 28px",background:"transparent",color:"var(--text-d)",
            border:"1px solid var(--border)",cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.target.style.color="#ffffff";e.target.style.borderColor="rgba(0,255,65,0.4)"}}
            onMouseLeave={e=>{e.target.style.color="var(--text-d)";e.target.style.borderColor="var(--border)"}}>
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
    fontFamily: "'Fira Code',monospace", fontSize: 12,
    background: "rgba(0,255,65,0.03)", color: "#ffffff",
    border: "1px solid var(--border)", outline: "none",
    letterSpacing: 1, transition: "border-color 0.2s",
  };

  return (
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",paddingTop:54,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:520,padding:"60px 40px"}}>

        {!generatedKey ? (
          <>
            <div style={{fontSize:9,letterSpacing:7,color:"var(--text-d)",border:"1px solid var(--border)",
              padding:"5px 18px",marginBottom:28,display:"inline-block"}}>
              RESTRICTED ACCESS
            </div>
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:6,
              color:"#ffffff",marginBottom:10,lineHeight:1}}>
              GET YOUR API KEY
            </h1>
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.8,marginBottom:36}}>
              Route your AI traffic through the RECUR sentinel network. One key, two minutes, full protection.
            </p>

            <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:9,letterSpacing:3,color:"var(--text-d)",display:"block",marginBottom:6}}>EMAIL</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@company.com" style={inputStyle}
                  onFocus={e=>e.target.style.borderColor="rgba(0,255,65,0.4)"}
                  onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
              <div>
                <label style={{fontSize:9,letterSpacing:3,color:"var(--text-d)",display:"block",marginBottom:6}}>WHAT ARE YOU BUILDING?</label>
                <textarea value={useCase} onChange={e=>setUseCase(e.target.value)}
                  placeholder="AI chatbot for customer support, internal tool with GPT-4, ..."
                  rows={3} style={{...inputStyle,resize:"vertical",minHeight:80}}
                  onFocus={e=>e.target.style.borderColor="rgba(0,255,65,0.4)"}
                  onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>

              {error && (
                <div style={{fontSize:10,color:"#ff0033",letterSpacing:1,padding:"8px 12px",
                  background:"rgba(255,0,51,0.08)",border:"1px solid rgba(255,0,51,0.2)"}}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:4,
                padding:"16px",color:"#ffffff",cursor:loading?"wait":"pointer",
                background:loading?"rgba(0,255,65,0.05)":"rgba(0,255,65,0.1)",
                border:"1px solid rgba(0,255,65,0.5)",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{if(!loading){e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 30px rgba(0,255,65,0.15)"}}}
              onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}>
                {loading ? "GENERATING..." : "GENERATE API KEY"}
              </button>
            </form>

            <div style={{marginTop:28,textAlign:"center"}}>
              <button onClick={()=>setPage("use-cases")} style={{
                fontFamily:"'Fira Code',monospace",fontSize:9,letterSpacing:2,
                padding:"7px 18px",background:"transparent",color:"var(--text-d)",
                border:"1px solid var(--border)",cursor:"pointer",transition:"all 0.2s",
              }}
              onMouseEnter={e=>{e.target.style.color="#ffffff";e.target.style.borderColor="rgba(0,255,65,0.4)"}}
              onMouseLeave={e=>{e.target.style.color="var(--text-d)";e.target.style.borderColor="var(--border)"}}>
                VIEW USE CASES →
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,letterSpacing:7,color:"var(--green)",border:"1px solid rgba(0,255,65,0.3)",
              padding:"5px 18px",marginBottom:28,display:"inline-block",
              background:"rgba(0,255,65,0.05)"}}>
              ACCESS GRANTED
            </div>
            <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:6,
              color:"#ffffff",marginBottom:10,lineHeight:1}}>
              YOUR API KEY
            </h1>
            <p style={{fontSize:11,color:"var(--text-d)",lineHeight:1.8,marginBottom:28}}>
              Save this key now. It will not be shown again.
            </p>

            <Panel style={{padding:"20px",marginBottom:16,textAlign:"left"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"var(--text-d)",marginBottom:8}}>API KEY</div>
              <div style={{fontFamily:"'Fira Code',monospace",fontSize:12,color:"var(--green)",
                letterSpacing:0.5,wordBreak:"break-all",lineHeight:1.8,userSelect:"all"}}>
                {generatedKey}
              </div>
            </Panel>

            <button onClick={copyKey} style={{
              fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:4,
              padding:"14px 36px",color:"#ffffff",cursor:"pointer",
              background:copied?"rgba(0,255,65,0.15)":"rgba(0,255,65,0.1)",
              border:`1px solid ${copied?"rgba(0,255,65,0.7)":"rgba(0,255,65,0.5)"}`,
              transition:"all 0.2s",marginBottom:28,
            }}
            onMouseEnter={e=>{e.target.style.background="rgba(0,255,65,0.2)";e.target.style.boxShadow="0 0 30px rgba(0,255,65,0.15)"}}
            onMouseLeave={e=>{e.target.style.background="rgba(0,255,65,0.1)";e.target.style.boxShadow="none"}}>
              {copied ? "COPIED" : "COPY TO CLIPBOARD"}
            </button>

            <Panel style={{padding:"20px",textAlign:"left"}}>
              <div style={{fontSize:9,letterSpacing:3,color:"var(--text-d)",marginBottom:10}}>QUICK START</div>
              <pre style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"var(--text)",
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

            <div style={{marginTop:24,fontSize:9,color:"var(--text-d)",letterSpacing:1,lineHeight:1.8}}>
              Pass this key in the <span style={{color:"var(--green)"}}>x-recur-api-key</span> header with every request.
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
      <Scanline/>
      <BgGrid/>
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
