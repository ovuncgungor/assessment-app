"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

/* ------------------------------------------------------------------ */
/* Basit UI (shadcn yok, sade Tailwind sınıfları)                      */
/* ------------------------------------------------------------------ */
function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl shadow-sm border bg-white ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) {
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

/* ------------------------------------------------------------------ */
/* Normlar (Excel'dekiyle uyumlu; kullanmadıklarımız kalabilir)       */
/* ------------------------------------------------------------------ */
const PARAMS = [
  { min: 0, max: 12,
    C_ATT:{mean:18,sd:6}, C_WM:{mean:3.5,sd:1.0}, C_PROB:{mean:12,sd:4},
    M_TAP:{mean:60,sd:12}, M_RT:{mean:480,sd:90},
    A_DIS:{mean:14,sd:4}, A_MEM:{mean:3.2,sd:0.8}, A_RHY:{mean:78,sd:10},
    V_VS:{mean:11,sd:3}, V_DM:{mean:13,sd:4}, V_VM:{mean:12,sd:4}, V_VSRT:{mean:1100,sd:200} },
  { min: 13, max: 17,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.5,sd:1.0}, C_PROB:{mean:15,sd:4},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:4.0,sd:0.8}, A_RHY:{mean:84,sd:8},
    V_VS:{mean:13,sd:3}, V_DM:{mean:15,sd:3}, V_VM:{mean:14,sd:3}, V_VSRT:{mean:950,sd:180} },
  { min: 18, max: 59,
    C_ATT:{mean:25,sd:5}, C_WM:{mean:5.0,sd:1.0}, C_PROB:{mean:17,sd:4},
    M_TAP:{mean:80,sd:12}, M_RT:{mean:380,sd:70},
    A_DIS:{mean:18,sd:4}, A_MEM:{mean:4.5,sd:0.8}, A_RHY:{mean:88,sd:7},
    V_VS:{mean:15,sd:3}, V_DM:{mean:17,sd:3}, V_VM:{mean:16,sd:3}, V_VSRT:{mean:900,sd:160} },
  { min: 60, max: 120,
    C_ATT:{mean:22,sd:6}, C_WM:{mean:4.0,sd:1.0}, C_PROB:{mean:15,sd:4},
    M_TAP:{mean:70,sd:12}, M_RT:{mean:420,sd:80},
    A_DIS:{mean:16,sd:4}, A_MEM:{mean:3.6,sd:0.8}, A_RHY:{mean:82,sd:9},
    V_VS:{mean:13,sd:3}, V_DM:{mean:15,sd:3}, V_VM:{mean:14,sd:3}, V_VSRT:{mean:980,sd:180} },
];

/* ------------------------------------------------------------------ */
/* Ölçülecek metrikler (bu sürümde gerçekten toplananlar)              */
/* ------------------------------------------------------------------ */
const METRICS = [
  { key: "C_ATT", label: "Dikkat / Stroop (doğru)", direction: "high" },
  { key: "C_WM",  label: "Çalışan Bellek / Span",    direction: "high" },
  { key: "M_TAP", label: "Motor – Tapping (adet)",   direction: "high" },
  { key: "M_RT",  label: "Motor – Reaksiyon (ms)",   direction: "low"  },
  { key: "A_DIS", label: "İşitsel – Ton Ayrımı",     direction: "high" },
  { key: "V_VM",  label: "Görsel – Hafıza (doğru)",  direction: "high" },
  { key: "V_DM",  label: "Görsel – Ayrım (doğru)",   direction: "high" },
  { key: "V_VSRT",label: "Görsel – Arama RT (ms)",   direction: "low"  },
] as const;

const DOMAINS: Record<string, string[]> = {
  cognitive: ["C_ATT", "C_WM"],                 // (C_PROB eklenebilir)
  motor:     ["M_TAP", "M_RT"],
  auditory:  ["A_DIS"],                          // (A_MEM, A_RHY eklenebilir)
  visual:    ["V_VM", "V_DM", "V_VSRT"],         // (V_VS eklenebilir)
};

/* ------------------------------------------------------------------ */
/* Yaşa göre zorluk/iterasyon kuralı                                   */
/* ------------------------------------------------------------------ */
type AgeGroup = "child" | "teen" | "adult" | "senior";
const groupFromAge = (age: number): AgeGroup =>
  age <= 12 ? "child" : age <= 17 ? "teen" : age < 60 ? "adult" : "senior";

