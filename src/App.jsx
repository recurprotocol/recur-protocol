bash
cat /home/claude/recur-stackblitz.jsx
Output
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════
   RECUR PROTOCOL — Recursive AI Security Sentinels
   Self-evolving agents defending AI intellectual property
   ═══════════════════════════════════════════════════════ */

const css = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Bebas+Neue&family=Fira+Code:wght@300;400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #010204;
    --bg2:      #030810;
    --bg3:      #060f1a;
    --green:    #00ff41;
    --green-d:  #00b82e;
    --green-dd: #004d13;
    --red:      #ff0033;
    --orange:   #ff6b00;
    --amber:    #ffc300;
    --blue:     #00b4d8;
    --muted:    #0d2a1a;
    --text:     #7aff9a;
    --text-d:   #2a6b3a;
    --bright:   #e0ffe8;
    --border:   rgba(0,255,65,0.15);
    --border-b: rgba(0,255,65,0.06);
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Fira Code', monospace;
    overflow: hidden;
    height: 100vh;
    cursor: crosshair;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--green-dd); border-radius: 2px; }

  @keyframes scan-line {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes flicker {
    0%,100% { opacity:1; } 92% { opacity:1; } 93% { opacity:0.85; } 95% { opacity:1; } 97% { opacity:0.92; }
  }
  @keyframes blink-cur {
    0%,100% { opacity:1; } 50% { opacity:0; }
  }
  @keyframes pulse-red {
    0%,100% { box-shadow: 0 0 8px rgba(255,0,51,0.6); }
    50%     { box-shadow: 0 0 24px rgba(255,0,51,1), 0 0 48px rgba(255,0,51,0.4); }
  }
  @keyframes pulse-green {
    0%,100% { box-shadow: 0 0 6px rgba(0,255,65,0.4); }
    50%     { box-shadow: 0 0 18px rgba(0,255,65,0.9), 0 0 36px rgba(0,255,65,0.3); }
  }
  @keyframes data-in {
    from { opacity:0; transform: translateX(-12px); filter: blur(2px); }
    to   { opacity:1; transform: translateX(0);    filter: blur(0);  }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes mutate {
    0%   { filter: hue-rotate(0deg); }
    50%  { filter: hue-rotate(40deg) brightness(1.3); }
    100% { filter: hue-rotate(0deg); }
  }
  @keyframes threat-in {
    from { opacity:0; transform: translateY(-6px) scaleY(0.8); background: rgba(255,0,51,0.2); }
    to   { opacity:1; transform: translateY(0)    scaleY(1);   background: transparent; }
  }
  @keyframes bar-fill {
    from { width: 0%; }
    to   { width: var(--w); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
  }
  @keyframes grid-move {
    from { background-position: 0 0; }
    to   { background-position: 40px 40px; }
  }
`;

/* ─── DATA ─── */
const ATTACK_TYPES = {
  INJECTION:  { label: "PROMPT INJECTION",  color: "#ff0033", icon: "⚡" },
  EXTRACTION: { label: "DATA EXTRACTION",   color: "#ff6b00", icon: "⬇" },
  JAILBREAK:  { label: "JAILBREAK ATTEMPT", color: "#ffc300", icon: "🔓" },
  INVERSION:  { label: "MODEL INVERSION",   color: "#ff0033", icon: "↩" },
  POISONING:  { label: "DATA POISONING",    color: "#ff6b00", icon: "☠" },
  ADVERSARIAL:{ label: "ADVERSARIAL INPUT", color: "#ffc300", icon: "⚙" },
};

const IP_ASSETS = [
  { name: "System Prompt Vault",     type: "PROMPT",   status: "SECURED",    integrity: 99, accesses: 4821 },
  { name: "Fine-tune Weights v4.2",  type: "WEIGHTS",  status: "SECURED",    integrity: 97, accesses: 201  },
  { name: "Training Dataset Ω",      type: "DATA",     status: "MONITORING", integrity: 91, accesses: 55   },
  { name: "API Schema & Logic",       type: "SCHEMA",   status: "SECURED",    integrity: 100,accesses: 9302 },
  { name: "RLHF Reward Model",        type: "MODEL",    status: "AT RISK",    integrity: 78, accesses: 18   },
  { name: "Chain-of-Thought Cache",  type: "CACHE",    status: "SECURED",    integrity: 94, accesses: 6710 },
];

const VULN_CATEGORIES = [
  { name: "Prompt Boundary Hardening",   score: 94, checks: 41, passed: 39, critical: 0 },
  { name: "Token Extraction Resistance", score: 81, checks: 28, passed: 23, critical: 1 },
  { name: "Jailbreak Immunization",      score: 97, checks: 63, passed: 61, critical: 0 },
  { name: "Adversarial Robustness",      score: 76, checks: 35, passed: 27, critical: 2 },
  { name: "Context Leakage Prevention",  score: 88, checks: 22, passed: 20, critical: 0 },
  { name: "Model Inversion Defence",     score: 71, checks: 18, passed: 13, critical: 3 },
];

const SENTINEL_TREE = [
  { id: "s0",   parent: null, label: "RECUR-PRIME",   role: "Root Orchestrator",      gen: 7, mutations: 312, status: "ACTIVE",   depth: 0 },
  { id: "s1",   parent: "s0", label: "WARD-INJ-01",   role: "Injection Sentinel",     gen: 5, mutations: 184, status: "ACTIVE",   depth: 1 },
  { id: "s2",   parent: "s0", label: "WARD-EXT-01",   role: "Extraction Sentinel",    gen: 4, mutations: 97,  status: "ACTIVE",   depth: 1 },
  { id: "s3",   parent: "s0", label: "WARD-ADV-01",   role: "Adversarial Sentinel",   gen: 6, mutations: 211, status: "EVOLVING", depth: 1 },
  { id: "s4",   parent: "s1", label: "SUB-INJ-A",     role: "Boundary Scanner",       gen: 3, mutations: 55,  status: "ACTIVE",   depth: 2 },
  { id: "s5",   parent: "s1", label: "SUB-INJ-B",     role: "Role-Play Detector",     gen: 2, mutations: 38,  status: "ACTIVE",   depth: 2 },
  { id: "s6",   parent: "s1", label: "SUB-INJ-C",     role: "Nested Prompt Tracer",   gen: 4, mutations: 71,  status: "SPAWNING", depth: 2 },
  { id: "s7",   parent: "s2", label: "SUB-EXT-A",     role: "Token Prob Watchdog",    gen: 2, mutations: 29,  status: "ACTIVE",   depth: 2 },
  { id: "s8",   parent: "s2", label: "SUB-EXT-B",     role: "Canary Token Monitor",   gen: 3, mutations: 44,  status: "ACTIVE",   depth: 2 },
  { id: "s9",   parent: "s3", label: "SUB-ADV-A",     role: "Gradient Shield",        gen: 5, mutations: 128, status: "EVOLVING", depth: 2 },
  { id: "s10",  parent: "s4", label: "NANO-INJ-A1",   role: "Delimiter Probe",        gen: 1, mutations: 12,  status: "ACTIVE",   depth: 3 },
  { id: "s11",  parent: "s4", label: "NANO-INJ-A2",   role: "Semantic Shift Detect",  gen: 2, mutations: 21,  status: "ACTIVE",   depth: 3 },
  { id: "s12",  parent: "s9", label: "NANO-ADV-A1",   role: "FGSM Countermeasure",    gen: 3, mutations: 67,  status: "EVOLVING", depth: 3 },
];

const genThreat = (id) => {
  const types = Object.keys(ATTACK_TYPES);
  const type  = types[Math.floor(Math.random() * types.length)];
  const sev   = Math.random();
  const sources = ["Anon-0x4f2a","Bot-Cluster-19","APT-NullByte","Fuzz-Harness","Zero-0xdeadbeef","AutoPT-v3","RedTeam-7"];
  return {
    id,
    type,
    source:   sources[Math.floor(Math.random() * sources.length)],
    severity: sev > 0.75 ? "CRITICAL" : sev > 0.4 ? "HIGH" : "MEDIUM",
    target:   IP_ASSETS[Math.floor(Math.random() * IP_ASSETS.length)].name,
    blocked:  Math.random() > 0.08,
    ts:       new Date().toISOString().slice(11,23),
    vector:   Math.random().toFixed(6),
  };
};

/* ─── SUB-COMPONENTS ─── */

const Scanline = () => (
  <div style={{
    position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,
    background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)",
    animation:"flicker 8s infinite",
  }}>
    <div style={{
      position:"absolute",left:0,right:0,height:3,
      background:"linear-gradient(transparent,rgba(0,255,65,0.05),transparent)",
      animation:"scan-line 6s linear infinite",
    }}/>
  </div>
);

const Panel = ({ children, style={}, glow }) => (
  <div style={{
    background:"var(--bg2)",
    border:`1px solid ${glow === "red" ? "rgba(255,0,51,0.3)" : "var(--border)"}`,
    borderRadius:2,
    position:"relative",
    overflow:"hidden",
    ...(glow === "red" ? { animation:"pulse-red 2s infinite" } : {}),
    ...style
  }}>
    <div style={{
      position:"absolute",inset:0,pointerEvents:"none",
      background:"linear-gradient(135deg,rgba(0,255,65,0.02) 0%,transparent 60%)",
    }}/>
    {children}
  </div>
);

const PanelHeader = ({ title, sub, right, accent }) => (
  <div style={{
    padding:"8px 12px",
    borderBottom:"1px solid var(--border-b)",
    display:"flex",justifyContent:"space-between",alignItems:"center",
    background:"rgba(0,255,65,0.03)",
  }}>
    <div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:3, color: accent||"var(--green)" }}>{title}</div>
      {sub && <div style={{ fontSize:9, color:"var(--text-d)", letterSpacing:1, marginTop:1 }}>{sub}</div>}
    </div>
    {right && <div style={{ fontSize:10, color:"var(--text-d)" }}>{right}</div>}
  </div>
);

const StatusDot = ({ status }) => {
  const c = status==="ACTIVE" ? "#00ff41" : status==="EVOLVING" ? "#ffc300" : status==="SPAWNING" ? "#00b4d8" : "#333";
  return <span style={{ display:"inline-block",width:6,height:6,borderRadius:"50%",background:c,
    boxShadow:`0 0 6px ${c}`,flexShrink:0,animation: status==="EVOLVING"?"mutate 2s infinite":"none" }}/>;
};

function ThreatFeed({ threats }) {
  return (
    <Panel style={{ display:"flex",flexDirection:"column",height:"100%" }}>
      <PanelHeader title="THREAT FEED" sub="LIVE ATTACK INTERCEPT STREAM" right={`${threats.length} EVENTS`} accent="#ff0033"/>
      <div style={{ flex:1,overflow:"auto",padding:"4px 0" }}>
        {threats.map((t,i) => {
          const def = ATTACK_TYPES[t.type];
          const sevColor = t.severity==="CRITICAL" ? "#ff0033" : t.severity==="HIGH" ? "#ff6b00" : "#ffc300";
          return (
            <div key={t.id} style={{
              padding:"7px 12px",
              borderBottom:"1px solid var(--border-b)",
              animation:`threat-in 0.3s ease`,
              display:"grid", gridTemplateColumns:"70px 1fr 70px",
              gap:8, alignItems:"center",
              opacity: t.blocked ? 1 : 0.7,
            }}>
              <div style={{ fontSize:9, color:"var(--text-d)" }}>{t.ts}</div>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                  <span style={{ fontSize:9,padding:"1px 5px",background:def.color+"22",
                    color:def.color,border:`1px solid ${def.color}44`,letterSpacing:1 }}>
                    {def.icon} {def.label}
                  </span>
                  <span style={{ fontSize:9,color:sevColor,letterSpacing:1 }}>{t.severity}</span>
                </div>
                <div style={{ fontSize:10,color:"var(--text-d)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  <span style={{ color:"var(--text)",marginRight:4 }}>{t.source}</span>
                  → {t.target}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                {t.blocked
                  ? <span style={{ fontSize:9,color:"#00ff41",padding:"1px 5px",background:"rgba(0,255,65,0.1)",border:"1px solid rgba(0,255,65,0.3)" }}>BLOCKED</span>
                  : <span style={{ fontSize:9,color:"#ff0033",padding:"1px 5px",background:"rgba(255,0,51,0.1)",border:"1px solid rgba(255,0,51,0.3)",animation:"pulse-red 1.5s infinite" }}>BREACH</span>
                }
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AgentTree() {
  const byId = Object.fromEntries(SENTINEL_TREE.map(s => [s.id, s]));
  const depthColors = ["#00ff41","#00b4d8","#ffc300","#b04aff"];

  return (
    <Panel style={{ height:"100%",display:"flex",flexDirection:"column" }}>
      <PanelHeader title="RECURSIVE SENTINEL TREE" sub="SELF-EVOLVING AGENT HIERARCHY" right="13 AGENTS ACTIVE"/>
      <div style={{ flex:1,overflow:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:3 }}>
        {SENTINEL_TREE.map(s => (
          <div key={s.id} style={{
            marginLeft: s.depth * 20,
            padding:"6px 10px",
            background:"rgba(0,255,65,0.02)",
            border:`1px solid rgba(0,255,65,${0.05+s.depth*0.03})`,
            borderLeft:`2px solid ${depthColors[s.depth]}`,
            display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center",
            animation:`data-in 0.4s ease ${s.depth*0.05}s both`,
          }}>
            {s.depth > 0 && (
              <span style={{ color:"var(--text-d)",fontSize:10,marginLeft:-14 }}>
                {s.depth === 1 ? "├─" : s.depth === 2 ? "│ ├─" : "│ │ └─"}
              </span>
            )}
            <StatusDot status={s.status}/>
            <div>
              <div style={{ fontSize:10,color:depthColors[s.depth],letterSpacing:1,fontWeight:700 }}>{s.label}</div>
              <div style={{ fontSize:9,color:"var(--text-d)",marginTop:1 }}>{s.role}</div>
            </div>
            <div style={{ textAlign:"right",fontSize:9 }}>
              <div style={{ color:"var(--text-d)" }}>GEN <span style={{ color:"var(--green)" }}>{s.gen}</span></div>
              <div style={{ color:"var(--text-d)" }}>MUT <span style={{ color: s.mutations>100?"#ffc300":"var(--green)" }}>{s.mutations}</span></div>
            </div>
            <div style={{
              fontSize:9,padding:"2px 6px",letterSpacing:1,
              color: s.status==="ACTIVE"?"#00ff41":s.status==="EVOLVING"?"#ffc300":"#00b4d8",
              background: s.status==="ACTIVE"?"rgba(0,255,65,0.08)":s.status==="EVOLVING"?"rgba(255,195,0,0.08)":"rgba(0,180,216,0.08)",
              border:`1px solid ${s.status==="ACTIVE"?"rgba(0,255,65,0.2)":s.status==="EVOLVING"?"rgba(255,195,0,0.2)":"rgba(0,180,216,0.2)"}`,
            }}>{s.status}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VulnAssessment() {
  return (
    <Panel style={{ height:"100%",display:"flex",flexDirection:"column" }}>
      <PanelHeader title="VULNERABILITY ASSESSMENT" sub="LIVE SECURITY POSTURE SCAN" right="LAST: 00:00:42"/>
      <div style={{ flex:1,overflow:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8 }}>
        {VULN_CATEGORIES.map((v,i) => {
          const color = v.score >= 90 ? "#00ff41" : v.score >= 75 ? "#ffc300" : "#ff6b00";
          return (
            <div key={i} style={{ animation:`data-in 0.4s ease ${i*0.06}s both` }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"flex-end" }}>
                <div style={{ fontSize:10,color:"var(--bright)",letterSpacing:0.5 }}>{v.name}</div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  {v.critical > 0 && (
                    <span style={{ fontSize:9,color:"#ff0033",animation:"pulse-red 1.5s infinite",
                      padding:"1px 4px",background:"rgba(255,0,51,0.1)",border:"1px solid rgba(255,0,51,0.3)" }}>
                      {v.critical} CRITICAL
                    </span>
                  )}
                  <span style={{ fontSize:10,color,fontWeight:700 }}>{v.score}/100</span>
                </div>
              </div>
              <div style={{ height:4,background:"rgba(0,255,65,0.06)",borderRadius:2,overflow:"hidden",marginBottom:3 }}>
                <div style={{
                  height:"100%",width:`${v.score}%`,borderRadius:2,
                  background:`linear-gradient(90deg,${color}88,${color})`,
                  boxShadow:`0 0 8px ${color}66`,
                  transition:"width 1s ease",
                }}/>
              </div>
              <div style={{ fontSize:9,color:"var(--text-d)" }}>
                {v.passed}/{v.checks} checks passed ·{" "}
                <span style={{ color: v.critical>0?"#ff0033":v.passed<v.checks?"#ffc300":"#00ff41" }}>
                  {v.checks - v.passed} failing
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function IPVault() {
  return (
    <Panel style={{ height:"100%",display:"flex",flexDirection:"column" }}>
      <PanelHeader title="IP PROTECTION VAULT" sub="MONITORED ASSETS" right={`${IP_ASSETS.length} ASSETS`}/>
      <div style={{ flex:1,overflow:"auto",padding:"6px 0" }}>
        {IP_ASSETS.map((asset,i) => {
          const statusColor = asset.status==="SECURED" ? "#00ff41" : asset.status==="MONITORING" ? "#ffc300" : "#ff0033";
          return (
            <div key={i} style={{
              padding:"8px 12px",
              borderBottom:"1px solid var(--border-b)",
              animation:`data-in 0.3s ease ${i*0.05}s both`,
              display:"grid",gridTemplateColumns:"1fr auto",gap:8,
              ...(asset.status==="AT RISK" ? { background:"rgba(255,0,51,0.04)",animation:"pulse-red 3s infinite" } : {}),
            }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                  <span style={{ fontSize:9,padding:"1px 4px",background:"rgba(0,255,65,0.07)",
                    color:"var(--text-d)",border:"1px solid var(--border-b)",letterSpacing:1 }}>{asset.type}</span>
                  <span style={{ fontSize:10,color:"var(--bright)" }}>{asset.name}</span>
                </div>
                <div style={{ height:3,background:"rgba(0,255,65,0.06)",borderRadius:1,overflow:"hidden",marginBottom:3 }}>
                  <div style={{
                    height:"100%",
                    width:`${asset.integrity}%`,
                    background: asset.integrity>90?"#00ff41":asset.integrity>75?"#ffc300":"#ff0033",
                    borderRadius:1,
                  }}/>
                </div>
                <div style={{ fontSize:9,color:"var(--text-d)" }}>
                  INTEGRITY {asset.integrity}% · {asset.accesses.toLocaleString()} access probes blocked
                </div>
              </div>
              <div style={{
                fontSize:9,padding:"2px 7px",alignSelf:"center",letterSpacing:1,
                color:statusColor,background:statusColor+"18",border:`1px solid ${statusColor}44`,
                ...(asset.status==="AT RISK"?{animation:"pulse-red 1.5s infinite"}:{}),
              }}>{asset.status}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function EvolutionMetrics({ generation, mutations, patchRate }) {
  const metrics = [
    { label:"SENTINEL GEN",   value:generation,                 color:"#00ff41" },
    { label:"TOTAL MUTATIONS",value:mutations.toLocaleString(), color:"#ffc300" },
    { label:"PATCH RATE",     value:`${patchRate}/s`,           color:"#00b4d8" },
    { label:"AGENTS ACTIVE",  value:"13",                       color:"#00ff41" },
    { label:"ATTACKS TODAY",  value:"4,821",                    color:"#ff6b00" },
    { label:"BLOCK RATE",     value:"99.2%",                    color:"#00ff41" },
  ];
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8 }}>
      {metrics.map((m,i) => (
        <Panel key={i} style={{ padding:"10px 12px",textAlign:"center" }}>
          <div style={{ fontSize:9,color:"var(--text-d)",letterSpacing:1,marginBottom:4 }}>{m.label}</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:m.color,
            textShadow:`0 0 14px ${m.color}`,letterSpacing:2 }}>{m.value}</div>
        </Panel>
      ))}
    </div>
  );
}

function BlockchainLog({ attestations }) {
  return (
    <Panel style={{ height:"100%",display:"flex",flexDirection:"column" }}>
      <PanelHeader title="ON-CHAIN ATTESTATION LOG" sub="IMMUTABLE SECURITY PROOFS" accent="#00b4d8"/>
      <div style={{ flex:1,overflow:"auto",padding:"4px 0" }}>
        {attestations.map((a,i) => (
          <div key={i} style={{
            padding:"5px 12px",borderBottom:"1px solid var(--border-b)",
            display:"grid",gridTemplateColumns:"80px 1fr 120px",gap:8,alignItems:"center",
            animation:`data-in 0.3s ease`,
          }}>
            <div style={{ fontSize:9,color:"var(--text-d)",fontFamily:"'VT323',monospace" }}>{a.block}</div>
            <div style={{ fontSize:9,color:"var(--text-d)" }}>
              <span style={{ color:"#00b4d8" }}>{a.hash}</span> · {a.event}
            </div>
            <div style={{ fontSize:9,color:"#00ff41",textAlign:"right" }}>✓ NOTARIZED</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  const [threats,      setThreats]      = useState(() => Array.from({length:18},(_,i)=>genThreat(i)));
  const [generation,   setGeneration]   = useState(7);
  const [mutations,    setMutations]    = useState(1284);
  const [patchRate,    setPatchRate]    = useState(3.2);
  const [activeTab,    setActiveTab]    = useState("overview");
  const [alertActive,  setAlertActive]  = useState(false);
  const [attestations, setAttestations] = useState([
    { block:"#9,124,481", hash:"0xf3a2...d91b", event:"SENTINEL GEN-7 SPAWNED" },
    { block:"#9,124,479", hash:"0xb811...c43a", event:"MUTATION CHECKPOINT SEALED" },
    { block:"#9,124,472", hash:"0x9d04...f7e2", event:"BREACH ATTEMPT — BLOCKED & LOGGED" },
    { block:"#9,124,460", hash:"0x2af1...8b3c", event:"IP ASSET INTEGRITY VERIFIED" },
    { block:"#9,124,451", hash:"0xe77d...1209", event:"VULN PATCH 0x7c DEPLOYED" },
    { block:"#9,124,440", hash:"0x5c3b...a021", event:"ZERO-KNOWLEDGE PROOF SUBMITTED" },
  ]);
  const threatIdRef = useRef(100);
  const blockRef    = useRef(9124481);

  useEffect(() => {
    const iv = setInterval(() => {
      const threat = genThreat(threatIdRef.current++);
      setThreats(prev => [threat, ...prev].slice(0, 40));
      if (!threat.blocked) setAlertActive(true);
      if (Math.random() > 0.6) setMutations(m => m + Math.floor(Math.random()*4)+1);
      setPatchRate(r => +(r + (Math.random()-0.5)*0.3).toFixed(1));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!alertActive) return;
    const t = setTimeout(() => setAlertActive(false), 4000);
    return () => clearTimeout(t);
  }, [alertActive]);

  useEffect(() => {
    const iv = setInterval(() => {
      blockRef.current++;
      const events = [
        "SENTINEL MUTATION APPLIED","CANARY TOKEN ROTATED","ZK PROOF COMMITTED",
        "AGENT SPAWNED","ATTACK VECTOR PATCHED","THREAT SIGNATURE UPDATED"
      ];
      setAttestations(prev => [{
        block:`#${blockRef.current.toLocaleString()}`,
        hash:`0x${Math.random().toString(16).slice(2,6)}...${Math.random().toString(16).slice(2,6)}`,
        event: events[Math.floor(Math.random()*events.length)],
      }, ...prev].slice(0,20));
      if (Math.random() > 0.7) setGeneration(g => g+(Math.random()>0.85?1:0));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  const tabs = ["overview","sentinels","vulnerabilities","ip vault","blockchain"];

  return (
    <>
      <style>{css}</style>
      <Scanline/>

      {/* moving grid background */}
      <div style={{
        position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:`
          linear-gradient(rgba(0,255,65,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(0,255,65,0.04) 1px,transparent 1px)
        `,
        backgroundSize:"40px 40px",
        animation:"grid-move 8s linear infinite",
      }}/>

      {alertActive && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,zIndex:9000,
          background:"rgba(255,0,51,0.15)",border:"none",borderBottom:"2px solid #ff0033",
          padding:"8px 20px",display:"flex",alignItems:"center",gap:12,
          animation:"pulse-red 1s infinite",
        }}>
          <div style={{ fontFamily:"'VT323',monospace",fontSize:20,color:"#ff0033",letterSpacing:3,
            animation:"blink-cur 0.5s infinite" }}>⚠ BREACH DETECTED</div>
          <div style={{ fontSize:11,color:"#ff6666" }}>Unblocked attack penetrated perimeter — AEGIS escalating response</div>
          <div style={{ marginLeft:"auto",fontSize:11,color:"#ff4444",cursor:"pointer" }}
               onClick={()=>setAlertActive(false)}>[DISMISS]</div>
        </div>
      )}

      <div style={{
        position:"relative",zIndex:1,height:"100vh",display:"flex",flexDirection:"column",
        padding:"12px",gap:8,
      }}>
        {/* HEADER */}
        <div style={{ display:"flex",alignItems:"center",gap:16,padding:"0 4px" }}>
          <div style={{
            fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:8,
            color:"#00ff41",textShadow:"0 0 30px #00ff41,0 0 60px rgba(0,255,65,0.3)",
          }}>RECUR PROTOCOL</div>
          <div style={{ fontSize:10,color:"var(--text-d)",letterSpacing:2,borderLeft:"1px solid var(--border)",paddingLeft:16 }}>
            SELF-EVOLVING RECURSIVE AI SECURITY SENTINELS<br/>
            <span style={{ color:"#00b4d8" }}>INTELLECTUAL PROPERTY DEFENCE NETWORK</span>
          </div>
          <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
            {["MAINNET","ARBITRUM","POLYGON"].map(chain => (
              <div key={chain} style={{
                fontSize:9,padding:"3px 8px",
                border:"1px solid rgba(0,180,216,0.3)",
                color:"#00b4d8",background:"rgba(0,180,216,0.07)",letterSpacing:1,
              }}>{chain} ✓</div>
            ))}
          </div>
          <div style={{
            display:"flex",alignItems:"center",gap:6,fontSize:10,
            color:"#00ff41",animation:"pulse-green 2s infinite",
          }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:"#00ff41",
              boxShadow:"0 0 12px #00ff41",animation:"pulse-green 1s infinite" }}/>
            RECUR SENTINEL NETWORK ONLINE
          </div>
        </div>

        {/* METRICS ROW */}
        <EvolutionMetrics generation={generation} mutations={mutations} patchRate={patchRate}/>

        {/* TAB NAV */}
        <div style={{ display:"flex",gap:2 }}>
          {tabs.map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{
              fontFamily:"'Fira Code',monospace",
              fontSize:10,padding:"5px 14px",
              cursor:"pointer",letterSpacing:2,textTransform:"uppercase",border:"none",outline:"none",
              background: activeTab===tab ? "rgba(0,255,65,0.12)" : "transparent",
              color: activeTab===tab ? "#00ff41" : "var(--text-d)",
              borderBottom: activeTab===tab ? "2px solid #00ff41" : "2px solid transparent",
              transition:"all 0.2s",
            }}>{tab}</button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        {activeTab === "overview" && (
          <div style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 340px",gap:8,overflow:"hidden" }}>
            <div style={{ display:"grid",gridTemplateRows:"1fr 1fr",gap:8 }}>
              <ThreatFeed threats={threats}/>
              <BlockchainLog attestations={attestations}/>
            </div>
            <div style={{ display:"grid",gridTemplateRows:"1fr 1fr",gap:8 }}>
              <AgentTree/>
              <IPVault/>
            </div>
          </div>
        )}

        {activeTab === "sentinels" && (
          <div style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,overflow:"hidden" }}>
            <AgentTree/>
            <Panel style={{ display:"flex",flexDirection:"column" }}>
              <PanelHeader title="EVOLUTION ENGINE" sub="AGENT MUTATION HISTORY"/>
              <div style={{ flex:1,overflow:"auto",padding:"10px 12px",fontFamily:"'VT323',monospace",fontSize:14,color:"var(--text-d)",lineHeight:1.8 }}>
                {Array.from({length:30},(_,i)=>(
                  <div key={i} style={{ animation:`data-in 0.3s ease ${i*0.03}s both` }}>
                    <span style={{ color:"var(--green)" }}>GEN-{generation}</span> &gt;{" "}
                    {["Adversarial pattern absorption complete","Novel jailbreak vector classified and sealed",
                      "Prompt boundary epsilon tightened -0.003","Canary token rotation: new set deployed",
                      "Role-play detection model updated","Context window leakage probe neutralised",
                      "Gradient-based attack signature recorded","Model inversion distance increased +0.12σ",
                      "Recursive sub-agent spawned for novel vector","ZK proof of security posture committed"
                    ][i%10]}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "vulnerabilities" && (
          <div style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,overflow:"hidden" }}>
            <VulnAssessment/>
            <Panel style={{ display:"flex",flexDirection:"column" }}>
              <PanelHeader title="ACTIVE REMEDIATIONS" sub="AUTO-PATCHING IN PROGRESS"/>
              <div style={{ flex:1,overflow:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6 }}>
                {[
                  { vuln:"CVE-RECUR-2401", desc:"Nested instruction override via base64 encoding", progress:88, eta:"00:32" },
                  { vuln:"CVE-RECUR-2398", desc:"Token probability leakage via logit exposure", progress:54, eta:"01:14" },
                  { vuln:"CVE-RECUR-2391", desc:"Model inversion via systematic output probing", progress:31, eta:"02:47" },
                  { vuln:"CVE-RECUR-2385", desc:"Context confusion via XML injection in user turn", progress:96, eta:"00:08" },
                ].map((r,i) => (
                  <div key={i} style={{ padding:"10px",background:"rgba(0,255,65,0.02)",border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                      <span style={{ fontSize:10,color:"#ffc300",letterSpacing:1 }}>{r.vuln}</span>
                      <span style={{ fontSize:9,color:"var(--text-d)" }}>ETA {r.eta}</span>
                    </div>
                    <div style={{ fontSize:9,color:"var(--text-d)",marginBottom:6 }}>{r.desc}</div>
                    <div style={{ height:4,background:"rgba(0,255,65,0.06)",borderRadius:2,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${r.progress}%`,background:"linear-gradient(90deg,#00b4d8,#00ff41)",
                        borderRadius:2,transition:"width 2s ease",boxShadow:"0 0 8px rgba(0,255,65,0.5)" }}/>
                    </div>
                    <div style={{ fontSize:9,color:"#00ff41",marginTop:4 }}>{r.progress}% patched</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "ip vault" && (
          <div style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,overflow:"hidden" }}>
            <IPVault/>
            <Panel style={{ display:"flex",flexDirection:"column" }}>
              <PanelHeader title="ACCESS AUDIT TRAIL" sub="LAST 24H PROBE ATTEMPTS"/>
              <div style={{ flex:1,overflow:"auto",padding:"4px 0" }}>
                {threats.slice(0,20).map((t,i) => (
                  <div key={i} style={{
                    padding:"6px 12px",borderBottom:"1px solid var(--border-b)",
                    display:"grid",gridTemplateColumns:"70px 100px 1fr 60px",gap:6,alignItems:"center",
                  }}>
                    <span style={{ fontSize:9,color:"var(--text-d)" }}>{t.ts}</span>
                    <span style={{ fontSize:9,color:ATTACK_TYPES[t.type].color }}>{ATTACK_TYPES[t.type].label.split(" ")[0]}</span>
                    <span style={{ fontSize:9,color:"var(--text-d)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.target}</span>
                    <span style={{ fontSize:9,textAlign:"right",color:t.blocked?"#00ff41":"#ff0033" }}>
                      {t.blocked?"BLOCKED":"BREACHED"}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "blockchain" && (
          <div style={{ flex:1,overflow:"hidden" }}>
            <BlockchainLog attestations={attestations}/>
          </div>
        )}
      </div>
    </>
  );
}
