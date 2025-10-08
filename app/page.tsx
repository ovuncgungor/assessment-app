"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

/* ---------- Basit UI ---------- */
function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl shadow-sm border bg-white ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }
) {
  const { className = "", variant = "default", ...rest } = props;
  const style = variant === "outline" ? "border bg-white" : "bg-black text-white";
  return <button {...rest} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${style} ${className}`} />;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${props.className || ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm h-24 ${props.className || ""}`} />;
}

/* ---------- Tipler ---------- */
type Sex = "Kadın" | "Erkek" | "Diğer";
type MetricDir = "high" | "low";
interface MetricDef { key: string; label: string; direction: MetricDir; }
interface ParamDef { mean: number; sd: number; }
interface Band { min: number; max: number; [metricKey: string]: number | ParamDef; }
interface MetricResult { z: number | null; pct: number | null; mean: number; sd: number; }

/* ---------- Normlar (başlangıç) ---------- */
const PARAMS: Band[] = [
  { min: 0, max: 12,
    C_ATT:{mean:18,sd:6}, C_WM:{mean:3.5,sd:1.0}, C_FLU:{mean:10,sd:3}, C_SIM:{mean:6,sd:2}, C_ORI:{mean:5,sd:1.5},
    M_TAP:{mean:60,sd:12}, M_RT:{mean:480,sd:90},
    A_DIS:{mean:14,sd:4}, A_MEM:{mean:3.2,sd:0.8},
    V_VM:{mean:12,sd:4},  V_VSRT:{mean:1100,sd:200},
    V_ATT_CONT:{mean:28,sd:7}, V_LINE:{mean:10,sd:3}, V_TMA:{mean:60000,sd:12000}, V_TMB:{mean:80000,sd:15000},
    V_BIS_DEV:{mean:8,sd:4},  V_CLOCK:{mean:6,sd:2}, V_REY:{mean:10,sd:3}, V_FACE:{mean:8,sd:2}, V_STORY:{mean:6,sd:2},
    EX_WCST:{mean:16,sd:5}, EX_LURIA:{mean:12,sd:3},
  },
  { min: 13, max: 17,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.5,sd:1.0}, C_FLU:{mean:15,sd:4}, C_SIM:{mean:8,sd:2}, C_ORI:{mean:6,sd:1.2},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:4.0,sd:0.8},
    V_VM:{mean:14,sd:3},  V_VSRT:{mean:950,sd:180},
    V_ATT_CONT:{mean:36,sd:7}, V_LINE:{mean:12,sd:3}, V_TMA:{mean:45000,sd:9000}, V_TMB:{mean:62000,sd:12000},
    V_BIS_DEV:{mean:6,sd:3},  V_CLOCK:{mean:7,sd:2}, V_REY:{mean:12,sd:3}, V_FACE:{mean:9,sd:2}, V_STORY:{mean:8,sd:2},
    EX_WCST:{mean:20,sd:5}, EX_LURIA:{mean:14,sd:3},
  },
  { min: 18, max: 59,
    C_ATT:{mean:25,sd:5}, C_WM:{mean:5.0,sd:1.0}, C_FLU:{mean:18,sd:4}, C_SIM:{mean:9,sd:2}, C_ORI:{mean:6,sd:1.0},
    M_TAP:{mean:80,sd:12}, M_RT:{mean:380,sd:70},
    A_DIS:{mean:18,sd:4}, A_MEM:{mean:4.5,sd:0.8},
    V_VM:{mean:16,sd:3},  V_VSRT:{mean:900,sd:160},
    V_ATT_CONT:{mean:45,sd:8}, V_LINE:{mean:15,sd:3}, V_TMA:{mean:35000,sd:8000}, V_TMB:{mean:52000,sd:10000},
    V_BIS_DEV:{mean:5,sd:2},  V_CLOCK:{mean:8,sd:2}, V_REY:{mean:14,sd:3}, V_FACE:{mean:10,sd:2}, V_STORY:{mean:10,sd:2},
    EX_WCST:{mean:24,sd:5}, EX_LURIA:{mean:16,sd:3},
  },
  { min: 60, max: 120,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.0,sd:1.0}, C_FLU:{mean:14,sd:4}, C_SIM:{mean:8,sd:2}, C_ORI:{mean:5.5,sd:1.0},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:3.6,sd:0.8},
    V_VM:{mean:14,sd:3},  V_VSRT:{mean:980,sd:180},
    V_ATT_CONT:{mean:34,sd:7}, V_LINE:{mean:12,sd:3}, V_TMA:{mean:42000,sd:9000}, V_TMB:{mean:65000,sd:12000},
    V_BIS_DEV:{mean:6,sd:3},  V_CLOCK:{mean:7,sd:2}, V_REY:{mean:12,sd:3}, V_FACE:{mean:9,sd:2}, V_STORY:{mean:8,sd:2},
    EX_WCST:{mean:20,sd:5}, EX_LURIA:{mean:14,sd:3},
  },
];

/* ---------- Metrikler ---------- */
const METRICS: MetricDef[] = [
  { key: "C_ATT", label: "Dikkat/Stroop (doğru)", direction: "high" },
  { key: "C_WM",  label: "Çalışan Bellek (span)", direction: "high" },
  { key: "C_FLU", label: "Sözel Akıcılık (doğru)", direction: "high" },
  { key: "C_SIM", label: "Benzerlik/Yargılama (doğru)", direction: "high" },
  { key: "C_ORI", label: "Oryantasyon (doğru)", direction: "high" },

  { key: "M_TAP", label: "Tapping (adet)", direction: "high" },
  { key: "M_RT",  label: "Reaksiyon (ms)", direction: "low"  },

  { key: "A_DIS", label: "Ton Ayrımı (doğru)", direction: "high" },
  { key: "A_MEM", label: "İşitsel Dizi (span)", direction: "high" },

  { key: "V_VM",       label: "Görsel Hafıza (doğru)", direction: "high" },
  { key: "V_VSRT",     label: "Görsel Arama (ms)",      direction: "low"  },
  { key: "V_ATT_CONT", label: "İşaretleme (net)",       direction: "high" },
  { key: "V_LINE",     label: "Çizgi Yönü (doğru)",    direction: "high" },
  { key: "V_TMA",      label: "Trail Making A (ms)",    direction: "low"  },
  { key: "V_TMB",      label: "Trail Making B (ms)",    direction: "low"  },
  { key: "V_BIS_DEV",  label: "Çizgi Bölme (px sapma)", direction: "low"  },
  { key: "V_CLOCK",    label: "Saat Çizme (puan)",      direction: "high" },
  { key: "V_REY",      label: "Kompleks Figür (puan)",  direction: "high" },
  { key: "V_FACE",     label: "Yüz Ayrımı (doğru)",     direction: "high" },
  { key: "V_STORY",    label: "Hikâye Hatırlama (puan)",direction: "high" },

  { key: "EX_WCST",    label: "WCST-light (doğru)",     direction: "high" },
  { key: "EX_LURIA",   label: "Luria Alternan (doğru)", direction: "high" },
];

const DOMAINS: Record<string, string[]> = {
  cognitive: ["C_ATT","C_WM","C_FLU","C_SIM","C_ORI"],
  motor:     ["M_TAP","M_RT"],
  auditory:  ["A_DIS","A_MEM"],
  visual:    ["V_VM","V_VSRT","V_ATT_CONT","V_LINE","V_TMA","V_TMB","V_BIS_DEV","V_CLOCK","V_REY","V_FACE","V_STORY"],
  executive: ["EX_WCST","EX_LURIA"]
};