const CFG: Record<AgeGroup, {
  tappingSec: number;
  reactionTrials: number;
  stroopTrials: number;
  digitStart: number;
  digitMax: number;
  vmGrid: number;         // NxN
  vmPattern: number;      // kaç hücre yanacak
  toneTrials: number;
  toneDeltaHz: number;    // farklıysa fark büyüklüğü
  vSearchGrid: number;    // NxN
  vSearchTrials: number;
}> = {
  child: { tappingSec: 25, reactionTrials: 5,  stroopTrials: 15, digitStart: 3, digitMax: 6, vmGrid: 3, vmPattern: 3, toneTrials: 10, toneDeltaHz: 60,  vSearchGrid: 3, vSearchTrials: 8  },
  teen:  { tappingSec: 30, reactionTrials: 6,  stroopTrials: 22, digitStart: 4, digitMax: 7, vmGrid: 4, vmPattern: 4, toneTrials: 12, toneDeltaHz: 50,  vSearchGrid: 4, vSearchTrials: 10 },
  adult: { tappingSec: 30, reactionTrials: 7,  stroopTrials: 28, digitStart: 5, digitMax: 8, vmGrid: 4, vmPattern: 4, toneTrials: 12, toneDeltaHz: 40,  vSearchGrid: 4, vSearchTrials: 12 },
  senior:{ tappingSec: 25, reactionTrials: 6,  stroopTrials: 18, digitStart: 4, digitMax: 7, vmGrid: 3, vmPattern: 3, toneTrials: 10, toneDeltaHz: 50,  vSearchGrid: 3, vSearchTrials: 10 },
};

/* ------------------------------------------------------------------ */
/* Ortak yardımcılar                                                   */
/* ------------------------------------------------------------------ */
const normCdf = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return prob;
};
const pickBand = (age: number) => PARAMS.find(p => age >= p.min && age <= p.max) || PARAMS[2];

