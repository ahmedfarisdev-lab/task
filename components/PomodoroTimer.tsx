"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, X, Volume2, VolumeX, Coffee } from "lucide-react";
import type { Task } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatMs } from "@/lib/utils";
import type { PomodoroAPI } from "@/lib/usePomodoro";

interface Props {
  pomodoro: PomodoroAPI;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function PomodoroTimer({ pomodoro, soundEnabled, onToggleSound }: Props) {
  const { task, phase, remainingMs, totalMs, isRunning, cycleCount, pause, resume, stop, skip } = pomodoro;

  if (!task || phase === "idle") {
    return (
      <div className="rounded-3xl bg-white/60 backdrop-blur-md border border-ink-100 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ink-50 flex items-center justify-center">
          <Play className="w-7 h-7 text-ink-400" />
        </div>
        <h3 className="text-lg font-bold text-ink-700 mb-1">المؤقت جاهز</h3>
        <p className="text-sm text-ink-400">اضغط على زر التشغيل بجانب أي مهمة لبدء البومودورو</p>
      </div>
    );
  }

  const cat = CATEGORIES[task.category];
  const progress = totalMs > 0 ? ((totalMs - remainingMs) / totalMs) * 100 : 0;

  const isWork = phase === "work";
  const isBreak = phase === "break" || phase === "longBreak";

  const phaseLabel =
    phase === "work"
      ? `جلسة ${task.pomodorosCompleted + 1} / ${task.pomodorosPlanned}`
      : phase === "break"
      ? "استراحة قصيرة"
      : "استراحة طويلة";

  const accentColor = isBreak ? "#A8B5A0" : cat.color;
  const bgColor = isBreak ? "#EDF2EA" : cat.bg;

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, rgba(255,255,255,0.9) 100%)`,
        borderColor: accentColor + "30",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? "dot-ping" : ""}`}
            style={{ background: accentColor, color: accentColor }}
          />
          <span className="text-xs font-bold tracking-wide" style={{ color: accentColor }}>
            {phaseLabel}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleSound}
            className="w-8 h-8 rounded-full hover:bg-white/60 flex items-center justify-center transition focus-ring"
            aria-label={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-ink-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-ink-400" />
            )}
          </button>
          <button
            onClick={stop}
            className="w-8 h-8 rounded-full hover:bg-white/60 flex items-center justify-center transition focus-ring"
            aria-label="إيقاف"
          >
            <X className="w-4 h-4 text-ink-500" />
          </button>
        </div>
      </div>

      {/* Task title */}
      <div className="px-6 pb-2">
        <h3 className="text-xl font-bold text-ink-800 leading-tight">{task.title}</h3>
        {task.notes && <p className="text-xs text-ink-400 mt-1 line-clamp-1">{task.notes}</p>}
      </div>

      {/* Circle timer */}
      <div className="flex justify-center py-4">
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.12"
              strokeWidth="8"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={accentColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={Math.floor(remainingMs / 1000)}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="text-5xl font-black tabular text-ink-800"
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {formatMs(remainingMs)}
              </motion.div>
            </AnimatePresence>
            {isBreak && (
              <div className="flex items-center gap-1 mt-1 text-xs text-ink-500">
                <Coffee className="w-3 h-3" />
                <span>وقت الراحة</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cycle dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {Array.from({ length: task.pomodorosPlanned }).map((_, i) => {
          const isDone = i < task.pomodorosCompleted;
          const isCurrent = i === task.pomodorosCompleted && isWork;
          return (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: isCurrent ? "24px" : "8px",
                height: "8px",
                background: isDone || isCurrent ? accentColor : accentColor + "30",
              }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 flex gap-2 justify-center">
        {isRunning ? (
          <button
            onClick={pause}
            className="btn-base px-6 py-3 rounded-2xl bg-ink-800 text-white font-bold flex items-center gap-2 hover:bg-ink-700 focus-ring"
          >
            <Pause className="w-5 h-5" fill="currentColor" />
            إيقاف مؤقت
          </button>
        ) : (
          <button
            onClick={resume}
            className="btn-base px-6 py-3 rounded-2xl text-white font-bold flex items-center gap-2 focus-ring"
            style={{ background: accentColor }}
          >
            <Play className="w-5 h-5" fill="currentColor" />
            متابعة
          </button>
        )}
        <button
          onClick={skip}
          className="btn-base px-4 py-3 rounded-2xl bg-white/70 hover:bg-white text-ink-700 font-bold flex items-center gap-2 focus-ring border border-ink-100"
        >
          <SkipForward className="w-4 h-4" />
          تخطي
        </button>
      </div>
    </motion.div>
  );
}