/* ---------- Yaşa göre ayarlar ---------- */
const groupFromAge = (age:number)=> age<=12? "child" : age<=17? "teen" : age<60? "adult" : "senior";
const AGE_CFG: Record<string, any> = {
  child:  { TAPPING_SEC:20, RT_TRIALS:4,  STROOP_TRIALS:12, WM_START:3, WM_MAX:6,  TONE_TRIALS:10, VISMEM_GRID:3, VISMEM_CELLS:3, VSEARCH_TRIALS:5,
            CANC_W:10,CANC_H:8,CANC_P:0.08,CANC_SEC:45, LINE_CHOICES:6, LINE_TOL:10,
            TMA_N:16, TMB_N:14, FLU_SEC:60, FLU_CATS:["hayvan","sebze","ülke","meslek"] },
  teen:   { TAPPING_SEC:25, RT_TRIALS:5,  STROOP_TRIALS:16, WM_START:4, WM_MAX:7,  TONE_TRIALS:12, VISMEM_GRID:3, VISMEM_CELLS:4, VSEARCH_TRIALS:6,
            CANC_W:12,CANC_H:10,CANC_P:0.07,CANC_SEC:40, LINE_CHOICES:8, LINE_TOL:8,
            TMA_N:18, TMB_N:16, FLU_SEC:60, FLU_CATS:["hayvan","sebze","ülke","meslek"] },
  adult:  { TAPPING_SEC:30, RT_TRIALS:6,  STROOP_TRIALS:20, WM_START:5, WM_MAX:8,  TONE_TRIALS:14, VISMEM_GRID:4, VISMEM_CELLS:5, VSEARCH_TRIALS:8,
            CANC_W:14,CANC_H:12,CANC_P:0.06,CANC_SEC:35, LINE_CHOICES:10,LINE_TOL:6,
            TMA_N:20, TMB_N:18, FLU_SEC:60, FLU_CATS:["hayvan","sebze","ülke","meslek"] },
  senior: { TAPPING_SEC:25, RT_TRIALS:5,  STROOP_TRIALS:16, WM_START:4, WM_MAX:7,  TONE_TRIALS:12, VISMEM_GRID:3, VISMEM_CELLS:4, VSEARCH_TRIALS:6,
            CANC_W:12,CANC_H:10,CANC_P:0.07,CANC_SEC:40, LINE_CHOICES:8, LINE_TOL:8,
            TMA_N:18, TMB_N:16, FLU_SEC:60, FLU_CATS:["hayvan","sebze","ülke","meslek"] },
};

/* ---------- Yardımcılar ---------- */
const normCdf = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
};
const pickBand = (age: number) => PARAMS.find(p => age >= p.min && age <= p.max) || PARAMS[2];
function useCountdown(seconds: number, onEnd?: () => void) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!seconds) return;
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(id); onEnd && onEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, onEnd]);
  return left;
}

