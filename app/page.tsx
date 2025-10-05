"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

/* ------------------------------------------------------------- */
/* Basit UI parçaları (Tailwind ile)                             */
/* ------------------------------------------------------------- */
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

/* ------------------------------------------------------------- */
/* Türler                                                         */
/* ------------------------------------------------------------- */
type Sex = "Kadın" | "Erkek" | "Diğer";
type MetricDir = "high" | "low";
interface MetricDef { key: string; label: string; direction: MetricDir; }
interface ParamDef { mean: number; sd: number; }
interface Band {
  min: number; max: number;
  [metricKey: string]: number | ParamDef;
}
interface MetricResult { z: number | null; pct: number | null; mean: number; sd: number; }

/* ------------------------------------------------------------- */
/* Normlar (başlangıç parametreleri)                              */
/* ------------------------------------------------------------- */
const PARAMS: Band[] = [
  { min: 0, max: 12,
    C_ATT:{mean:18,sd:6}, C_WM:{mean:3.5,sd:1.0},
    M_TAP:{mean:60,sd:12}, M_RT:{mean:480,sd:90},
    A_DIS:{mean:14,sd:4}, A_MEM:{mean:3.2,sd:0.8},
    V_VM:{mean:12,sd:4},  V_VSRT:{mean:1100,sd:200},
    V_ATT_CONT:{mean:28,sd:7}, V_LINE:{mean:10,sd:3},
  },
  { min: 13, max: 17,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.5,sd:1.0},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:4.0,sd:0.8},
    V_VM:{mean:14,sd:3},  V_VSRT:{mean:950,sd:180},
    V_ATT_CONT:{mean:36,sd:7}, V_LINE:{mean:12,sd:3},
  },
  { min: 18, max: 59,
    C_ATT:{mean:25,sd:5}, C_WM:{mean:5.0,sd:1.0},
    M_TAP:{mean:80,sd:12}, M_RT:{mean:380,sd:70},
    A_DIS:{mean:18,sd:4}, A_MEM:{mean:4.5,sd:0.8},
    V_VM:{mean:16,sd:3},  V_VSRT:{mean:900,sd:160},
    V_ATT_CONT:{mean:45,sd:8}, V_LINE:{mean:15,sd:3},
  },
  { min: 60, max: 120,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.0,sd:1.0},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:3.6,sd:0.8},
    V_VM:{mean:14,sd:3},  V_VSRT:{mean:980,sd:180},
    V_ATT_CONT:{mean:34,sd:7}, V_LINE:{mean:12,sd:3},
  },
];

const METRICS: MetricDef[] = [
  { key: "C_ATT",      label: "Dikkat / Stroop (doğru)",           direction: "high" },
  { key: "C_WM",       label: "Çalışan Bellek / Span",             direction: "high" },
  { key: "M_TAP",      label: "Motor – Tapping (süre içinde)",     direction: "high" },
  { key: "M_RT",       label: "Motor – Reaksiyon Süresi (ms)",     direction: "low"  },
  { key: "A_DIS",      label: "İşitsel – Ton Ayrımı (doğru)",      direction: "high" },
  { key: "A_MEM",      label: "İşitsel – Dizi Uzunluğu",           direction: "high" },
  { key: "V_VM",       label: "Görsel – Hafıza (doğru)",           direction: "high" },
  { key: "V_VSRT",     label: "Görsel – Arama Reaksiyon (ms)",     direction: "low"  },
  { key: "V_ATT_CONT", label: "Görsel Dikkat – İşaretleme (net)",  direction: "high" },
  { key: "V_LINE",     label: "Görsel – Çizgi Yönü (doğru)",       direction: "high" },
];

const DOMAINS: Record<string, string[]> = {
  cognitive: ["C_ATT", "C_WM"],
  motor:     ["M_TAP", "M_RT"],
  auditory:  ["A_DIS", "A_MEM"],
  visual:    ["V_VM", "V_VSRT", "V_ATT_CONT", "V_LINE"],
};

