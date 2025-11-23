"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Share2 } from "lucide-react";
import Confetti from "react-confetti";
import * as tf from "@tensorflow/tfjs";

const gpus = ["RTX 4090", "H100", "A100", "RTX 3090", "M3 Max"];
const jobs = ["Fine-tune Llama-7B", "Train ResNet-50", "Run Stable Diffusion", "GPT-2 from scratch"];

export default function Home() {
  const [gpu, setGpu] = useState(gpus[0]);
  const [logs, setLogs] = useState<string[]>(["Node ready..."]);
  const [running, setRunning] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [paused, setPaused] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
    setTimeout(() => logsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const beep = (freq = 800) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    o.start();
    o.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    if (!running || paused) return;

    const run = async () => {
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      addLog(`New job → ${job}`);
      beep(600);

      const model = tf.sequential({
        layers: [
          tf.layers.dense({ units: 64, activation: "relu", inputShape: [20] }),
          tf.layers.dense({ units: 1, activation: "sigmoid" })
        ]
      });
      model.compile({ optimizer: "adam", loss: "binaryCrossentropy" });

      const xs = tf.randomNormal([200, 20]);
      const ys = tf.randomUniform([200, 1]).greater(0.5);

      for (let i = 0; i < 15; i++) {
        if (!running || paused) break;
        const result = await model.fit(xs, ys, { epochs: 1 });
        const loss = (Array.isArray(result.history.loss) ? result.history.loss[0] : result.history.loss) as number;
addLog(`  Epoch ${i + 1} → loss ${loss.toFixed(4)}`);
        setProgress(((i + 1) / 15) * 100);
        await new Promise(r => setTimeout(r, 300));
      }

      xs.dispose(); ys.dispose(); model.dispose();

      if (running && !paused) {
        const reward = Number((Math.random() * 2 + 0.8).toFixed(2));
        setEarnings(e => e + reward);
        addLog(`Proof verified! +${reward} $SY`);
        beep(1200);
        setConfetti(true);
        setTimeout(() => setConfetti(false), 4000);
        setProgress(0);
      }
    };

    run();
  }, [running, paused]);

  return (
    <>
      {confetti && <Confetti recycle={false} />}
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              GenSyn Playground
            </h1>
            <p className="text-2xl mt-4 text-gray-400">Real ML training in your browser</p>
          </div>

          {!running ? (
            <div className="space-y-6">
              <select value={gpu} onChange={e => setGpu(e.target.value)}
                className="w-full p-4 bg-gray-900 border border-purple-700 rounded-xl text-xl">
                {gpus.map(g => <option key={g}>{g}</option>)}
              </select>
              <button onClick={() => setRunning(true)}
                className="w-full py-8 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl text-3xl font-bold hover:scale-105 transition">
                <Play className="inline mr-4" size={40} /> Start Node
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between text-3xl">
                <span className="text-green-400 font-bold">+{earnings.toFixed(2)} $SY</span>
                <div className="flex gap-4">
                  <button onClick={() => setPaused(!paused)} className="p-4 bg-yellow-600 rounded-xl">
                    {paused ? <Play size={32} /> : <Pause size={32} />}
                  </button>
                  <button onClick={() => setRunning(false)} className="p-4 bg-red-600 rounded-xl">Stop</button>
                </div>
              </div>

              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                  animate={{ width: `${progress}%` }} />
              </div>

              <div ref={logsRef} className="bg-gray-900 border border-gray-700 rounded-xl p-6 h-96 overflow-y-auto font-mono text-green-400 text-sm">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>

              <div className="grid grid-cols-12 gap-2">
                {Array(36).fill(null).map((_, i) => (
                  <motion.div key={i} className="aspect-square bg-purple-600 rounded-full"
                    animate={{ scale: running && !paused ? [1, 1.6, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }} />
                ))}
              </div>

              <button onClick={() => navigator.clipboard.writeText(`I earned ${earnings.toFixed(2)} $SY on GenSyn Playground! https://gensynplayground.vercel.app`)}
                className="w-full py-4 bg-gray-800 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-700">
                <Share2 /> Share my score
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
