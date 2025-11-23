"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Share2, Volume2 } from "lucide-react";
import Confetti from "react-confetti";
import * as tf from "@tensorflow/tfjs";

const gpus = [
  { name: "RTX 4090", power: 450, speed: 0.9 },
  { name: "H100", power: 700, speed: 1.2 },
  { name: "A100", power: 400, speed: 0.8 },
  { name: "RTX 3090", power: 350, speed: 0.7 },
  { name: "M2 MacBook", power: 30, speed: 0.3 },
];

const jobs = [
  { id: 1, name: "Train ResNet-18 on CIFAR-10", duration: 5000, reward: 1.2 },
  { id: 2, name: "Fine-tune Llama-7B", duration: 8000, reward: 2.5 },
  { id: 3, name: "Stable Diffusion Proof", duration: 3000, reward: 0.8 },
  { id: 4, name: "GPT-2 Scratch Train", duration: 6000, reward: 1.8 },
];

export default function Home() {
  const [selectedGpu, setSelectedGpu] = useState(gpus[0]);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "info" | "success" | "bid" }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [progress, setProgress] = useState(0);
  const [jobQueue, setJobQueue] = useState(jobs.slice(0, 2)); // Start with 2 jobs
  const [currentJob, setCurrentJob] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Init simple TF.js model for real training sim
    const initModel = async () => {
      const m = tf.sequential({
        layers: [
          tf.layers.dense({ units: 10, inputShape: [5], activation: "relu" }),
          tf.layers.dense({ units: 1, activation: "sigmoid" }),
        ],
      });
      m.compile({ optimizer: "adam", loss: "binaryCrossentropy" });
      setModel(m);
    };
    initModel();
  }, []);

  const addLog = (msg: string, type: "info" | "success" | "bid" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, msg: `[${type.toUpperCase()}] ${msg}`, type }]);
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  };

  const playSound = (type: "bid" | "train" | "earn") => {
    // Simple beep via Web Audio API (no external audio files)
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(type === "earn" ? 800 : type === "bid" ? 600 : 400, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  };

  const trainModel = async (steps: number) => {
    if (!model) return;
    // Fake data: simple binary classification
    const xs = tf.randomNormal([100, 5]);
    const ys = tf.randomUniform([100, 1], 0, 2).floor();
    for (let i = 0; i < steps; i++) {
      if (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        i--; // Retry step if paused
        continue;
      }
      const loss = await model.train(xs, ys, { epochs: 1 }).then(r => r.history.loss[0]);
      const acc = 50 + (steps - i) * 5; // Fake acc ramp-up
      addLog(`Step ${i + 1}/${steps} → Loss: ${loss?.toFixed(3)}, Acc: ${acc.toFixed(1)}%`, "train" as any);
      setProgress((i / steps) * 100);
      await new Promise(resolve => setTimeout(resolve, 300 / selectedGpu.speed)); // GPU speed affects timing
    }
    xs.dispose();
    ys.dispose();
  };

  const processJob = () => {
    if (currentJob >= jobQueue.length) {
      addLog("Queue empty. Fetching more jobs...");
      setTimeout(() => setJobQueue(prev => [...prev, ...jobs.slice(Math.random() * jobs.length, Math.random() * jobs.length + 1)]), 2000);
      return;
    }
    const job = jobQueue[currentJob];
    addLog(`Processing job ${currentJob + 1}: ${job.name}`, "bid");
    playSound("bid");

    setTimeout(async () => {
      addLog("Training model...");
      playSound("train");
      await trainModel(10); // 10 steps for sim

      addLog("Generating proof...");
      setTimeout(() => {
        const reward = job.reward * selectedGpu.speed;
        setEarnings(prev => prev + reward);
        addLog(`Proof accepted! +${reward.toFixed(2)} $SY earned 🎉`, "success");
        playSound("earn");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setCurrentJob(prev => prev + 1);
        setProgress(0);
      }, 1500);
    }, 1000);
  };

  const startSimulation = () => {
    setIsRunning(true);
    setEarnings(0);
    setLogs([]);
    setCurrentJob(0);
    setProgress(0);
    addLog(`Node started on ${selectedGpu.name} (${selectedGpu.power}W)`);
    processJob();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    addLog(isPaused ? "Node resumed" : "Node paused");
  };

  const shareEarnings = () => {
    const text = `Just earned ${earnings.toFixed(2)} $SY running a GenSyn node in my browser! Try it: https://gensynplayground.vercel.app/ #GenSyn #dePIN`;
    if (navigator.share) {
      navigator.share({ title: "GenSyn Playground", text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      addLog("Share text copied!");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white p-4 flex flex-col items-center justify-center relative">
      <AnimatePresence>{showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}</AnimatePresence>

      <div className="max-w-4xl w-full space-y-6 z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-bold text-center bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
        >
          GenSyn Playground
        </motion.h1>
        <p className="text-xl text-center text-gray-300">Advanced Node Sim: Bid • Train • Prove • Earn (with real ML!)</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <select
            value={selectedGpu.name}
            onChange={e => setSelectedGpu(gpus.find(g => g.name === e.target.value)!)}
            disabled={isRunning}
            className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
          >
            {gpus.map(gpu => (
              <option key={gpu.name} value={gpu.name}>{gpu.name} ({gpu.power}W)</option>
            ))}
          </select>
          {!isRunning ? (
            <button
              onClick={startSimulation}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <Play size={20} /> Start Swarm
            </button>
          ) : (
            <button
              onClick={togglePause}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />} {isPaused ? "Resume" : "Pause"}
            </button>
          )}
        </div>

        {isRunning && (
          <>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            <div className="text-center text-2xl font-bold text-green-400">
              Total: ${earnings.toFixed(2)} $SY | Job {currentJob + 1}/{jobQueue.length}
            </div>

            {/* Queue Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {jobQueue.slice(currentJob).map((job, i) => (
                <motion.div
                  key={job.id}
                  className={`p-2 rounded text-xs ${i === 0 ? "bg-blue-600" : "bg-gray-700"}`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {job.name.split(" ")[0]}
                </motion.div>
              ))}
            </div>

            {/* Terminal */}
            <div ref={logsRef} className="terminal rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 ${log.type === "success" ? "text-green-400" : log.type === "bid" ? "text-blue-400" : "text-gray-400"}`}>
                  {log.time} {log.msg}
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-500 italic">Swarm ready. Starting jobs...</div>}
            </div>

            {/* Neural Net Viz */}
            <div className="grid grid-cols-4 gap-1 h-20">
              {Array.from({ length: 16 }, (_, i) => (
                <motion.div
                  key={i}
                  className="neural-node w-4"
                  animate={isRunning && !isPaused ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.3 }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={shareEarnings} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
                <Share2 size={20} /> Share Earnings
              </button>
              <button onClick={() => playSound("earn")} className="flex items-center gap-2 text-gray-300 hover:text-white transition">
                <Volume2 size={20} /> Test Sound
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