/* ------------------------------------------------------------- */
/* Yaşa göre akış ayarları                                       */
/* ------------------------------------------------------------- */
function groupFromAge(age: number) {
  if (age <= 12) return "child";
  if (age <= 17) return "teen";
  if (age < 60)  return "adult";
  return "senior";
}
const AGE_CFG: Record<string, any> = {
  child:  { TAPPING_SEC: 20, RT_TRIALS: 4,  STROOP_TRIALS: 12, WM_START: 3, WM_MAX: 6,  TONE_TRIALS: 10, VISMEM_GRID: 3, VISMEM_CELLS: 3, VSEARCH_TRIALS: 5,  CANC_W:10, CANC_H:8,  CANC_P:0.08, CANC_SEC:45, LINE_CHOICES:6,  LINE_TOL:10 },
  teen:   { TAPPING_SEC: 25, RT_TRIALS: 5,  STROOP_TRIALS: 16, WM_START: 4, WM_MAX: 7,  TONE_TRIALS: 12, VISMEM_GRID: 3, VISMEM_CELLS: 4, VSEARCH_TRIALS: 6,  CANC_W:12, CANC_H:10, CANC_P:0.07, CANC_SEC:40, LINE_CHOICES:8,  LINE_TOL:8  },
  adult:  { TAPPING_SEC: 30, RT_TRIALS: 6,  STROOP_TRIALS: 20, WM_START: 5, WM_MAX: 8,  TONE_TRIALS: 14, VISMEM_GRID: 4, VISMEM_CELLS: 5, VSEARCH_TRIALS: 8,  CANC_W:14, CANC_H:12, CANC_P:0.06, CANC_SEC:35, LINE_CHOICES:10, LINE_TOL:6  },
  senior: { TAPPING_SEC: 25, RT_TRIALS: 5,  STROOP_TRIALS: 16, WM_START: 4, WM_MAX: 7,  TONE_TRIALS: 12, VISMEM_GRID: 3, VISMEM_CELLS: 4, VSEARCH_TRIALS: 6,  CANC_W:12, CANC_H:10, CANC_P:0.07, CANC_SEC:40, LINE_CHOICES:8,  LINE_TOL:8  },
};

/* ------------------------------------------------------------- */
/* Ortak yardımcılar                                              */
/* ------------------------------------------------------------- */
const normCdf = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
};
const pickBand = (age: number) => PARAMS.find(p => age >= p.min && age <= p.max) || PARAMS[2];

/* ------------------------------------------------------------- */
/* Test 1: Tapping                                                */
/* ------------------------------------------------------------- */
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

/* ------------------------------------------------------------- */
/* Test 2: Reaksiyon Süresi                                       */
/* ------------------------------------------------------------- */
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
  useEffect(() => { start(); /* first mount */ }, []);
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

/* ------------------------------------------------------------- */
/* Test 3: Stroop (C_ATT)                                         */
/* ------------------------------------------------------------- */
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
    const ink = mismatch
      ? COLORS.filter(c=>c.word!==w)[Math.floor(Math.random()*(COLORS.length-1))].ink
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

/* ------------------------------------------------------------- */
/* Test 4: Çalışan Bellek – Sayı Dizisi (C_WM)                    */
/* ------------------------------------------------------------- */
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

/* ------------------------------------------------------------- */
/* Test 5: İşitsel – Ton Ayrımı (A_DIS)                            */
/* ------------------------------------------------------------- */
function playTone(freq:number, ms:number) {
  const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  o.start();
  setTimeout(()=>{ o.stop(); ctx.close(); }, ms);
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
  const playPair = () => {
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
        <Button onClick={playPair} disabled={lock}>Çal</Button>
        <Button variant="outline" onClick={()=>answer("same")}>Aynı</Button>
        <Button variant="outline" onClick={()=>answer("diff")}>Farklı</Button>
      </div>
      <div className="text-xs text-gray-500">Not: Cihaz sesini açın. Tarayıcı ilk seste izin isteyebilir.</div>
    </CardContent></Card>
  );
}

/* ------------------------------------------------------------- */
/* Test 6: Görsel Hafıza (V_VM)                                    */
/* ------------------------------------------------------------- */
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

