"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Task } from "./types";
import { playEndChime, playStartChime, playBreakChime, sendNotification } from "./sound";

export type Phase = "idle" | "work" | "break" | "longBreak";

export interface PomodoroAPI {
  taskId: string | null;
  task: Task | null;
  phase: Phase;
  remainingMs: number;
  totalMs: number;
  isRunning: boolean;
  cycleCount: number; // عدد الجلسات المكتملة في الجلسة الحالية مع المهمة
  start: (task: Task) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  setPhase: (phase: Phase) => void;
}

export function usePomodoro(
  tasks: Task[],
  onTaskUpdate: (taskId: string, updater: (t: Task) => Task) => void,
  options: { soundEnabled: boolean; autoStartNext: boolean; startSoundEnabled: boolean }
): PomodoroAPI {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetEndRef = useRef<number | null>(null);

  const task = taskId ? tasks.find((t) => t.id === taskId) ?? null : null;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const taskRef = useRef(task);
  taskRef.current = task;

  const cycleCountRef = useRef(cycleCount);
  cycleCountRef.current = cycleCount;

  // دالة لحساب الـ phase التالي
  const computeNextPhase = useCallback((current: Phase, completedCycles: number, t: Task | null): Phase => {
    if (!t) return "idle";
    if (current === "work") {
      const next = completedCycles + 1;
      const isLongBreakTime = next % t.longBreakAfter === 0;
      return isLongBreakTime ? "longBreak" : "break";
    }
    return "work";
  }, []);

  const phaseDurationMs = useCallback((p: Phase, t: Task): number => {
    if (p === "work") return t.pomodoroMinutes * 60 * 1000;
    if (p === "break") return t.breakMinutes * 60 * 1000;
    if (p === "longBreak") return t.longBreakMinutes * 60 * 1000;
    return 0;
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // الانتقال لـ phase معيّن
  const transitionTo = useCallback(
    (newPhase: Phase, t: Task) => {
      const duration = phaseDurationMs(newPhase, t);
      setPhase(newPhase);
      setRemainingMs(duration);
      setTotalMs(duration);
      targetEndRef.current = Date.now() + duration;

      // إشعار وصوت
      if (optionsRef.current.soundEnabled) {
        if (newPhase === "work") {
          if (optionsRef.current.startSoundEnabled) playStartChime();
          sendNotification("بدأت جلسة عمل", t.title);
        } else if (newPhase === "break" || newPhase === "longBreak") {
          playBreakChime();
          const label = newPhase === "longBreak" ? "استراحة طويلة" : "استراحة قصيرة";
          sendNotification(label, `${newPhase === "longBreak" ? t.longBreakMinutes : t.breakMinutes} دقيقة`);
        }
      }
    },
    [phaseDurationMs]
  );

  // Tick
  useEffect(() => {
    if (!isRunning) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (targetEndRef.current === null) return;
      const remain = targetEndRef.current - Date.now();

      if (remain <= 0) {
        // انتهى الـ phase الحالي
        const t = taskRef.current;
        if (!t) {
          setIsRunning(false);
          setPhase("idle");
          setRemainingMs(0);
          stopInterval();
          return;
        }

        // إذا كنا في work، نزيد العدّاد
        if (phase === "work") {
          const newCycles = cycleCountRef.current + 1;
          setCycleCount(newCycles);
          // تحديث المهمة في القائمة
          onTaskUpdate(t.id, (old) => ({
            ...old,
            pomodorosCompleted: old.pomodorosCompleted + 1,
            done: old.pomodorosCompleted + 1 >= old.pomodorosPlanned,
          }));

          if (optionsRef.current.soundEnabled) playEndChime();
          sendNotification("اكتملت جلسة!", `${t.title} — وقت الراحة`);

          const nextPhase = computeNextPhase("work", newCycles, t);
          if (optionsRef.current.autoStartNext) {
            transitionTo(nextPhase, t);
          } else {
            setPhase(nextPhase);
            setRemainingMs(phaseDurationMs(nextPhase, t));
            setTotalMs(phaseDurationMs(nextPhase, t));
            targetEndRef.current = null;
            setIsRunning(false);
          }
        } else {
          // انتهت استراحة → نعود إلى work
          if (optionsRef.current.soundEnabled) playEndChime();
          sendNotification("انتهت الاستراحة", "ابدأ الجلسة التالية");

          if (optionsRef.current.autoStartNext) {
            transitionTo("work", t);
          } else {
            setPhase("work");
            setRemainingMs(phaseDurationMs("work", t));
            setTotalMs(phaseDurationMs("work", t));
            targetEndRef.current = null;
            setIsRunning(false);
          }
        }
      } else {
        setRemainingMs(remain);
      }
    }, 250);

    return () => stopInterval();
  }, [isRunning, phase, computeNextPhase, transitionTo, phaseDurationMs, onTaskUpdate, stopInterval]);

  const start = useCallback(
    (t: Task) => {
      stopInterval();
      setTaskId(t.id);
      setCycleCount(0);
      transitionTo("work", t);
      setIsRunning(true);
    },
    [transitionTo, stopInterval]
  );

  const pause = useCallback(() => {
    setIsRunning(false);
    stopInterval();
    if (targetEndRef.current !== null) {
      // نحفظ المتبقّي
      const remain = Math.max(0, targetEndRef.current - Date.now());
      setRemainingMs(remain);
      targetEndRef.current = null;
    }
  }, [stopInterval]);

  const resume = useCallback(() => {
    if (!task) return;
    targetEndRef.current = Date.now() + remainingMs;
    setIsRunning(true);
  }, [remainingMs, task]);

  const stop = useCallback(() => {
    stopInterval();
    setIsRunning(false);
    setTaskId(null);
    setPhase("idle");
    setRemainingMs(0);
    setTotalMs(0);
    setCycleCount(0);
    targetEndRef.current = null;
  }, [stopInterval]);

  const skip = useCallback(() => {
    if (!task) return;
    if (phase === "work") {
      // اعتبر الجلسة منجزة
      const newCycles = cycleCount + 1;
      setCycleCount(newCycles);
      onTaskUpdate(task.id, (old) => ({
        ...old,
        pomodorosCompleted: old.pomodorosCompleted + 1,
        done: old.pomodorosCompleted + 1 >= old.pomodorosPlanned,
      }));
      const nextPhase = computeNextPhase("work", newCycles, task);
      transitionTo(nextPhase, task);
    } else {
      transitionTo("work", task);
    }
    setIsRunning(true);
  }, [task, phase, cycleCount, computeNextPhase, transitionTo, onTaskUpdate]);

  const setPhaseManual = useCallback(
    (p: Phase) => {
      if (!task) return;
      transitionTo(p, task);
      setIsRunning(true);
    },
    [task, transitionTo]
  );

  return {
    taskId,
    task,
    phase,
    remainingMs,
    totalMs,
    isRunning,
    cycleCount,
    start,
    pause,
    resume,
    stop,
    skip,
    setPhase: setPhaseManual,
  };
}