/* ---------- Mevcut testlerin kısa versiyonları (çalışır) ---------- */
// Tapping
function TappingTest({ seconds, onDone }: { seconds: number; onDone: (count: number) => void }) {
  const [run, setRun] = useState(false);
  const [count, setCount] = useState(0);
  const left = useCountdown(run ? seconds : 0, () => { setRun(false); onDone(count); });
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Tapping ({seconds} sn)</h3>
      <div className="flex items-center gap-3 mb-3">
        <Button onClick={() => { setCount(0); setRun(true); }}>Başlat</Button>
        <div className="text-sm">Süre: <b>{run ? left : seconds}</b> sn</div>
        <div className="text-sm">Tıklama: <b>{count}</b></div>
      </div>
      <div className={`h-40 rounded-xl border flex items-center justify-center select-none ${run ? "bg-green-50" : "bg-gray-50"}`}
           onClick={() => run && setCount(c => c + 1)}>
        {run ? "Tıkla!" : "Başlat'a basın"}
      </div>
    </CardContent></Card>
  );
}
// Reaksiyon
function ReactionTest({ trials, onDone }: { trials: number; onDone: (avgMs: number) => void }) {
  const [trial, setTrial] = useState(0);
  const [state, setState] = useState<"idle"|"wait"|"go">("idle");
  const startRef = useRef(0);
  const rts = useRef<number[]>([]);
  const start = () => {
    if (trial >= trials) return;
    setState("wait");
    const delay = 1000 + Math.random()*2000;
    setTimeout(() => { setState("go"); startRef.current = performance.now(); }, delay);
  };
  const click = () => {
    if (state !== "go") return;
    const rt = performance.now() - startRef.current;
    rts.current.push(rt);
    const next = trial + 1;
    setTrial(next);
    setState("idle");
    if (next < trials) start();
    else onDone(Math.round(rts.current.reduce((a,b)=>a+b,0)/rts.current.length));
  };
  useEffect(() => { start(); }, []);
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Reaksiyon Süresi</h3>
      <div className="text-sm mb-2">Deneme: <b>{Math.min(trial+ (trial<trials?1:0),trials)}</b> / {trials}</div>
      <div className={`h-40 rounded-xl border flex items-center justify-center text-lg font-medium cursor-pointer
        ${state==="go"?"bg-green-400 text-white": state==="wait"?"bg-yellow-50":"bg-gray-50"}`} onClick={click}>
        {state==="go"?"TIKLA!": state==="wait"?"Hazır olun...":"Başla"}
      </div>
    </CardContent></Card>
  );
}
// Stroop
const COLORS = [
  { word: "KIRMIZI", ink: "red" },
  { word: "YEŞİL",   ink: "green" },
  { word: "MAVİ",    ink: "blue" },
  { word: "SARI",    ink: "goldenrod" },
];
function StroopTest({ trials, onDone }: { trials: number; onDone: (correct: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [item, setItem] = useState<{word:string; ink:string}>({word:"", ink:""});
  const [correct, setCorrect] = useState(0);
  const newItem = () => {
    const w = COLORS[Math.floor(Math.random()*COLORS.length)].word;
    const mismatch = Math.random()<0.7;
    const ink = mismatch ? COLORS.filter(c=>c.word!==w)[Math.floor(Math.random()*(COLORS.length-1))].ink
                         : COLORS.find(c=>c.word===w)!.ink;
    setItem({ word: w, ink });
  };
  useEffect(() => { newItem(); }, []);
  const answer = (ink: string) => {
    if (ink === item.ink) setCorrect(c=>c+1);
    const n = idx+1; setIdx(n);
    if (n < trials) newItem(); else onDone(correct + (ink === item.ink ? 1:0));
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Stroop (mürekkep rengini seçin)</h3>
      <div className="text-sm mb-2">Soru: <b>{idx+1}</b> / {trials}</div>
      <div className="h-24 rounded-xl border flex items-center justify-center text-2xl font-bold mb-3"
           style={{ color: item.ink }}>{item.word || "Hazır..."}</div>
      <div className="flex flex-wrap gap-2">
        {COLORS.map(c => (
          <Button key={c.ink} onClick={()=>answer(c.ink)} style={{borderColor:c.ink, color:c.ink}} variant="outline">
            {c.word}
          </Button>
        ))}
      </div>
    </CardContent></Card>
  );
}
// Çalışan Bellek (ileri)
function WorkingMemoryTest({ startLen, maxLen, onDone }: { startLen: number; maxLen: number; onDone: (span: number) => void }) {
  const [len, setLen] = useState(startLen);
  const [seq, setSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<"show"|"input"|"done">("show");
  const [input, setInput] = useState("");
  const [maxHit, setMaxHit] = useState(0);
  useEffect(() => {
    const s = Array.from({length: len}, ()=> Math.floor(Math.random()*10));
    setSeq(s); setPhase("show"); setInput("");
    const id = setTimeout(()=> setPhase("input"), 1000 + len*600);
    return ()=> clearTimeout(id);
  }, [len]);
  const check = () => {
    const ok = input === seq.join("");
    if (ok) { setMaxHit(Math.max(maxHit, len)); if (len < maxLen) setLen(len+1); else { setPhase("done"); onDone(maxLen);} }
    else { setPhase("done"); onDone(maxHit>0?maxHit:0); }
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Çalışan Bellek – Sayı Dizisi</h3>
      <div className="text-sm mb-2">Uzunluk: <b>{len}</b> (maks {maxLen})</div>
      {phase==="show" && (<div className="text-2xl tracking-widest font-mono">{seq.join(" ")}</div>)}
      {phase==="input" && (
        <div className="space-y-2">
          <Input value={input} onChange={e=> setInput(e.target.value.replace(/[^0-9]/g,""))} placeholder="Diziyi sırayla yazın" />
          <Button onClick={check}>Kontrol</Button>
        </div>
      )}
      {phase==="done" && <div>Test tamamlandı.</div>}
    </CardContent></Card>
  );
}
// İşitsel Ton Ayrımı
function playTone(freq:number, ms:number) {
  const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, ms);
}
function AuditoryDiscrimination({ trials, diffHz, onDone }: { trials: number; diffHz: number; onDone:(correct:number)=>void }) {
  const [trial, setTrial] = useState(0);
  const [pair, setPair] = useState<[number,number] | null>(null);
  const [lock, setLock] = useState(false);
  const [correct, setCorrect] = useState(0);
  const newTrial = () => {
    const base = 440 + Math.floor(Math.random()*120);
    const same = Math.random() < 0.5;
    const other = same ? base : base + (Math.random()<0.5? -diffHz : diffHz);
    setPair([base, other]); setLock(false);
  };
  useEffect(()=>{ newTrial(); }, []);
  const playPair2 = () => {
    if (!pair) return;
    setLock(true);
    playTone(pair[0], 400);
    setTimeout(()=> playTone(pair[1], 400), 500);
    setTimeout(()=> setLock(false), 1000);
  };
  const answer = (ans: "same"|"diff") => {
    if (!pair) return;
    const isSame = pair[0] === pair[1];
    const ok = (ans==="same" && isSame) || (ans==="diff" && !isSame);
    if (ok) setCorrect(c=>c+1);
    const n = trial+1; setTrial(n);
    if (n < trials) newTrial(); else onDone(correct + (ok?1:0));
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">İşitsel – Ton Ayrımı</h3>
      <div className="text-sm mb-2">Deneme: <b>{trial+1}</b> / {trials}</div>
      <div className="flex gap-2 mb-2">
        <Button onClick={playPair2} disabled={lock}>Çal</Button>
        <Button variant="outline" onClick={()=>answer("same")}>Aynı</Button>
        <Button variant="outline" onClick={()=>answer("diff")}>Farklı</Button>
      </div>
      <div className="text-xs text-gray-500">Not: Cihaz sesini açın.</div>
    </CardContent></Card>
  );
}
// Görsel Hafıza (ızgara)
function VisualMemory({ grid, cells, onDone }:{grid:number; cells:number; onDone:(correct:number)=>void}) {
  const total = grid*grid;
  const [pattern, setPattern] = useState<number[]>([]);
  const [phase, setPhase] = useState<"show"|"recall"|"done">("show");
  const [sel, setSel] = useState<Set<number>>(new Set());
  useEffect(()=>{
    const all = Array.from({length: total}, (_,i)=> i);
    const pick = all.sort(()=>0.5-Math.random()).slice(0, cells);
    setPattern(pick); setPhase("show"); setSel(new Set());
    const id = setTimeout(()=> setPhase("recall"), 2000 + cells*200);
    return ()=> clearTimeout(id);
  }, [grid,cells,total]);
  const toggle = (i:number) => { if (phase!=="recall") return; const s = new Set(sel); s.has(i)?s.delete(i):s.add(i); setSel(s); };
  const finish = () => { const correct = Array.from(sel).filter(i=> pattern.includes(i)).length; setPhase("done"); onDone(correct); };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Görsel Hafıza</h3>
      <div className="grid" style={{gridTemplateColumns:`repeat(${grid}, minmax(0,1fr))`, gap: "8px", width: `${grid*64}px`}}>
        {Array.from({length: total}, (_,i)=>(
          <div key={i} onClick={()=>toggle(i)}
            className={`h-16 rounded-md border cursor-pointer ${phase==="show" && pattern.includes(i) ? "bg-blue-400" : sel.has(i) ? "bg-blue-200" : "bg-gray-50"}`} />
        ))}
      </div>
      {phase==="recall" && <div className="mt-3"><Button onClick={finish}>Bitir</Button></div>}
    </CardContent></Card>
  );
}
// İşaretleme (Cancellation)
function CancellationTest({ width, height, pTarget, seconds, onDone }:
 { width:number; height:number; pTarget:number; seconds:number; onDone:(net:number)=>void }) {
  const total = width * height;
  const [grid, setGrid] = useState<{isTarget:boolean; clicked:boolean}[]>([]);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const arr = Array.from({length: total}, () => ({ isTarget: Math.random() < pTarget, clicked: false }));
    setGrid(arr);
  }, [total, pTarget]);
  useEffect(() => {
    if (!running) return;
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft((t) => {
        if (t <= 1) { clearInterval(id); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, seconds]);
  const clickCell = (i:number) => { if (!running) return; setGrid(prev => { const next=[...prev]; if (!next[i].clicked) next[i].clicked = true; return next; }); };
  const finish = () => {
    const correct = grid.filter(c => c.isTarget && c.clicked).length;
    const wrong   = grid.filter(c => !c.isTarget && c.clicked).length;
    const net = correct - wrong; onDone(net); setRunning(false);
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">İşaretleme (Süre: {seconds} sn)</h3>
      <div className="flex items-center gap-3 mb-3">
        <Button onClick={() => { setRunning(true); }}>{running ? "Devam" : "Başlat"}</Button>
        <div className="text-sm">Kalan: <b>{running ? left : seconds}</b> sn</div>
      </div>
      <div className="grid gap-1 select-none" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, width: `${width*28}px` }}>
        {grid.map((cell, i) => (
          <div key={i} onClick={() => clickCell(i)}
               className={`h-7 rounded border cursor-pointer ${cell.clicked ? (cell.isTarget ? "bg-emerald-300" : "bg-red-300") : "bg-gray-50"}`} />
        ))}
      </div>
      {running && <div className="mt-3"><Button variant="outline" onClick={finish}>Bitir</Button></div>}
    </CardContent></Card>
  );
}
// Çizgi Yönü
function LineOrientationTest({ choices, toleranceDeg, trials, onDone }:
 { choices:number; toleranceDeg:number; trials?:number; onDone:(correct:number)=>void }) {
  const TRIALS = trials ?? 20;
  const [trial, setTrial] = useState(0);
  const [target, setTarget] = useState(0);
  const [opts, setOpts] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const newTrial = () => {
    const t = Math.floor(Math.random()*180);
    setTarget(t);
    const step = Math.floor(180/choices);
    const base = Math.floor(Math.random()*step);
    const arr = Array.from({length: choices}, (_,k)=> ((base + k*step) % 180));
    setOpts(arr.sort(()=> 0.5 - Math.random()));
  };
  useEffect(() => { newTrial(); }, []);
  const pick = (deg:number) => {
    const diff = Math.abs(((deg - target + 180) % 180));
    const delta = Math.min(diff, 180 - diff);
    const ok = Math.abs(delta) <= toleranceDeg;
    if (ok) setCorrect(c=>c+1);
    const n = trial + 1; setTrial(n);
    if (n < TRIALS) newTrial(); else onDone(correct + (ok ? 1 : 0));
  };
  const line = (deg:number) => (<div className="w-24 h-2 bg-black origin-center" style={{ transform: `rotate(${deg}deg)` }} />);
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Çizgi Yönü</h3>
      <div className="text-sm mb-3">Deneme: <b>{Math.min(trial+1, TRIALS)}</b> / {TRIALS}</div>
      <div className="flex items-center gap-8 mb-4">
        <div className="flex flex-col items-center"><div className="text-xs text-gray-500 mb-1">Hedef</div>{line(target)}</div>
        <div className="grid grid-cols-5 gap-3">
          {opts.map((d,i)=> (<div key={i} className="flex flex-col items-center">{line(d)}<Button variant="outline" className="mt-1 text-xs" onClick={()=> pick(d)}>{d}°</Button></div>))}
        </div>
      </div>
    </CardContent></Card>
  );
}
// Görsel Arama RT
function VisualSearchRT({ trials, grid, onDone }:{trials:number; grid:number; onDone:(avgMs:number)=>void}) {
  const total = grid*grid;
  const [trial, setTrial] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const startRef = useRef(0);
  const rts = useRef<number[]>([]);
  useEffect(()=>{
    const t = Math.floor(Math.random()*total);
    setTarget(null);
    const delay = 400 + Math.random()*600;
    const id = setTimeout(()=> { setTarget(t); startRef.current = performance.now(); }, delay);
    return ()=> clearTimeout(id);
  }, [trial, total]);
  const click = (i:number) => {
    if (i!==target || target===null) return;
    const rt = performance.now() - startRef.current;
    rts.current.push(rt);
    const n = trial+1; setTrial(n);
    if (n>=trials) onDone(Math.round(rts.current.reduce((a,b)=>a+b,0)/rts.current.length));
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Görsel Arama – Hedefe tıklayın</h3>
      <div className="text-sm mb-2">Deneme: <b>{Math.min(trial+1,trials)}</b> / {trials}</div>
      <div className="grid" style={{gridTemplateColumns:`repeat(${grid}, minmax(0,1fr))`, gap: "6px", width: `${grid*56}px`}}>
        {Array.from({length: total}, (_,i)=>(
          <div key={i} onClick={()=>click(i)}
               className={`h-12 rounded-md border ${target===i? "bg-emerald-400" : "bg-gray-100 cursor-pointer"}`} />
        ))}
      </div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Sözel Akıcılık ---------- */
function VerbalFluency({ seconds, categories, onDone }:{seconds:number; categories:string[]; onDone:(score:number)=>void}) {
  const [cat] = useState(categories[Math.floor(Math.random()*categories.length)]);
  const [run, setRun] = useState(false);
  const [left, setLeft] = useState(seconds);
  const [txt, setTxt] = useState("");
  const [setWords, setSetWords] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!run) return;
    setLeft(seconds);
    const id = setInterval(()=> setLeft(t=> t<=1? (clearInterval(id),0) : t-1), 1000);
    const id2 = setTimeout(()=> { setRun(false); onDone(setWords.size); }, seconds*1000+50);
    return ()=> { clearInterval(id); clearTimeout(id2); };
  }, [run, seconds, onDone, setWords.size]);
  const addWord = () => {
    const w = txt.trim().toLowerCase();
    if (!w) return;
    const s = new Set(setWords);
    if (!s.has(w)) s.add(w);
    setSetWords(s); setTxt("");
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Sözel Akıcılık – Kategori: {cat}</h3>
      <div className="text-sm mb-2">Süre: {run? left: seconds} sn | Benzersiz doğru sayısı: <b>{setWords.size}</b></div>
      <div className="flex gap-2">
        <Input placeholder={`${cat} kategorisinden bir örnek yazın`} value={txt} onChange={e=> setTxt(e.target.value)} onKeyDown={e=> e.key==="Enter" && addWord()} />
        <Button variant="outline" onClick={addWord}>Ekle</Button>
        <Button onClick={()=> setRun(true)} disabled={run}>Başlat</Button>
      </div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Oryantasyon ---------- */
function Orientation({ onDone }:{ onDone:(score:number)=>void }) {
  const [dateOk, setDateOk] = useState<boolean|null>(null);
  const [placeOk, setPlaceOk] = useState<boolean|null>(null);
  const [dayOk, setDayOk] = useState<boolean|null>(null);
  const score = (dateOk?2:0) + (placeOk?2:0) + (dayOk?2:0);
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Bilgi – Oryantasyon</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <div><Label>Tarih doğru söyledi mi?</Label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" onChange={e=> setDateOk(e.target.value==="1")}><option>Seçin</option><option value="1">Evet</option><option value="0">Hayır</option></select></div>
        <div><Label>Gün doğru söyledi mi?</Label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" onChange={e=> setDayOk(e.target.value==="1")}><option>Seçin</option><option value="1">Evet</option><option value="0">Hayır</option></select></div>
        <div><Label>Yer (şehir/kurum) doğru mu?</Label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" onChange={e=> setPlaceOk(e.target.value==="1")}><option>Seçin</option><option value="1">Evet</option><option value="0">Hayır</option></select></div>
      </div>
      <div className="mt-3 flex gap-2 items-center"><div className="text-sm">Geçici puan: <b>{score}</b> / 6</div><Button onClick={()=> onDone(score)}>Kaydet</Button></div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Benzerlik/Yargılama (çoktan seçmeli mini) ---------- */
const SIM_ITEMS = [
  { q:"Kedi ve köpeğin ortak yönü nedir?", opts:["Hayvandır","Taşıttır","Sebzedir"], a:0 },
  { q:"Saat niçin kullanılır?", opts:["Süs","Zaman ölçmek","Yemek pişirmek"], a:1 },
  { q:"Uçak ile vapur arasındaki benzerlik?", opts:["İkisi de taşıt","İkisi de sebze","İkisi de maden"], a:0 },
  { q:"Birinin eşyasını izinsiz almak doğru mudur?", opts:["Evet","Hayır","Bazen"], a:1 },
];
function SimilarityJudgement({ onDone }:{ onDone:(score:number)=>void }) {
  const [i,setI]=useState(0); const [ok,setOk]=useState(0);
  const cur=SIM_ITEMS[i];
  const pick=(k:number)=>{ if(k===cur.a) setOk(x=>x+1); const n=i+1; if(n<SIM_ITEMS.length) setI(n); else onDone(ok + (k===cur.a?1:0)); };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Benzerlik & Yargılama</h3>
      <div className="text-sm mb-2">Soru {i+1}/{SIM_ITEMS.length} | Doğru: {ok}</div>
      <div className="mb-3">{cur.q}</div>
      <div className="flex flex-wrap gap-2">{cur.opts.map((t,idx)=><Button key={idx} variant="outline" onClick={()=>pick(idx)}>{t}</Button>)}</div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Saat Çizme (basit puanlama) ---------- */
function ClockDrawing({ onDone }:{ onDone:(score:number)=>void }) {
  const [hour,setHour]=useState(11); const [minute,setMinute]=useState(10);
  const [score,setScore]=useState(0);
  const calc=()=>{ let s=0; if(hour>=1&&hour<=12) s+=3; if(minute>=0&&minute<60) s+=3; if(minute!==0 && minute%5===0) s+=2; if(hour===11&&minute===10) s+=2; setScore(s); };
  useEffect(()=>{ calc(); },[hour,minute]);
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Saat Çizme (Hedef: 11:10)</h3>
      <div className="flex gap-3 mb-2">
        <div><Label>Saat</Label><Input type="number" value={hour} onChange={e=> setHour(Number(e.target.value))} /></div>
        <div><Label>Dakika</Label><Input type="number" value={minute} onChange={e=> setMinute(Number(e.target.value))} /></div>
      </div>
      <div className="text-sm">Anlık puan: <b>{score}</b> / 10</div>
      <Button className="mt-2" onClick={()=> onDone(score)}>Kaydet</Button>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Çizgi Bölme (orta nokta sapması) ---------- */
function LineBisection({ onDone }:{ onDone:(pxDev:number)=>void }) {
  const W=400; const H=40; const mid=W/2;
  const [pos,setPos]=useState<number|null>(null);
  const click=(e:React.MouseEvent<HTMLDivElement>)=>{
    const rect=(e.target as HTMLDivElement).getBoundingClientRect();
    const x=e.clientX-rect.left; setPos(x);
  };
  const dev = pos==null? null : Math.abs(pos-mid);
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Çizgi Bölme</h3>
      <div className="text-sm mb-2">Lütfen çizginin tam ortasına tıklayın.</div>
      <div className="relative border rounded-lg bg-gray-50" style={{width:W,height:H}} onClick={click}>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[2px] bg-black" />
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-red-400 opacity-40" />
        {pos!=null && <div className="absolute top-0 bottom-0" style={{left:pos}}><div className="w-[1px] h-full bg-emerald-500" /></div>}
      </div>
      <div className="mt-2 text-sm">Sapma: <b>{dev?.toFixed(1) ?? "-"}</b> px</div>
      <Button className="mt-2" onClick={()=> onDone(Math.round(dev ?? 0))}>Kaydet</Button>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Trail Making A/B ---------- */
function Trail({ n, pattern, onDone }:{ n:number; pattern:("N"|"A")[]; onDone:(ms:number, errors:number)=>void }) {
  const [nodes,setNodes]=useState<{x:number;y:number;label:string}[]>([]);
  const [idx,setIdx]=useState(0); const start=useRef(0); const [errors,setErrors]=useState(0);
  useEffect(()=>{
    const arr: {x:number;y:number;label:string}[]=[];
    const labels:string[]=[];
    let num=1, chCode=65; // A
    for(let i=0;i<n;i++){
      labels.push( pattern[i%pattern.length]==="N" ? String(num++) : String.fromCharCode(chCode++) );
    }
    for(let i=0;i<n;i++){
      arr.push({ x: 40+Math.random()*520, y: 40+Math.random()*320, label: labels[i] });
    }
    setNodes(arr); start.current=performance.now(); setIdx(0);
  },[n,pattern]);
  const expect = nodes[idx]?.label;
  const click=(i:number)=>{
    if(!nodes[i]) return;
    if(nodes[i].label===expect){
      const nxt=idx+1; setIdx(nxt);
      if(nxt>=n){ const ms=Math.round(performance.now()-start.current); onDone(ms, errors); }
    } else { setErrors(e=>e+1); }
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">İz Sürme</h3>
      <div className="text-sm mb-2">Sıradaki hedef: <b>{expect ?? "-"}</b> | Hata: {errors}</div>
      <div className="relative border rounded-lg w-[600px] h-[380px] bg-gray-50">
        {nodes.map((n,i)=>(
          <button key={i} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white w-10 h-10 text-sm"
                  style={{left:n.x, top:n.y}} onClick={()=>click(i)}>{n.label}</button>
        ))}
      </div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: WCST-light ---------- */
type Rule = "color"|"shape"|"number";
const SHAPES = ["■","▲","●"];
const COLORS_L = ["red","green","blue"];
function randomCard(){
  return { shape: SHAPES[Math.floor(Math.random()*3)], color: COLORS_L[Math.floor(Math.random()*3)], count: 1+Math.floor(Math.random()*3) };
}
function WCSTLight({ onDone }:{ onDone:(correct:number)=>void }) {
  const [rule,setRule]=useState<Rule>("color");
  const [correct,setCorrect]=useState(0);
  const [perse,setPerse]=useState(0);
  const [card,setCard]=useState(randomCard());
  const ruleCycle:Rule[]=["color","shape","number"];
  useEffect(()=>{ /* kural 10 doğruya bir değişsin */ if(correct>0 && correct%10===0){ setRule(ruleCycle[(ruleCycle.indexOf(rule)+1)%3]); } },[correct]); // eslint-disable-line
  const match = (opt:{shape:string;color:string;count:number})=>{
    const ok = (rule==="color" && opt.color===card.color) || (rule==="shape" && opt.shape===card.shape) || (rule==="number" && opt.count===card.count);
    if(ok){ setCorrect(c=>c+1); setCard(randomCard()); }
    else{
      // basit perseveratif: kullanıcı son kurala uygun ama yeni kurala uygun değilse (+1)
      setPerse(p=>p+1);
      setCard(randomCard());
    }
  };
  const options=[ randomCard(), randomCard(), randomCard(), randomCard() ];
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">WCST-light (kuralı keşfedin)</h3>
      <div className="text-sm mb-2">Doğru: {correct} | Perseveratif hata: {perse}</div>
      <div className="mb-2">Kart: <span style={{color:card.color}}>{card.shape.repeat(card.count)}</span></div>
      <div className="flex gap-2">{options.map((o,i)=>
        <Button key={i} variant="outline" onClick={()=>match(o)}><span style={{color:o.color}}>{o.shape.repeat(o.count)}</span></Button>)}
      </div>
      <div className="mt-3 text-xs text-gray-500">Geri bildirim: sadece sayaçlardan anlayın (bilerek minimal). 20+ doğruya ulaşınca kaydedin.</div>
      <Button className="mt-2" onClick={()=> onDone(correct)}>Kaydet</Button>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Luria Alternan Diziler (ABAB/ABCABC) ---------- */
function LuriaAlternation({ onDone }:{ onDone:(score:number)=>void }) {
  const pattern = Math.random()<0.5 ? ["A","B","A","B","A","B","A","B"] : ["A","B","C","A","B","C","A","B","C"];
  const [i,setI]=useState(0); const [ok,setOk]=useState(0);
  const press=(k:string)=>{ if(k===pattern[i]){ setOk(v=>v+1); setI(n=>n+1);} };
  const done = i>=pattern.length;
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Luria Alternan Diziler</h3>
      <div className="text-sm mb-2">Beklenen: <b>{pattern.join(" ")}</b></div>
      <div className="flex gap-2">
        {["A","B","C"].map(k=> <Button key={k} variant="outline" onClick={()=>!done && press(k)}>{k}</Button>)}
      </div>
      <div className="mt-2 text-sm">Doğru: {ok} / {pattern.length}</div>
      {done && <Button className="mt-2" onClick={()=> onDone(ok)}>Kaydet</Button>}
    </CardContent></Card>
  );
}

/* ---------- YENİ: Rey Kompleks Figür (eşdeğer) ---------- */
function ReyLike({ onDone }:{ onDone:(score:number)=>void }) {
  const G=6, total=G*G;
  const [pat,setPat]=useState<number[]>([]); const [phase,setPhase]=useState<"show"|"draw"|"done">("show");
  const [sel,setSel]=useState<Set<number>>(new Set());
  useEffect(()=>{ const cells=10; const arr=Array.from({length:total},(_,i)=>i).sort(()=>0.5-Math.random()).slice(0,cells); setPat(arr); setPhase("show"); setSel(new Set());
    const id=setTimeout(()=>setPhase("draw"), 3500); return ()=>clearTimeout(id);
  },[]);
  const toggle=(i:number)=>{ if(phase!=="draw") return; const s=new Set(sel); s.has(i)?s.delete(i):s.add(i); setSel(s); };
  const finish=()=>{ const tp=Array.from(sel).filter(i=>pat.includes(i)).length; const fp=sel.size - tp; const score=Math.max(0,tp - Math.floor(fp/2)); onDone(score); setPhase("done"); };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Kompleks Figür (Eşdeğer)</h3>
      <div className="grid" style={{gridTemplateColumns:`repeat(${G},minmax(0,1fr))`,gap:"6px",width:`${G*44}px`}}>
        {Array.from({length: total}, (_,i)=>(
          <div key={i} onClick={()=>toggle(i)}
            className={`h-10 rounded-md border ${phase==="show" && pat.includes(i) ? "bg-purple-400" : sel.has(i) ? "bg-purple-200" : "bg-gray-50"}`} />
        ))}
      </div>
      {phase==="draw" && <Button className="mt-2" onClick={finish}>Bitir</Button>}
    </CardContent></Card>
  );
}

/* ---------- YENİ: Yüz Ayrımı (sentetik simge yüzler) ---------- */
function FaceDiscrimination({ onDone }:{ onDone:(score:number)=>void }) {
  // basit “emoji yüz” parametreleri: ağız (düz/gülen), kaş (yok/eğimli), göz (büyük/küçük)
  const randFace=()=>({ mouth: Math.random()<0.5?"🙂":"😐", brow: Math.random()<0.5?"":"︶", eye: Math.random()<0.5?"●":"◕" });
  const [i,setI]=useState(0); const TR=12; const [ok,setOk]=useState(0);
  const [A,setA]=useState(randFace()); const [B,setB]=useState(randFace());
  useEffect(()=>{ if(i===0){ setA(randFace()); setB(randFace()); } },[]);
  const newTrial=()=>{ setA(randFace()); setB(randFace()); };
  const equal = (a:any,b:any)=> a.mouth===b.mouth && a.brow===b.brow && a.eye===b.eye;
  const answer=(same:boolean)=>{
    const truth = equal(A,B);
    if((same && truth) || (!same && !truth)) setOk(x=>x+1);
    const n=i+1; setI(n); if(n<TR) newTrial(); else onDone(ok + ((same&&truth)||(!same&&!truth)?1:0));
  };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Yüz Ayrımı (eşdeğer)</h3>
      <div className="text-sm mb-2">Deneme {i+1}/{TR} | Doğru {ok}</div>
      <div className="flex gap-8 text-4xl mb-3 select-none">
        <div>{A.brow}<div>{A.eye} {A.mouth}</div></div>
        <div>{B.brow}<div>{B.eye} {B.mouth}</div></div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={()=>answer(true)}>Aynı</Button>
        <Button variant="outline" onClick={()=>answer(false)}>Farklı</Button>
      </div>
    </CardContent></Card>
  );
}

/* ---------- YENİ: Hikâye Hatırlama (WMS mantıksal bellek eşdeğeri) ---------- */
const STORIES = [
  { text:"Ali sabah markete gidip ekmek ve süt aldı, sonra parka yürüdü.", keys:["Ali","market","ekmek","süt","park"] },
  { text:"Ayşe öğleden sonra kütüphanede kitap okudu ve akşam sinemaya gitti.", keys:["Ayşe","kütüphane","kitap","akşam","sinema"] },
];
function StoryRecall({ onDone }:{ onDone:(score:number)=>void }) {
  const S=STORIES[Math.floor(Math.random()*STORIES.length)];
  const [phase,setPhase]=useState<"show"|"ask">("show");
  const [txt,setTxt]=useState(""); useEffect(()=>{ const id=setTimeout(()=>setPhase("ask"), 4000); return ()=>clearTimeout(id); },[]);
  const calc=()=>{ const t=txt.toLowerCase(); const sc=S.keys.reduce((a,k)=> a + (t.includes(k.toLowerCase())?1:0),0); onDone(sc); };
  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold">Hikâye Hatırlama</h3>
      {phase==="show"? <div className="p-3 rounded bg-yellow-50">{S.text}</div> :
        <div className="space-y-2">
          <Textarea placeholder="Hikâyeden hatırladıklarınızı yazın..." value={txt} onChange={e=> setTxt(e.target.value)} />
          <Button onClick={calc}>Kaydet</Button>
        </div>}
    </CardContent></Card>
  );
}

/* ---------- Hesaplamalar & kısa anlatım ---------- */
function shortNarrative(age:number, summary:{
  overall:{pct:number|null}, cognitive:{pct:number|null}, motor:{pct:number|null}, auditory:{pct:number|null}, visual:{pct:number|null}, executive:{pct:number|null}
}) {
  const grp = groupFromAge(age);
  const pct = (x:number|null)=> x==null? null : Math.round(x);
  const bucket = (p?:number|null)=> p==null? "veri yetersiz" : p<25? "kırmızı (öncelik)": p<75? "sarı (gelişim)": "yeşil (güçlü)";
  const overall = pct(summary.overall.pct);
  const cog = pct(summary.cognitive.pct), mot = pct(summary.motor.pct), aud = pct(summary.auditory.pct), vis = pct(summary.visual.pct), exe = pct(summary.executive.pct);
  const lines:string[] = [];
  lines.push(`Genel: ${overall ?? "-"} → ${bucket(overall)}. Bilişsel: ${cog ?? "-"}; Motor: ${mot ?? "-"}; İşitsel: ${aud ?? "-"}; Görsel: ${vis ?? "-"}; Yürütücü: ${exe ?? "-"}.`);
  if (grp==="child") lines.push("Öneri: kısa, oyunlaştırılmış görevler; 4–6 haftada kısmi retest.");
  else if (grp==="teen") lines.push("Öneri: hız-doğruluk dengesi, çalışma belleği ve esneklik pratiği.");
  else if (grp==="adult") lines.push("Öneri: iş temelli dikkat, görsel arama hızı ve sözel akıcılık destekleri.");
  else lines.push("Öneri: süreleri kısaltın, molaları artırın; düşük yoğunluklu sık tekrar.");
  return lines.join(" ");
}

/* ---------- Ana Uygulama (Wizard) ---------- */
export default function App() {
  // Giriş
  const [age, setAge] = useState<number>(10);
  const [sex, setSex] = useState<Sex>("Erkek");
  const [canCount, setCanCount] = useState<boolean | null>(null); // sadece <8 yaşta sorulur
  const [canRead, setCanRead] = useState<boolean | null>(null);   // sadece <8 yaşta sorulur

  const group = groupFromAge(age);
  const cfg   = AGE_CFG[group];
  const band  = pickBand(age);

  // Wizard adımları: dinamik olarak derlenecek
  type StepKey =
   | "Demografi" | "Oryantasyon" | "Tapping" | "Reaksiyon" | "Stroop" | "Çalışan Bellek"
   | "Ton" | "Görsel Hafıza" | "Sözel Akıcılık" | "Benzerlik" | "Saat" | "Çizgi Bölme"
   | "Trail A" | "Trail B" | "İşaretleme" | "Çizgi Yönü" | "Görsel Arama"
   | "WCST" | "Luria" | "Kompleks Figür" | "Yüz Ayrımı" | "Hikâye" | "Sonuç";

  // Dinamik test seçimi (okuma/sayma ve yaşa göre)
  const steps: StepKey[] = useMemo(() => {
    const arr: StepKey[] = ["Demografi", "Oryantasyon", "Tapping", "Reaksiyon"];
    const literacyOk = age >= 8 || canRead === true;
    const countingOk = age >= 8 || canCount === true;

    if (literacyOk) arr.push("Stroop", "Sözel Akıcılık", "Benzerlik", "Hikâye");
    arr.push("Çalışan Bellek", "Ton", "Görsel Hafıza");

    if (countingOk) arr.push("Trail A", "Trail B");
    arr.push("Saat", "Çizgi Bölme", "İşaretleme", "Çizgi Yönü", "Kompleks Figür", "Yüz Ayrımı", "WCST", "Luria", "Görsel Arama", "Sonuç");
    return arr;
  }, [age, canRead, canCount]);

  const [stepIdx, setStepIdx] = useState(0);

  // Skorlar
  const [scores, setScores] = useState<Record<string, number>>({});
  const setScore = (k:string, v:number)=> setScores(s=> ({...s, [k]: v}));

  // Hesap
  const computed = useMemo<Record<string, MetricResult>>(() => {
    const res: Record<string, MetricResult> = {};
    METRICS.forEach(m => {
      const raw = scores[m.key];
      const { mean, sd } = band[m.key] as ParamDef;
      if (raw==null || Number.isNaN(raw)) { res[m.key] = { z:null, pct:null, mean, sd }; return; }
      let z = (raw - mean) / sd; if (m.direction==="low") z = -z;
      res[m.key] = { z, pct: normCdf(z)*100, mean, sd };
    });
    return res;
  }, [scores, band]);

  const domainSummary = useMemo(() => {
    const avgZ = (keys:string[]) => {
      const arr = keys.map(k => computed[k]?.z).filter((x): x is number => x != null);
      if (!arr.length) return null; return arr.reduce((a,b)=>a+b,0)/arr.length;
    };
    const toPct = (z:number|null)=> z==null? null : normCdf(z)*100;
    const cogZ = avgZ(DOMAINS.cognitive), motZ = avgZ(DOMAINS.motor),
          audZ = avgZ(DOMAINS.auditory), visZ = avgZ(DOMAINS.visual),
          exeZ = avgZ(DOMAINS.executive);
    const allZ = avgZ([...DOMAINS.cognitive, ...DOMAINS.motor, ...DOMAINS.auditory, ...DOMAINS.visual, ...DOMAINS.executive]);
    return {
      cognitive:{ z:cogZ, pct:toPct(cogZ) }, motor:{ z:motZ, pct:toPct(motZ) },
      auditory:{ z:audZ, pct:toPct(audZ) }, visual:{ z:visZ, pct:toPct(visZ) },
      executive:{ z:exeZ, pct:toPct(exeZ) }, overall:{ z:allZ, pct:toPct(allZ) }
    };
  }, [computed]);

  const radarData = useMemo(()=>[
    { domain:"Bilişsel", z: domainSummary.cognitive.z ?? 0 },
    { domain:"Motor",    z: domainSummary.motor.z ?? 0 },
    { domain:"İşitsel",  z: domainSummary.auditory.z ?? 0 },
    { domain:"Görsel",   z: domainSummary.visual.z ?? 0 },
    { domain:"Yürütücü", z: domainSummary.executive.z ?? 0 },
  ], [domainSummary]);

  const barData = useMemo(()=> METRICS.map(m=>({ name:m.key, Percentile: computed[m.key].pct ?? 0 })), [computed]);

  const [notes,setNotes]=useState("");

  /* ---------- Rapor İndir ---------- */
  const downloadJSON = () => {
    const payload = { meta:{ age, sex, canRead, canCount, steps, timestamp:new Date().toISOString() }, scores, computed, domainSummary, notes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download=`assessment_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  /* ---------- UI ---------- */
  const step = steps[stepIdx];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Karma Dijital Değerlendirme – Çok Sayfalı Akış</h1>
        <div className="flex gap-2">
          <Button onClick={()=> window.print()}><Download size={16}/> Yazdır</Button>
          <Button variant="outline" onClick={downloadJSON}>JSON İndir</Button>
        </div>
      </div>

      {/* Wizard üst bar */}
      <Card><CardContent className="flex items-center justify-between">
        <div className="text-sm">Adım: <b>{stepIdx+1}</b> / {steps.length} — <span className="font-medium">{step}</span></div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={stepIdx===0} onClick={()=> setStepIdx(i=> Math.max(0, i-1))}>Geri</Button>
          <Button variant="outline" disabled={stepIdx>=steps.length-1} onClick={()=> setStepIdx(i=> Math.min(steps.length-1, i+1))}>İleri</Button>
        </div>
      </CardContent></Card>

      {/* DEMOGRAFİ */ }
      {step==="Demografi" && (
        <Card><CardContent className="grid md:grid-cols-3 gap-4">
          <div><Label>Yaş</Label><Input type="number" min={3} max={100} value={age} onChange={e=> setAge(Number(e.target.value||0))} /></div>
          <div><Label>Cinsiyet</Label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={sex} onChange={e=> setSex(e.target.value as Sex)}>
              <option>Erkek</option><option>Kadın</option><option>Diğer</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 flex items-end">Grup: <b className="ml-1">{group}</b></div>

          {/* <8 yaş için dinamik sorular */}
          {age<8 && (
            <>
              <div><Label>Saymayı biliyor mu?</Label>
                <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" onChange={e=> setCanCount(e.target.value==="Evet")}><option>Seçin</option><option>Evet</option><option>Hayır</option></select>
              </div>
              <div><Label>Okumayı biliyor mu?</Label>
                <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" onChange={e=> setCanRead(e.target.value==="Evet")}><option>Seçin</option><option>Evet</option><option>Hayır</option></select>
              </div>
              <div className="text-xs text-gray-500">Not: Bu iki soru yalnızca 8 yaş altına gösterilir.</div>
            </>
          )}

          <div className="md:col-span-3">
            <Button className="mt-2" onClick={()=> setStepIdx(1)}>Başlat</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Test sayfaları */}
      {step==="Oryantasyon"   && <Orientation onDone={(v)=> { setScore("C_ORI",v); setStepIdx(i=>i+1); }} />}
      {step==="Tapping"       && <TappingTest seconds={cfg.TAPPING_SEC} onDone={(v)=> { setScore("M_TAP", v); setStepIdx(i=>i+1); }} />}
      {step==="Reaksiyon"     && <ReactionTest trials={cfg.RT_TRIALS} onDone={(v)=> { setScore("M_RT",  v); setStepIdx(i=>i+1); }} />}
      {step==="Stroop"        && <StroopTest trials={cfg.STROOP_TRIALS} onDone={(v)=> { setScore("C_ATT", v); setStepIdx(i=>i+1); }} />}
      {step==="Çalışan Bellek"&& <WorkingMemoryTest startLen={cfg.WM_START} maxLen={cfg.WM_MAX} onDone={(v)=> { setScore("C_WM",  v); setStepIdx(i=>i+1); }} />}
      {step==="Ton"           && <AuditoryDiscrimination trials={cfg.TONE_TRIALS} diffHz={group==="adult"?20:group==="teen"?25:30} onDone={(v)=> { setScore("A_DIS", v); setStepIdx(i=>i+1); }} />}
      {step==="Görsel Hafıza" && <VisualMemory grid={cfg.VISMEM_GRID} cells={cfg.VISMEM_CELLS} onDone={(v)=> { setScore("V_VM",  v); setStepIdx(i=>i+1); }} />}
      {step==="Sözel Akıcılık"&& <VerbalFluency seconds={cfg.FLU_SEC} categories={cfg.FLU_CATS} onDone={(v)=> { setScore("C_FLU", v); setStepIdx(i=>i+1); }} />}
      {step==="Benzerlik"     && <SimilarityJudgement onDone={(v)=> { setScore("C_SIM", v); setStepIdx(i=>i+1); }} />}
      {step==="Saat"          && <ClockDrawing onDone={(v)=> { setScore("V_CLOCK", v); setStepIdx(i=>i+1); }} />}
      {step==="Çizgi Bölme"   && <LineBisection onDone={(v)=> { setScore("V_BIS_DEV", v); setStepIdx(i=>i+1); }} />}
      {step==="Trail A"       && <Trail n={cfg.TMA_N} pattern={Array(cfg.TMA_N).fill("N")} onDone={(ms)=> { setScore("V_TMA", ms); setStepIdx(i=>i+1); }} />}
      {step==="Trail B"       && <Trail n={cfg.TMB_N} pattern={Array.from({length:cfg.TMB_N},(_,i)=> i%2===0?"N":"A")} onDone={(ms)=> { setScore("V_TMB", ms); setStepIdx(i=>i+1); }} />}
      {step==="İşaretleme"    && <CancellationTest width={cfg.CANC_W} height={cfg.CANC_H} pTarget={cfg.CANC_P} seconds={cfg.CANC_SEC} onDone={(v)=> { setScore("V_ATT_CONT", v); setStepIdx(i=>i+1); }} />}
      {step==="Çizgi Yönü"    && <LineOrientationTest choices={cfg.LINE_CHOICES} toleranceDeg={cfg.LINE_TOL} onDone={(v)=> { setScore("V_LINE", v); setStepIdx(i=>i+1); }} />}
      {step==="Kompleks Figür"&& <ReyLike onDone={(v)=> { setScore("V_REY", v); setStepIdx(i=>i+1); }} />}
      {step==="Yüz Ayrımı"    && <FaceDiscrimination onDone={(v)=> { setScore("V_FACE", v); setStepIdx(i=>i+1); }} />}
      {step==="WCST"          && <WCSTLight onDone={(v)=> { setScore("EX_WCST", v); setStepIdx(i=>i+1); }} />}
      {step==="Luria"         && <LuriaAlternation onDone={(v)=> { setScore("EX_LURIA", v); setStepIdx(i=>i+1); }} />}
      {step==="Görsel Arama"  && <VisualSearchRT trials={cfg.VSEARCH_TRIALS} grid={group==="adult"?5:4} onDone={(v)=> { setScore("V_VSRT", v); setStepIdx(i=>i+1); }} />}

      {/* SONUÇ */}
      {step==="Sonuç" && (
        <>
          <Card><CardContent>
            <h2 className="text-lg font-semibold mb-3">Sonuçlar (Yaş: {age}, Grup: {group})</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-72">
                <ResponsiveContainer><RadarChart data={radarData}>
                  <PolarGrid /><PolarAngleAxis dataKey="domain" /><PolarRadiusAxis angle={30} domain={[-3,3]} />
                  <Radar name="Z" dataKey="z" fillOpacity={0.4} /><Legend />
                </RadarChart></ResponsiveContainer>
              </div>
              <div className="h-72">
                <ResponsiveContainer><BarChart data={barData}>
                  <XAxis dataKey="name" /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} />
                  <Tooltip formatter={(v:any)=>`${Number(v).toFixed(1)}%`} /><Bar dataKey="Percentile" />
                </BarChart></ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-6 gap-3 mt-4">
              {([
                { name:"Bilişsel", key:"cognitive" },
                { name:"Motor", key:"motor" },
                { name:"İşitsel", key:"auditory" },
                { name:"Görsel", key:"visual" },
                { name:"Yürütücü", key:"executive" },
                { name:"Genel", key:"overall" },
              ] as const).map(({name,key})=>{
                const pct = (domainSummary as any)[key].pct as number| null|undefined;
                const z = (domainSummary as any)[key].z as number| null|undefined;
                const color = !pct? "bg-gray-200 text-gray-700" : pct<25? "bg-red-100 text-red-700" : pct<75? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                return (
                  <div key={key} className={`rounded-xl p-3 text-sm ${color}`}>
                    <div className="font-medium">{name}</div>
                    <div>Z: {z!=null? z.toFixed(2): "-"}</div>
                    <div>%: {pct!=null? pct.toFixed(1): "-"}</div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>

          <Card><CardContent>
            <h3 className="text-sm font-medium mb-2">Yaşa Göre Kısa Değerlendirme</h3>
            <p className="text-sm">{shortNarrative(age, {
              overall:{pct:domainSummary.overall.pct},
              cognitive:{pct:domainSummary.cognitive.pct},
              motor:{pct:domainSummary.motor.pct},
              auditory:{pct:domainSummary.auditory.pct},
              visual:{pct:domainSummary.visual.pct},
              executive:{pct:domainSummary.executive.pct}
            })}</p>
            <h3 className="text-sm font-medium mt-4 mb-2">Uzman Notu</h3>
            <Textarea value={notes} onChange={e=> setNotes(e.target.value)} placeholder="Gözlemler, öneriler, takip planı" />
            <div className="mt-3 flex gap-3">
              <Button onClick={()=> window.print()}><Download size={16}/> Yazdır</Button>
              <Button variant="outline" onClick={downloadJSON}>JSON İndir</Button>
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