/* ------------------------------------------------------------- */
/* Test 7: İşaretleme – Cancellation (V_ATT_CONT)                  */
/* ------------------------------------------------------------- */
function CancellationTest({
  width, height, pTarget, seconds, onDone
}: { width:number; height:number; pTarget:number; seconds:number; onDone:(net:number)=>void }) {
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

  const clickCell = (i:number) => {
    if (!running) return;
    setGrid(prev => {
      const next = [...prev];
      if (!next[i].clicked) next[i].clicked = true;
      return next;
    });
  };

  const finish = () => {
    const correct = grid.filter(c => c.isTarget && c.clicked).length;
    const wrong   = grid.filter(c => !c.isTarget && c.clicked).length;
    const net = correct - wrong; // net skor
    onDone(net);
    setRunning(false);
  };

  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">İşaretleme Testi (Süre: {seconds} sn)</h3>
      <div className="flex items-center gap-3 mb-3">
        <Button onClick={() => { setRunning(true); }}>{running ? "Devam" : "Başlat"}</Button>
        <div className="text-sm">Kalan: <b>{running ? left : seconds}</b> sn</div>
      </div>
      <div className="grid gap-1 select-none"
           style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, width: `${width*28}px` }}>
        {grid.map((cell, i) => (
          <div key={i} onClick={() => clickCell(i)}
               className={`h-7 rounded border cursor-pointer ${cell.clicked ? (cell.isTarget ? "bg-emerald-300" : "bg-red-300") : "bg-gray-50"}`}
               title={cell.isTarget ? "hedef" : "distraktör"} />
        ))}
      </div>
      {running && <div className="mt-3"><Button variant="outline" onClick={finish}>Bitir</Button></div>}
    </CardContent></Card>
  );
}

/* ------------------------------------------------------------- */
/* Test 8: Çizgi Yönünü Belirleme (V_LINE)                         */
/* ------------------------------------------------------------- */
function LineOrientationTest({
  choices, toleranceDeg, trials, onDone
}: { choices:number; toleranceDeg:number; trials?:number; onDone:(correct:number)=>void }) {
  const TRIALS = trials ?? 20;
  const [trial, setTrial] = useState(0);
  const [target, setTarget] = useState(0);
  const [opts, setOpts] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);

  const newTrial = () => {
    const t = Math.floor(Math.random()*180); // 0–179°
    setTarget(t);
    const step = Math.floor(180/choices);
    const base = Math.floor(Math.random()*step);
    const arr = Array.from({length: choices}, (_,k)=> ((base + k*step) % 180));
    setOpts(arr.sort(()=> 0.5 - Math.random()));
  };

  useEffect(() => { newTrial(); }, []);

  const pick = (deg:number) => {
    const diff = Math.abs(((deg - target + 180) % 180)); // dairesel fark 0..179
    const delta = Math.min(diff, 180 - diff);
    const ok = Math.abs(delta) <= toleranceDeg;
    if (ok) setCorrect(c=>c+1);
    const n = trial + 1; setTrial(n);
    if (n < TRIALS) newTrial(); else onDone(correct + (ok ? 1 : 0));
  };

  const line = (deg:number) => (
    <div className="w-24 h-2 bg-black origin-center" style={{ transform: `rotate(${deg}deg)` }} />
  );

  return (
    <Card className="mt-4"><CardContent>
      <h3 className="text-lg font-semibold mb-2">Çizgi Yönünü Belirleme</h3>
      <div className="text-sm mb-3">Deneme: <b>{Math.min(trial+1, TRIALS)}</b> / {TRIALS}</div>

      <div className="flex items-center gap-8 mb-4">
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">Hedef</div>
          {line(target)}
        </div>
        <div className="grid grid-cols-5 gap-3">
          {opts.map((d,i)=> (
            <div key={i} className="flex flex-col items-center">
              {line(d)}
              <Button variant="outline" className="mt-1 text-xs" onClick={()=> pick(d)}>{d}°</Button>
            </div>
          ))}
        </div>
      </div>
    </CardContent></Card>
  );
}

/* ------------------------------------------------------------- */
/* Test 9: Görsel Arama – RT (V_VSRT)                              */
/* ------------------------------------------------------------- */
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
      <h3 className="text-lg font-semibold mb-2">Görsel Arama – Hedefe hızlı tıklayın</h3>
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

