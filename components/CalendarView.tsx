"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Clock } from "lucide-react";
import type { Task, CalendarEvent } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { dateToISO, arabicDayName, arabicMonthName, formatTime12, timeToMinutes, minutesToTime, computeEndTime } from "@/lib/utils";

interface Props {
  tasks: Task[];
  events: CalendarEvent[];
  selectedDate: string;
  categoryColors?: Record<string, string>;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onTimeSlotClick?: (time: string) => void;
  onTaskClick?: (task: Task) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMoveTask?: (id: string, newStartTime: string) => void;
  onMoveEvent?: (id: string, newStartTime: string) => void;
}

const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;

export function CalendarView({
  tasks, events, selectedDate, categoryColors,
  onSelectDate, onPrevWeek, onNextWeek, onToday,
  onTimeSlotClick, onTaskClick, onEventClick,
  onMoveTask, onMoveEvent,
}: Props) {
  const selected = new Date(selectedDate);
  const today = dateToISO(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });
  const [dragOverMinutes, setDragOverMinutes] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const topPx = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT - 80;
    scrollRef.current.scrollTop = Math.max(0, topPx);
  }, []);

  // Resolve category colors
  const resolvedCats = useMemo(() => {
    if (!categoryColors) return CATEGORIES;
    const result: typeof CATEGORIES = {};
    for (const [id, cat] of Object.entries(CATEGORIES)) {
      const color = categoryColors[id] ?? cat.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      result[id] = { ...cat, color, ring: `rgba(${r},${g},${b},0.3)`, bg: `rgb(${Math.round(r+(255-r)*0.85)},${Math.round(g+(255-g)*0.85)},${Math.round(b+(255-b)*0.85)})`, text: `rgb(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)})` };
    }
    return result;
  }, [categoryColors]);

  // Week days (Saturday first)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const ref = new Date(selected);
    ref.setDate(ref.getDate() - ((ref.getDay() + 1) % 7));
    for (let i = 0; i < 7; i++) { const d = new Date(ref); d.setDate(ref.getDate() + i); days.push(d); }
    return days;
  }, [selectedDate]);

  // Day tasks with computed end time
  const dayTasks = useMemo(() =>
    tasks.filter(t => t.date === selectedDate && t.startTime).map(t => ({
      ...t,
      computedEnd: computeEndTime(t.startTime!, t.pomodorosPlanned, t.pomodoroMinutes, t.breakMinutes),
    })), [tasks, selectedDate]);

  const untimedTasks = useMemo(() => tasks.filter(t => t.date === selectedDate && !t.startTime), [tasks, selectedDate]);
  const dayEvents = useMemo(() => events.filter(e => e.date === selectedDate), [events, selectedDate]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, { tasks: Task[]; events: CalendarEvent[] }> = {};
    weekDays.forEach(d => {
      const iso = dateToISO(d);
      map[iso] = { tasks: tasks.filter(t => t.date === iso), events: events.filter(e => e.date === iso) };
    });
    return map;
  }, [weekDays, tasks, events]);

  const getPos = useCallback((start: string, end: string) => {
    const s = timeToMinutes(start), e = timeToMinutes(end);
    return { top: ((s - START_HOUR * 60) / 60) * HOUR_HEIGHT, height: Math.max(((e - s) / 60) * HOUR_HEIGHT, 28) };
  }, []);

  // Calculate time from clientY within the scrollable area
  const clientYToMinutes = useCallback((clientY: number) => {
    if (!scrollRef.current) return START_HOUR * 60;
    const rect = scrollRef.current.getBoundingClientRect();
    const relY = clientY - rect.top + scrollRef.current.scrollTop;
    const mins = START_HOUR * 60 + (relY / HOUR_HEIGHT) * 60;
    return Math.round(mins / 15) * 15;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverMinutes(null);
    setDragging(false);
    const itemId = e.dataTransfer.getData("itemId");
    const type = e.dataTransfer.getData("type");
    const offsetMins = parseInt(e.dataTransfer.getData("offsetMins") || "0");
    const rawMins = clientYToMinutes(e.clientY) - offsetMins;
    const snapped = Math.round(rawMins / 15) * 15;
    const newTime = minutesToTime(Math.max(START_HOUR * 60, Math.min((END_HOUR - 1) * 60, snapped)));
    if (type === "task") onMoveTask?.(itemId, newTime);
    else onMoveEvent?.(itemId, newTime);
  }, [clientYToMinutes, onMoveTask, onMoveEvent]);

  const isSelectedToday = selectedDate === today;
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-ink-800 leading-tight">
            {arabicMonthName(selected)} <span className="text-ink-400 font-bold tabular">{selected.getFullYear()}</span>
          </h2>
          <p className="text-xs text-ink-500">{arabicDayName(selected)} {selected.getDate()}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrevWeek} className="w-8 h-8 rounded-xl hover:bg-ink-100 flex items-center justify-center border border-ink-100"><ChevronRight className="w-4 h-4 text-ink-600" /></button>
          <button onClick={onToday} className="px-3 h-8 rounded-xl hover:bg-ink-100 border border-ink-100 text-xs font-bold text-ink-700">اليوم</button>
          <button onClick={onNextWeek} className="w-8 h-8 rounded-xl hover:bg-ink-100 flex items-center justify-center border border-ink-100"><ChevronLeft className="w-4 h-4 text-ink-600" /></button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="rounded-2xl overflow-hidden border border-ink-100" style={{ background: "rgba(255,255,255,0.8)" }}>
        <div className="grid grid-cols-7">
          {weekDays.map(d => {
            const iso = dateToISO(d);
            const isSel = iso === selectedDate, isToday = iso === today;
            const items = [...(tasksByDay[iso]?.tasks || []), ...(tasksByDay[iso]?.events || [])];
            return (
              <motion.button key={iso} whileTap={{ scale: 0.95 }} onClick={() => onSelectDate(iso)}
                className="flex flex-col items-center py-3 transition"
                style={{ background: isSel ? "#1A1814" : isToday ? "rgba(232,168,124,0.12)" : "transparent" }}>
                <span className="text-[10px] font-bold mb-1" style={{ color: isSel ? "rgba(255,255,255,0.6)" : "#8A8170" }}>{arabicDayName(d).slice(0, 3)}</span>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black tabular"
                  style={{ background: isToday && !isSel ? "#E8A87C" : "transparent", color: isSel ? "#FFF" : isToday ? "#FFF" : "#1A1814" }}>
                  {d.getDate()}
                </span>
                <div className="flex gap-0.5 mt-1.5 h-1.5">
                  {items.slice(0, 3).map(item => (
                    <div key={item.id} className="w-1 h-1 rounded-full"
                      style={{ background: isSel ? "rgba(255,255,255,0.5)" : ("type" in item ? item.color : (item as Task).color || resolvedCats[(item as Task).category]?.color || "#888") }} />
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Day View — direction:ltr fixes RTL time column */}
      <div ref={scrollRef} className="rounded-2xl border border-ink-100 overflow-y-auto"
        style={{ background: "rgba(255,255,255,0.9)", maxHeight: "520px", direction: "ltr" }}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOverMinutes(clientYToMinutes(e.clientY)); }}
        onDragLeave={() => setDragOverMinutes(null)}
      >
        <div className="relative" style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>

          {/* Hour rows */}
          {hours.map(hour => {
            const topPx = (hour - START_HOUR) * HOUR_HEIGHT;
            const isCur = isSelectedToday && Math.floor(nowMinutes / 60) === hour;
            return (
              <div key={hour} className="absolute inset-x-0 border-t border-ink-100"
                style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT}px` }}>
                {/* Time label - LEFT side (works because direction:ltr) */}
                <div className="absolute left-0 top-0 w-14 flex items-start justify-end pr-2 pt-1 pointer-events-none">
                  <span className="text-[10px] font-bold tabular" style={{ color: isCur ? "#E8A87C" : "#B0AA9E" }}>
                    {formatTime12(`${hour.toString().padStart(2, "0")}:00`)}
                  </span>
                </div>
                {/* Clickable zone */}
                <div className="absolute inset-y-0 cursor-pointer hover:bg-blue-50/20"
                  style={{ left: "3.75rem", right: 0 }}
                  onClick={() => !dragging && onTimeSlotClick?.(`${hour.toString().padStart(2, "0")}:00`)} />
                {/* Half-hour dashed line */}
                <div className="absolute border-t border-dashed border-ink-100 pointer-events-none"
                  style={{ top: `${HOUR_HEIGHT / 2}px`, left: "3.75rem", right: 0 }} />
              </div>
            );
          })}

          {/* Now line */}
          {isSelectedToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowTop}px` }}>
              <div className="w-14 flex justify-end pr-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow" /></div>
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}

          {/* Drag preview line */}
          {dragging && dragOverMinutes !== null && dragOverMinutes >= START_HOUR * 60 && dragOverMinutes <= END_HOUR * 60 && (
            <div className="absolute z-30 pointer-events-none flex items-center"
              style={{ top: `${((dragOverMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`, left: "3.75rem", right: 0 }}>
              <div className="flex-1 border-t-2 border-blue-400 border-dashed" />
              <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded mr-1">
                {formatTime12(minutesToTime(dragOverMinutes))}
              </span>
            </div>
          )}

          {/* Task cards */}
          {dayTasks.map(task => {
            const { top, height } = getPos(task.startTime!, task.computedEnd);
            const cat = resolvedCats[task.category];
            const cardColor = task.color || cat?.color || "#888";
            const cardBg = task.color ? `${task.color}18` : cat?.bg || "#F0F0F0";
            const cardText = task.color || cat?.text || "#444";
            return (
              <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute z-10"
                style={{ top: `${top}px`, height: `${height}px`, left: "4rem", right: "0.5rem" }}
              >
                <div
                  draggable
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    setDragging(true);
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const offsetMins = Math.round(((e.clientY - rect.top) / HOUR_HEIGHT) * 60);
                    e.dataTransfer.setData("itemId", task.id);
                    e.dataTransfer.setData("type", "task");
                    e.dataTransfer.setData("offsetMins", String(offsetMins));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => { setDragging(false); setDragOverMinutes(null); }}
                  onClick={() => onTaskClick?.(task)}
                  className="h-full rounded-xl px-2.5 py-1.5 overflow-hidden flex flex-col justify-between border-l-4 shadow-sm hover:shadow-md transition-shadow select-none cursor-grab active:cursor-grabbing"
                  style={{ background: cardBg, borderLeftColor: cardColor, opacity: task.done ? 0.65 : 1 }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[11px] font-bold leading-tight line-clamp-2 flex-1"
                      style={{ color: task.done ? "#9A9490" : cardText, textDecoration: task.done ? "line-through" : "none", direction: "rtl" }}>
                      🍅 {task.title}
                    </p>
                    {task.done && <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded-full font-bold">✓</span>}
                  </div>
                  {height > 36 && (
                    <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
                      <Clock className="w-2.5 h-2.5" style={{ color: cardColor }} />
                      <span className="text-[9px] tabular" style={{ color: cardText }}>
                        {formatTime12(task.startTime!)} — {formatTime12(task.computedEnd)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Event cards */}
          {dayEvents.map(ev => {
            const { top, height } = getPos(ev.startTime, ev.endTime);
            return (
              <motion.div key={ev.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute z-10"
                style={{ top: `${top}px`, height: `${height}px`, left: "4rem", right: "0.5rem" }}
              >
                <div
                  draggable
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    setDragging(true);
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const offsetMins = Math.round(((e.clientY - rect.top) / HOUR_HEIGHT) * 60);
                    e.dataTransfer.setData("itemId", ev.id);
                    e.dataTransfer.setData("type", "event");
                    e.dataTransfer.setData("offsetMins", String(offsetMins));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => { setDragging(false); setDragOverMinutes(null); }}
                  onClick={() => onEventClick?.(ev)}
                  className="h-full rounded-xl px-2.5 py-1.5 overflow-hidden flex flex-col justify-between border-l-4 shadow-sm hover:shadow-md transition-shadow select-none cursor-grab active:cursor-grabbing"
                  style={{ background: `${ev.color}18`, borderLeftColor: ev.color }}
                >
                  <p className="text-[11px] font-bold leading-tight line-clamp-2" style={{ color: ev.color, direction: "rtl" }}>
                    📌 {ev.title}
                  </p>
                  {height > 36 && (
                    <div className="flex items-center gap-1" style={{ direction: "ltr" }}>
                      <Clock className="w-2.5 h-2.5" style={{ color: ev.color }} />
                      <span className="text-[9px] tabular font-medium" style={{ color: ev.color }}>
                        {formatTime12(ev.startTime)} — {formatTime12(ev.endTime)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

        </div>
      </div>

      {/* Untimed tasks */}
      {untimedTasks.length > 0 && (
        <div className="rounded-xl border border-dashed border-ink-200 p-3" style={{ background: "rgba(255,255,255,0.5)" }}>
          <p className="text-[10px] font-bold text-ink-400 mb-2">مهام بدون وقت ({untimedTasks.length})</p>
          {untimedTasks.map(t => {
            const cat = resolvedCats[t.category];
            const c = t.color || cat?.color || "#888";
            return (
              <div key={t.id} className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => onTaskClick?.(t)}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                <span className="text-xs font-medium flex-1" style={{ color: t.done ? "#9A9490" : "#1A1814", textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: cat?.bg, color: cat?.text }}>{cat?.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
