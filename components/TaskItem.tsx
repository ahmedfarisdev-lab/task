"use client";

import { motion } from "framer-motion";
import { Play, Pause, Check, Edit3, Trash2, Clock, Coffee } from "lucide-react";
import type { Task } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { formatTime12 } from "@/lib/utils";

interface Props {
  task: Task;
  isActive: boolean;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskItem({ task, isActive, isRunning, onStart, onPause, onToggleDone, onEdit, onDelete }: Props) {
  const cat = CATEGORIES[task.category];
  const completedRatio = task.pomodorosPlanned > 0 ? task.pomodorosCompleted / task.pomodorosPlanned : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group relative rounded-2xl bg-white/70 backdrop-blur-sm border transition-all hover:shadow-sm"
      style={{
        borderColor: isActive ? cat.color : "rgba(26, 24, 20, 0.06)",
        boxShadow: isActive ? `0 0 0 2px ${cat.ring}` : undefined,
      }}
    >
      {/* color strip */}
      <div className="absolute right-0 top-3 bottom-3 w-1 rounded-l-full" style={{ background: cat.color }} />

      <div className="flex items-start gap-3 p-3 pr-5">
        {/* checkbox */}
        <button
          onClick={onToggleDone}
          className="mt-1 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition focus-ring"
          style={{
            borderColor: task.done ? cat.color : "rgba(26, 24, 20, 0.2)",
            background: task.done ? cat.color : "transparent",
          }}
          aria-label={task.done ? "إلغاء الإنجاز" : "إنجاز المهمة"}
        >
          {task.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h4
              className={`text-sm font-bold leading-snug ${
                task.done ? "text-ink-400 line-through" : "text-ink-800"
              }`}
            >
              {task.title}
            </h4>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: cat.bg, color: cat.text }}
            >
              {cat.label}
            </span>
          </div>

          {task.notes && <p className="text-xs text-ink-400 mt-1 line-clamp-1">{task.notes}</p>}

          {/* meta */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500 flex-wrap">
            {task.startTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="tabular">{formatTime12(task.startTime)}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-ink-400">🍅</span>
              <span className="tabular font-bold">
                {task.pomodorosCompleted}/{task.pomodorosPlanned}
              </span>
              <span className="text-ink-400">×</span>
              <span className="tabular">{task.pomodoroMinutes}د</span>
            </span>
            <span className="flex items-center gap-1 text-ink-400">
              <Coffee className="w-3 h-3" />
              <span className="tabular">
                {task.breakMinutes}/{task.longBreakMinutes}د
              </span>
            </span>
          </div>

          {/* progress */}
          {task.pomodorosPlanned > 0 && !task.done && (
            <div className="mt-2 h-1 bg-ink-50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: cat.color }}
                animate={{ width: `${completedRatio * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </div>

        {/* actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={isActive && isRunning ? onPause : onStart}
            disabled={task.done}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition disabled:opacity-30 disabled:cursor-not-allowed btn-base focus-ring"
            style={{ background: cat.color }}
            aria-label={isActive && isRunning ? "إيقاف مؤقت" : "ابدأ"}
          >
            {isActive && isRunning ? (
              <Pause className="w-4 h-4" fill="currentColor" />
            ) : (
              <Play className="w-4 h-4" fill="currentColor" />
            )}
          </button>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="w-9 h-7 rounded-lg hover:bg-ink-50 flex items-center justify-center text-ink-400 hover:text-ink-700 transition focus-ring"
              aria-label="تعديل"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-7 rounded-lg hover:bg-clay/10 flex items-center justify-center text-ink-400 hover:text-clay-dark transition focus-ring"
              aria-label="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