/* ------------------------------------------------------------- */
/* Kısa değerlendirme (yaşa göre)                                  */
/* ------------------------------------------------------------- */
function shortNarrative(age:number, summary:{
  overall:{pct:number|null}, cognitive:{pct:number|null}, motor:{pct:number|null}, auditory:{pct:number|null}, visual:{pct:number|null}
}) {
  const grp = groupFromAge(age);
  const pct = (x:number|null)=> x==null? null : Math.round(x);
  const bucket = (p?:number|null)=> p==null? "veri yetersiz" : p<25? "kırmızı (öncelik)": p<75? "sarı (gelişim)": "yeşil (güçlü)";

  const overall = pct(summary.overall.pct);
  const cog = pct(summary.cognitive.pct), mot = pct(summary.motor.pct),
        aud = pct(summary.auditory.pct), vis = pct(summary.visual.pct);

  const lines:string[] = [];
  lines.push(`Genel performans: ${overall ?? "-"} yüzdelik → ${bucket(overall)}. Bilişsel: ${cog ?? "-"} → ${bucket(cog)}; Motor: ${mot ?? "-"} → ${bucket(mot)}. İşitsel: ${aud ?? "-"} → ${bucket(aud)}; Görsel: ${vis ?? "-"} → ${bucket(vis)}.`);

  if (grp==="child") {
    lines.push("Öneri: Kısa ve oyunlaştırılmış egzersizlerle dikkat ve işitsel ayırt etme pekiştirilebilir. 4–6 hafta sonra kısmi yeniden test.");
  } else if (grp==="teen") {
    lines.push("Öneri: Hız-doğruluk dengesini geliştiren görevlerde tekrar; çalışma belleği için artan dizi uzunluğu pratikleri.");
  } else if (grp==="adult") {
    lines.push("Öneri: İş temelli dikkat ve görsel arama hızını artıran egzersizler; ritim/ton ayırt temelli işitsel çalışmalar.");
  } else {
    lines.push("Öneri: Süreleri kısaltıp molaları artırın; görsel-işitsel hafıza için düşük yoğunluklu, sık tekrarlar.");
  }
  return lines.join(" ");
}