/* ------------------------------------------------------------------ */
/* TEST 1: Tapping (M_TAP)                                            */
/* ------------------------------------------------------------------ */
function useCountdown(seconds: number, onEnd?: () => void) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          onEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}
function TappingTest({ duration, onDone }: { duration: number; onDone: (tapCount: number) => void }) {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const left = useCountdown(running ? duration : 0, () => { setRunning(false); onDone(count); });
  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Tapping – {duration} sn</h3>
        <p className="text-sm text-gray-600 mb-2">Bu alan açıkken olabildiğince hızlı tıklayın.</p>
        <div className="flex items-center gap-3 mb-3">
          <Button onClick={() => { setCount(0); setRunning(true); }}>Başlat</Button>
          <div className="text-sm">Süre: <b>{running ? left : duration}</b> sn</div>
          <div className="text-sm">Tıklama: <b>{count}</b></div>
        </div>
        <div
          className={`h-40 rounded-xl border flex items-center justify-center select-none ${running ? "bg-green-50" : "bg-gray-50"}`}
          onClick={() => running && setCount(c => c + 1)}
        >
          {running ? "Tıkla!" : "Başlat'a basın"}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 2: Reaksiyon Süresi (M_RT)                                    */
/* ------------------------------------------------------------------ */
function ReactionTest({ trials, onDone }: { trials: number; onDone: (avgMs: number) => void }) {
  const [trial, setTrial] = useState<number>(0);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [green, setGreen] = useState<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const rtsRef = useRef<number[]>([]);

  const startTrial = () => {
    if (trial >= trials) return;
    setWaiting(true); setGreen(false);
    const delay = 800 + Math.random() * 2200; // 0.8–3 sn
    setTimeout(() => { setGreen(true); startTimeRef.current = performance.now(); }, delay);
  };

  const handleClick = () => {
    if (!green) return; // erken tıklama saymayalım
    const rt = performance.now() - startTimeRef.current;
    rtsRef.current.push(rt);
    setTrial(t => t + 1);
    setWaiting(false); setGreen(false);
  };

  useEffect(() => {
    if (trial === 0) startTrial();
    if (trial > 0 && trial < trials) startTrial();
    if (trial === trials) {
      const avg = Math.round(rtsRef.current.reduce((a, b) => a + b, 0) / Math.max(1, rtsRef.current.length));
      onDone(avg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial]);

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Reaksiyon Süresi – {trials} deneme</h3>
        <p className="text-sm text-gray-600 mb-2">Kutucuk yeşile döndüğünde tıklayın.</p>
        <div className="text-sm mb-2">Deneme: <b>{Math.min(trial + (trial < trials ? 1 : 0), trials)}</b> / {trials}</div>
        <div
          className={`h-40 rounded-xl border flex items-center justify-center text-lg font-medium cursor-pointer ${green ? "bg-green-400 text-white" : waiting ? "bg-yellow-50" : "bg-gray-50"}`}
          onClick={handleClick}
        >
          {green ? "TIKLA!" : waiting ? "Hazır olun..." : "Başla"}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 3: Stroop – Dikkat (C_ATT)                                    */
/* ------------------------------------------------------------------ */
const COLORS = ["KIRMIZI", "SARI", "MAVI", "YESIL"] as const;
const CSS_COL: Record<typeof COLORS[number], string> = { KIRMIZI: "red", SARI: "goldenrod", MAVI: "royalblue", YESIL: "seagreen" };
function StroopTest({ trials, onDone }: { trials: number; onDone: (correct: number) => void }) {
  const [i, setI] = useState(0);
  const [word, setWord] = useState<typeof COLORS[number]>("KIRMIZI");
  const [color, setColor] = useState<typeof COLORS[number]>("MAVI");
  const [correct, setCorrect] = useState(0);

  const newTrial = () => {
    const w = COLORS[Math.floor(Math.random()*COLORS.length)];
    let c = COLORS[Math.floor(Math.random()*COLORS.length)];
    if (c === w) c = COLORS[(COLORS.indexOf(c)+1) % COLORS.length]; // uyumsuzluk
    setWord(w); setColor(c);
  };

  useEffect(() => { newTrial(); /* first */ }, []);
  const answer = (picked: typeof COLORS[number]) => {
    if (picked === color) setCorrect(c => c + 1);
    const next = i + 1; setI(next);
    if (next >= trials) onDone(correct + (picked === color ? 1 : 0));
    else newTrial();
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Stroop – {trials} deneme</h3>
        <div className="text-sm mb-2">Doğru: <b>{correct}</b></div>
        <div className="text-3xl font-bold mb-4" style={{ color: CSS_COL[color] }}>{word}</div>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => <Button key={c} onClick={() => answer(c)}>{c}</Button>)}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 4: Sayı Dizisi – Çalışan Bellek (C_WM)                         */
/* ------------------------------------------------------------------ */
function randDigits(n: number) { return Array.from({length:n}, () => Math.floor(Math.random()*10)).join(""); }
function DigitSpanTest({ start, max, onDone }: { start: number; max: number; onDone: (span: number) => void }) {
  const [span, setSpan] = useState(start);
  const [seq, setSeq] = useState("");
  const [show, setShow] = useState(true);
  const [input, setInput] = useState("");
  const [fails, setFails] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const s = randDigits(span);
    setSeq(s); setShow(true);
    const id = setTimeout(()=> setShow(false), Math.min(5000, 900*span)); // ~0.9sn/digit
    return () => clearTimeout(id);
  }, [span]);

  const submit = () => {
    const ok = input.trim() === seq;
    if (ok) { setBest(b => Math.max(b, span)); setSpan(s => Math.min(s+1, max)); setInput(""); setFails(0); }
    else { const f = fails+1; setFails(f); setInput(""); if (f>=2 || span>=max) onDone(best); else {/* aynı spanı tekrar et */} }
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Sayı Dizisi – Başlangıç {start}, Maks {max}</h3>
        <div className="text-sm mb-2">En iyi doğru: <b>{best}</b> | Hata: <b>{fails}</b>/2</div>
        <div className="h-16 flex items-center text-2xl font-mono">
          {show ? seq : "?"}
        </div>
        {!show && (
          <div className="flex gap-2">
            <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Diziyi giriniz" />
            <Button onClick={submit}>Gönder</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 5: Görsel Hafıza (V_VM)                                       */
/* ------------------------------------------------------------------ */
function VisualMemoryTest({ grid, pattern, onDone }: { grid: number; pattern: number; onDone: (correct: number) => void }) {
  const TOTAL = grid * grid;
  const [pat, setPat] = useState<number[]>([]);
  const [show, setShow] = useState(true);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"show"|"recall"|"done">("show");

  useEffect(() => {
    const cells = Array.from({ length: TOTAL }, (_, i) => i);
    const p = cells.sort(() => 0.5 - Math.random()).slice(0, pattern);
    setPat(p); setShow(true); setPhase("show");
    const id = setTimeout(() => { setShow(false); setPhase("recall"); }, 1800 + pattern*200);
    return () => clearTimeout(id);
  }, [grid, pattern]);

  const toggle = (i: number) => {
    if (phase !== "recall") return;
    setSel(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  };
  const finish = () => {
    const correct = Array.from(sel).filter(i => pat.includes(i)).length;
    setPhase("done"); onDone(correct);
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Görsel Hafıza – {grid}×{grid}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {phase === "show" ? "Örüntüyü hatırlayın..." : phase === "recall" ? "Az önce yanan hücreleri seçin ve Bitir'e basın." : "Tamamlandı"}
        </p>
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${grid}, minmax(0,1fr))`, width: grid*64 }}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} onClick={() => toggle(i)}
              className={`h-16 rounded-md border cursor-pointer ${show && pat.includes(i) ? "bg-blue-400" : sel.has(i) ? "bg-blue-200" : "bg-gray-50"}`} />
          ))}
        </div>
        {phase === "recall" && <div className="mt-3"><Button onClick={finish}>Bitir</Button></div>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 6: Ton Ayrımı – Auditory (A_DIS)                              */
/* ------------------------------------------------------------------ */
function ToneDiscrimination({ trials, deltaHz, onDone }: { trials: number; deltaHz: number; onDone: (correct: number) => void }) {
  const [trial, setTrial] = useState(0);
  const [pair, setPair] = useState<{ f1: number; f2: number } | null>(null);
  const [correct, setCorrect] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const playTone = async (freq: number, dur = 0.35) => {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current!;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = freq; gain.gain.value = 0.12;
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
    await new Promise(r => setTimeout(r, dur * 1000));
  };

  const newTrial = async () => {
    const base = 350 + Math.random() * 400; // 350–750 Hz
    const same = Math.random() < 0.5;
    const f1 = base, f2 = same ? base : base + (Math.random() < 0.5 ? -1 : 1) * deltaHz;
    setPair({ f1, f2 });
    // otomatik çalma (kullanıcı ilk etkileşimi yaptıysa çalışır)
    await playTone(f1); await new Promise(r => setTimeout(r, 200)); await playTone(f2);
  };

  useEffect(() => { /* first arm empty */ }, []);

  const answer = (saySame: boolean) => {
    if (!pair) return;
    const isSame = Math.abs(pair.f1 - pair.f2) < 1e-6;
    if ((saySame && isSame) || (!saySame && !isSame)) setCorrect(c => c + 1);
    const next = trial + 1; setTrial(next);
    if (next >= trials) onDone(correct + ((saySame && isSame) || (!saySame && !isSame) ? 1 : 0));
    else newTrial();
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Ton Ayrımı – {trials} deneme</h3>
        <p className="text-sm text-gray-600 mb-2">“İki sesi dinle” butonuna basın; ardından AYNI mı FARKLI mı seçin.</p>
        <div className="flex gap-2 mb-3">
          <Button onClick={newTrial}>İki Sesi Dinle</Button>
          <div className="text-sm">Deneme: <b>{Math.min(trial + (trial < trials ? 1 : 0), trials)}</b> / {trials}</div>
          <div className="text-sm">Doğru: <b>{correct}</b></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => answer(true)}>AYNI</Button>
          <Button onClick={() => answer(false)}>FARKLI</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 7: Görsel Ayrım – Visual (V_DM)                               */
/* ------------------------------------------------------------------ */
const SHAPES = ["◼", "●", "▲", "◆"] as const;
function VisualDiscrimination({ trials, onDone }: { trials: number; onDone: (correct: number) => void }) {
  const [trial, setTrial] = useState(0);
  const [s1, setS1] = useState<typeof SHAPES[number]>("◼");
  const [s2, setS2] = useState<typeof SHAPES[number]>("●");
  const [correct, setCorrect] = useState(0);

  const newTrial = () => {
    const a = SHAPES[Math.floor(Math.random()*SHAPES.length)];
    const same = Math.random() < 0.5;
    const b = same ? a : SHAPES.filter(x => x !== a)[Math.floor(Math.random()*(SHAPES.length-1))];
    setS1(a); setS2(b);
  };
  useEffect(()=>{ newTrial(); },[]);
  const answer = (saySame: boolean) => {
    const isSame = s1 === s2;
    if ((saySame && isSame) || (!saySame && !isSame)) setCorrect(c=>c+1);
    const next = trial + 1; setTrial(next);
    if (next >= trials) onDone(correct + ((saySame && isSame) || (!saySame && !isSame) ? 1 : 0));
    else newTrial();
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Görsel Ayrım – {trials} deneme</h3>
        <div className="flex items-center gap-6 text-5xl my-4">
          <div>{s1}</div><div>{s2}</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => answer(true)}>AYNI</Button>
          <Button onClick={() => answer(false)}>FARKLI</Button>
        </div>
        <div className="text-sm mt-2">Doğru: <b>{correct}</b> / {trials}</div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* TEST 8: Görsel Arama RT (V_VSRT)                                   */
/* ------------------------------------------------------------------ */
function VisualSearchRT({ grid, trials, onDone }: { grid: number; trials: number; onDone: (avgMs: number) => void }) {
  const TOTAL = grid * grid;
  const [trial, setTrial] = useState(0);
  const [target, setTarget] = useState<number>(-1);
  const [start, setStart] = useState<number>(0);
  const rtsRef = useRef<number[]>([]);

  const newTrial = () => {
    const idx = Math.floor(Math.random()*TOTAL);
    setTarget(idx);
    setStart(performance.now());
  };

  useEffect(()=>{ newTrial(); },[]);
  const click = (idx:number) => {
    if (idx !== target) return;
    const rt = performance.now() - start;
    rtsRef.current.push(rt);
    const next = trial+1; setTrial(next);
    if (next >= trials) {
      const avg = Math.round(rtsRef.current.reduce((a,b)=>a+b,0)/Math.max(1,rtsRef.current.length));
      onDone(avg);
    } else newTrial();
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Görsel Arama – {trials} deneme</h3>
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${grid}, minmax(0,1fr))`, width: grid*64 }}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i}
                 onClick={() => click(i)}
                 className={`h-16 rounded-md border cursor-pointer ${i===target? "bg-pink-500" : "bg-gray-100"}`} />
          ))}
        </div>
        <div className="text-sm mt-2">Deneme: <b>{Math.min(trial+1, trials)}</b> / {trials}</div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Ana Bileşen                                                         */
/* ------------------------------------------------------------------ */
type Sex = "Kadın" | "Erkek" | "Diğer";

export default function App() {
  const [age, setAge] = useState<number>(25);
  const [sex, setSex] = useState<Sex>("Erkek");
  const band = pickBand(age);
  const grp = groupFromAge(age);
  const cfg = CFG[grp];

  // Ham skorlar
  const [scores, setScores] = useState<Record<string, number>>({});
  const setScore = (k: string, v: number) => setScores(s => ({ ...s, [k]: v }));

  // Akış
  const [step, setStep] = useState<number>(0);
  const steps = [
    "Demografi",
    "Tapping",
    "Reaksiyon",
    "Stroop",
    "Sayı Dizisi",
    "Görsel Hafıza",
    "Ton Ayrımı",
    "Görsel Ayrım",
    "Görsel Arama",
    "Sonuçlar"
  ];
  const last = steps.length - 1;

  // Skorlama
  const computed = useMemo(() => {
    const res = {} as Record<string, { z: number | null; pct: number | null; mean: number; sd: number }>;
    (METRICS as any).forEach((m: any) => {
      const raw = scores[m.key];
      const mean = (band as any)[m.key].mean;
      const sd = (band as any)[m.key].sd;
      if (raw == null || Number.isNaN(raw)) { res[m.key] = { z: null, pct: null, mean, sd }; return; }
      let z = (raw - mean) / sd;
      if (m.direction === "low") z = -z;
      res[m.key] = { z, pct: normCdf(z) * 100, mean, sd };
    });
    return res;
  }, [scores, band]);

  const domainSummary = useMemo(() => {
    const avgZ = (keys: string[]) => {
      const arr = keys.map(k => computed[k]?.z).filter((x): x is number => x != null);
      if (!arr.length) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };
    const toPct = (z: number | null) => (z == null ? null : normCdf(z) * 100);
    const cogZ = avgZ(DOMAINS.cognitive);
    const motZ = avgZ(DOMAINS.motor);
    const audZ = avgZ(DOMAINS.auditory);
    const visZ = avgZ(DOMAINS.visual);
    const allZ = avgZ([...DOMAINS.cognitive, ...DOMAINS.motor, ...DOMAINS.auditory, ...DOMAINS.visual]);
    return {
      cognitive: { z: cogZ, pct: toPct(cogZ) },
      motor:     { z: motZ, pct: toPct(motZ) },
      auditory:  { z: audZ, pct: toPct(audZ) },
      visual:    { z: visZ, pct: toPct(visZ) },
      overall:   { z: allZ, pct: toPct(allZ) },
    };
  }, [computed]);

  const percentileBarData = useMemo(() => METRICS.map(m => ({ name: m.key, Percentile: computed[m.key]?.pct ?? 0 })), [computed]);
  const radarData = useMemo(() => ([
    { domain: "Bilişsel", z: domainSummary.cognitive.z ?? 0 },
    { domain: "Motor",    z: domainSummary.motor.z ?? 0 },
    { domain: "İşitsel",  z: domainSummary.auditory.z ?? 0 },
    { domain: "Görsel",   z: domainSummary.visual.z ?? 0 },
  ]), [domainSummary]);

  const statusColor = (pct?: number | null) => {
    if (pct == null) return "bg-gray-200 text-gray-700";
    if (pct < 25) return "bg-red-100 text-red-700";
    if (pct < 75) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const shortInterpret = () => {
    const lines: string[] = [];
    const g = grp;
    const o = domainSummary.overall.pct ?? null;
    // Örnek kurallar
    if (domainSummary.motor.pct != null && domainSummary.motor.pct < 25) {
      lines.push("Motor hız/reaksiyon beklenenin altında; basit hız/koordinasyon egzersizleri önerilir.");
    }
    if (domainSummary.cognitive.pct != null && domainSummary.cognitive.pct < 25) {
      lines.push("Dikkat/çalışan bellek alanında belirgin güçlük; kısa süreli dikkat çalışmaları planlanmalı.");
    }
    if (domainSummary.visual.pct != null && domainSummary.visual.pct < 25) {
      lines.push("Görsel hafıza/arama süreçlerinde destek önerilir (örüntü ve hedef bulma pratikleri).");
    }
    if (domainSummary.auditory.pct != null && domainSummary.auditory.pct < 25) {
      lines.push("İşitsel ayrımda zorluk; temel ton ayrımı ve ritim eşleme egzersizleri yararlı olabilir.");
    }
    if (!lines.length) {
      lines.push("Genel profil yaş bandı normları içinde. Güçlü alanlar korunurken düzenli izlem önerilir.");
    }
    const tag = g === "child" ? "Çocuk" : g === "teen" ? "Ergen" : g === "adult" ? "Yetişkin" : "İleri Yaş";
    return `Yaş Grubu: ${tag}. Genel Bileşik ${o != null ? `%${o.toFixed(0)}` : "-"} düzeyinde. Özet: ${lines.join(" ")}`;
  };

  const downloadJSON = () => {
    const payload = { meta: { age, sex, group: grp, timestamp: new Date().toISOString() }, scores, computed, domainSummary, note: shortInterpret() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `assessment_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  /* -------------------------- EKRAN -------------------------- */
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Karma Dijital Değerlendirme (Yaş uyarlanır)</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}><Download size={16}/> Raporu Yazdır</Button>
          <Button variant="outline" onClick={downloadJSON}>Veriyi İndir (JSON)</Button>
        </div>
      </div>

      {/* DEMOGRAFİ */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Yaş</Label>
            <Input type="number" min={3} max={100} value={age} onChange={(e) => { setAge(Number(e.target.value || 0)); }} />
            <div className="text-xs text-gray-500 mt-1">Grup: <b>{grp}</b> | Normlar otomatik uygulanır</div>
          </div>
          <div>
            <Label>Cinsiyet</Label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={sex} onChange={(e)=>setSex(e.target.value as Sex)}>
              <option>Erkek</option><option>Kadın</option><option>Diğer</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-gray-500">Adımlar: {steps.join(" → ")}</div>
          </div>
        </CardContent>
      </Card>

      {/* AKIŞ KONTROL */}
      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm">Adım: <b>{step + 1}</b> / {steps.length} – <span className="text-gray-600">{steps[step]}</span></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=> setStep(s=> Math.max(0, s-1))} disabled={step===0}>Geri</Button>
            <Button variant="outline" onClick={()=> setStep(s=> Math.min(last, s+1))} disabled={step===last}>İleri</Button>
          </div>
        </CardContent>
      </Card>

      {/* ADIMLAR */}
      {step===0 && (
        <Card><CardContent><p className="text-sm text-gray-600">“İleri” ile testleri başlatın. Yaşa göre süre/deneme sayıları otomatik ayarlı.</p></CardContent></Card>
      )}

      {step===1 && <TappingTest duration={cfg.tappingSec} onDone={(v)=> { setScore("M_TAP", v); setStep(2); }} />}
      {step===2 && <ReactionTest trials={cfg.reactionTrials} onDone={(v)=> { setScore("M_RT", v); setStep(3); }} />}
      {step===3 && <StroopTest trials={cfg.stroopTrials} onDone={(v)=> { setScore("C_ATT", v); setStep(4); }} />}
      {step===4 && <DigitSpanTest start={cfg.digitStart} max={cfg.digitMax} onDone={(v)=> { setScore("C_WM", v); setStep(5); }} />}
      {step===5 && <VisualMemoryTest grid={cfg.vmGrid} pattern={cfg.vmPattern} onDone={(v)=> { setScore("V_VM", v); setStep(6); }} />}
      {step===6 && <ToneDiscrimination trials={cfg.toneTrials} deltaHz={cfg.toneDeltaHz} onDone={(v)=> { setScore("A_DIS", v); setStep(7); }} />}
      {step===7 && <VisualDiscrimination trials={12} onDone={(v)=> { setScore("V_DM", v); setStep(8); }} />}
      {step===8 && <VisualSearchRT grid={cfg.vSearchGrid} trials={cfg.vSearchTrials} onDone={(v)=> { setScore("V_VSRT", v); setStep(9); }} />}

      {/* SONUÇLAR */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-3">Sonuçlar</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={[
                  { domain: "Bilişsel", z: domainSummary.cognitive.z ?? 0 },
                  { domain: "Motor",    z: domainSummary.motor.z ?? 0 },
                  { domain: "İşitsel",  z: domainSummary.auditory.z ?? 0 },
                  { domain: "Görsel",   z: domainSummary.visual.z ?? 0 },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="domain" />
                  <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                  <Radar name="Z" dataKey="z" fillOpacity={0.4} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={METRICS.map(m => ({ name: m.key, Percentile: computed[m.key]?.pct ?? 0 }))}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} />
                  <Tooltip formatter={(v: any)=> `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="Percentile" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-3 mt-4">
            {([
              { name: "Bilişsel", key: "cognitive" },
              { name: "Motor", key: "motor" },
              { name: "İşitsel", key: "auditory" },
              { name: "Görsel", key: "visual" },
              { name: "Genel", key: "overall" },
            ] as const).map(({ name, key }) => {
              const pct = (domainSummary as any)[key].pct as number | null | undefined;
              const z = (domainSummary as any)[key].z as number | null | undefined;
              const color = !pct ? "bg-gray-200 text-gray-700" : pct < 25 ? "bg-red-100 text-red-700" : pct < 75 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
              return (
                <div key={key} className={`rounded-xl p-3 text-sm ${color}`}>
                  <div className="font-medium">{name}</div>
                  <div>Z: {z != null ? z.toFixed(2) : "-"}</div>
                  <div>%: {pct != null ? pct.toFixed(1) : "-"}</div>
                </div>
              );
            })}
          </div>

          {/* Yaş grubuna göre kısa değerlendirme */}
          <div className="mt-4 p-3 rounded-xl bg-gray-50 text-sm">
            <div className="font-medium mb-1">Kısa Değerlendirme (Yaş Grubu)</div>
            <div>{shortInterpret()}</div>
            <div className="text-[11px] text-gray-500 mt-2">Not: Bu ekran eğitim ve ön değerlendirme amaçlıdır; klinik tanı için tek başına kullanılmamalıdır.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
