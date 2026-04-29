"use client";

import { motion } from "framer-motion";
import type { Task } from "@/lib/types";

interface Props {
  tasks: Task[];
}

export function StatsBar({ tasks }: Props) {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.done).length;
  const totalPlanned = tasks.reduce((sum, t) => sum + t.pomodorosPlanned, 0);
  const totalDone = tasks.reduce((sum, t) => sum + t.pomodorosCompleted, 0);
  const totalMinutes = tasks.reduce((sum, t) => sum + t.pomodorosCompleted * t.pomodoroMinutes, 0);
  const focusHours = (totalMinutes / 60).toFixed(1);

  const taskPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const pomoPct = totalPlanned > 0 ? (totalDone / totalPlanned) * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="مهام منجزة" value={`${doneTasks}/${totalTasks}`} pct={taskPct} accent="#1D9E75" />
      <Stat label="جلسات مكتملة" value={`${totalDone}/${totalPlanned}`} pct={pomoPct} accent="#E8A87C" />
      <Stat label="ساعات تركيز" value={focusHours} pct={Math.min(100, (parseFloat(focusHours) / 8) * 100)} accent="#7B6BB8" />
    </div>
  );
}

function Stat({ label, value, pct, accent }: { label: string; value: string; pct: number; accent: string }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-ink-100">
      <div className="text-[10px] font-bold text-ink-500 mb-1">{label}</div>
      <div className="text-lg font-black text-ink-800 tabular leading-none mb-2">{value}</div>
      <div className="h-1 bg-ink-50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
      </div>
    </div>
  );
}