/* ------------------------------------------------------------- */
/* Ana bileşen                                                     */
/* ------------------------------------------------------------- */
export default function App() {
  const [age, setAge] = useState<number>(25);
  const [sex, setSex] = useState<Sex>("Erkek");
  const [notes, setNotes] = useState("");
  const group = groupFromAge(age);
  const cfg   = AGE_CFG[group];
  const band  = pickBand(age);

  const STEPS = [
    "Demografi","Tapping","Reaksiyon","Stroop","Çalışan Bellek",
    "Ton Ayrımı","Görsel Hafıza","İşaretleme","Çizgi Yönü","Görsel Arama","Sonuç"
  ] as const;
  const [step, setStep] = useState<number>(0);

  const [scores, setScores] = useState<Record<string, number>>({});
  const setScore = (k:string, v:number)=> setScores(s=> ({...s, [k]: v}));

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
          audZ = avgZ(DOMAINS.auditory), visZ = avgZ(DOMAINS.visual);
    const allZ = avgZ([...DOMAINS.cognitive, ...DOMAINS.motor, ...DOMAINS.auditory, ...DOMAINS.visual]);
    return {
      cognitive:{ z:cogZ, pct:toPct(cogZ) }, motor:{ z:motZ, pct:toPct(motZ) },
      auditory:{ z:audZ, pct:toPct(audZ) }, visual:{ z:visZ, pct:toPct(visZ) },
      overall:{ z:allZ, pct:toPct(allZ) }
    };
  }, [computed]);

  const radarData = useMemo(()=>[
    { domain:"Bilişsel", z: domainSummary.cognitive.z ?? 0 },
    { domain:"Motor",    z: domainSummary.motor.z ?? 0 },
    { domain:"İşitsel",  z: domainSummary.auditory.z ?? 0 },
    { domain:"Görsel",   z: domainSummary.visual.z ?? 0 },
  ], [domainSummary]);

  const barData = useMemo(()=> METRICS.map(m=>({ name:m.key, Percentile: computed[m.key].pct ?? 0 })), [computed]);

  const downloadJSON = () => {
    const payload = { meta:{ age, sex, group, timestamp:new Date().toISOString() }, scores, computed, domainSummary, notes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download=`assessment_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Karma Dijital Değerlendirme – Yaşa Göre Adaptif</h1>
        <div className="flex gap-2">
          <Button onClick={()=> window.print()}><Download size={16}/> Raporu Yazdır</Button>
          <Button variant="outline" onClick={downloadJSON}>Veriyi İndir (JSON)</Button>
        </div>
      </div>

      {/* Demografi */}
      <Card><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><Label>Yaş</Label><Input type="number" min={3} max={100} value={age} onChange={e=> setAge(Number(e.target.value||0))} /></div>
        <div><Label>Cinsiyet</Label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={sex} onChange={e=> setSex(e.target.value as Sex)}>
            <option>Erkek</option><option>Kadın</option><option>Diğer</option>
          </select>
        </div>
        <div className="flex items-end text-xs text-gray-500">Grup: <b className="ml-1">{group}</b> – zorluk/deneme sayısı otomatik ayarlı.</div>
      </CardContent></Card>

      {/* Akış kontrolü */}
      <Card><CardContent className="flex items-center justify-between">
        <div className="text-sm">Adım: <b>{step+1}</b> / {STEPS.length}</div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={step===0} onClick={()=> setStep(s=> Math.max(0, s-1))}>Geri</Button>
          <Button variant="outline" disabled={step>=STEPS.length-1} onClick={()=> setStep(s=> Math.min(STEPS.length-1, s+1))}>İleri</Button>
        </div>
      </CardContent></Card>

      {/* Adımlar */}
      {step===0 && (
        <Card><CardContent>
          <p className="text-sm text-gray-600">“Başlat” ile tam akışı başlatın: Tapping → Reaksiyon → Stroop → Çalışan Bellek → Ton Ayrımı → Görsel Hafıza → İşaretleme → Çizgi Yönü → Görsel Arama → Sonuç.</p>
          <Button className="mt-2" onClick={()=> setStep(1)}>Başlat</Button>
        </CardContent></Card>
      )}

      {step===1 && <TappingTest seconds={cfg.TAPPING_SEC} onDone={(v)=> { setScore("M_TAP", v); setStep(2); }} />}
      {step===2 && <ReactionTest trials={cfg.RT_TRIALS} onDone={(v)=> { setScore("M_RT", v); setStep(3); }} />}
      {step===3 && <StroopTest trials={cfg.STROOP_TRIALS} onDone={(v)=> { setScore("C_ATT", v); setStep(4); }} />}
      {step===4 && <WorkingMemoryTest startLen={cfg.WM_START} maxLen={cfg.WM_MAX} onDone={(v)=> { setScore("C_WM", v); setStep(5); }} />}
      {step===5 && <AuditoryDiscrimination trials={cfg.TONE_TRIALS} diffHz={group==="adult"? 20 : group==="teen"? 25 : 30} onDone={(v)=> { setScore("A_DIS", v); setStep(6); }} />}
      {step===6 && <VisualMemory grid={cfg.VISMEM_GRID} cells={cfg.VISMEM_CELLS} onDone={(v)=> { setScore("V_VM", v); setStep(7); }} />}
      {step===7 && <CancellationTest width={cfg.CANC_W} height={cfg.CANC_H} pTarget={cfg.CANC_P} seconds={cfg.CANC_SEC} onDone={(net)=> { setScore("V_ATT_CONT", net); setStep(8); }} />}
      {step===8 && <LineOrientationTest choices={cfg.LINE_CHOICES} toleranceDeg={cfg.LINE_TOL} onDone={(v)=> { setScore("V_LINE", v); setStep(9); }} />}
      {step===9 && <VisualSearchRT trials={cfg.VSEARCH_TRIALS} grid={group==="adult"?5:4} onDone={(v)=> { setScore("V_VSRT", v); setStep(10); }} />}

      {/* Sonuçlar */}
      {step===10 && (
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

            <div className="grid md:grid-cols-5 gap-3 mt-4">
              {([
                { name:"Bilişsel", key:"cognitive" },
                { name:"Motor", key:"motor" },
                { name:"İşitsel", key:"auditory" },
                { name:"Görsel", key:"visual" },
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
            <h3 className="text-sm font-medium mb-2">Yaş Grubuna Göre Kısa Değerlendirme</h3>
            <p className="text-sm">{shortNarrative(age, {
              overall:{pct:domainSummary.overall.pct},
              cognitive:{pct:domainSummary.cognitive.pct},
              motor:{pct:domainSummary.motor.pct},
              auditory:{pct:domainSummary.auditory.pct},
              visual:{pct:domainSummary.visual.pct}
            })}</p>
            <h3 className="text-sm font-medium mt-4 mb-2">Uzman Notu</h3>
            <Textarea value={notes} onChange={e=> setNotes(e.target.value)} placeholder="Gözlemler, öneriler, takip planı" />
            <div className="mt-3 flex gap-3">
              <Button onClick={()=> window.print()}><Download size={16}/> Raporu Yazdır</Button>
              <Button variant="outline" onClick={downloadJSON}>Veriyi İndir (JSON)</Button>
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
