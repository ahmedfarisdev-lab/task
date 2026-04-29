"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { Task, Category } from "@/lib/types";
import { CATEGORY_LIST } from "@/lib/categories";
import { todayISO, computeEndTime, formatTime12, timesOverlap, timeToMinutes } from "@/lib/utils";

const PRESET_COLORS = ["#7B6BB8","#378ADD","#1D9E75","#D4537E","#D69E2E","#E53E3E","#DD6B20","#319795","#718096","#1A1814"];

interface Props {
  open: boolean;
  task?: Task | null;
  defaultDate: string;
  defaultTime?: string;
  defaultSettings: { pomodoroMinutes: number; breakMinutes: number; longBreakMinutes: number; longBreakAfter: number };
  existingTasks: Task[];
  categoryColors?: Record<string, string>;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: () => void;
}

export function TaskForm({ open, task, defaultDate, defaultTime, defaultSettings, existingTasks, categoryColors, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<Category>("study");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(defaultSettings.pomodoroMinutes);
  const [breakMinutes, setBreakMinutes] = useState(defaultSettings.breakMinutes);
  const [longBreakMinutes, setLongBreakMinutes] = useState(defaultSettings.longBreakMinutes);
  const [longBreakAfter, setLongBreakAfter] = useState(defaultSettings.longBreakAfter);
  const [pomodorosPlanned, setPomodorosPlanned] = useState(4);
  const [timeConflict, setTimeConflict] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const cats = CATEGORY_LIST.map(c => {
    const col = categoryColors?.[c.id] ?? c.color;
    const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
    return { ...c, color: col, bg: `rgb(${Math.round(r+(255-r)*0.85)},${Math.round(g+(255-g)*0.85)},${Math.round(b+(255-b)*0.85)})`, text: `rgb(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)})` };
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title); setNotes(task.notes||""); setCategory(task.category);
      setDate(task.date); setStartTime(task.startTime||""); setColor(task.color);
      setPomodoroMinutes(task.pomodoroMinutes); setBreakMinutes(task.breakMinutes);
      setLongBreakMinutes(task.longBreakMinutes); setLongBreakAfter(task.longBreakAfter);
      setPomodorosPlanned(task.pomodorosPlanned);
    } else {
      setTitle(""); setNotes(""); setCategory("study"); setDate(defaultDate);
      setStartTime(defaultTime||""); setColor(undefined);
      setPomodoroMinutes(defaultSettings.pomodoroMinutes); setBreakMinutes(defaultSettings.breakMinutes);
      setLongBreakMinutes(defaultSettings.longBreakMinutes); setLongBreakAfter(defaultSettings.longBreakAfter);
      setPomodorosPlanned(4);
    }
    setTimeConflict(null); setShowDelete(false);
  }, [task, defaultDate, defaultTime, defaultSettings, open]);

  const computedEnd = startTime ? computeEndTime(startTime, pomodorosPlanned, pomodoroMinutes, breakMinutes) : null;

  useEffect(() => {
    if (!startTime || !computedEnd || !date) { setTimeConflict(null); return; }
    const conflict = existingTasks.find(t => {
      if (task && t.id === task.id) return false;
      if (t.date !== date || !t.startTime) return false;
      const tEnd = computeEndTime(t.startTime, t.pomodorosPlanned, t.pomodoroMinutes, t.breakMinutes);
      return timesOverlap(startTime, computedEnd, t.startTime, tEnd);
    });
    setTimeConflict(conflict ? `"${conflict.title}" محجوزة من ${formatTime12(conflict.startTime!)} إلى ${formatTime12(computeEndTime(conflict.startTime!, conflict.pomodorosPlanned, conflict.pomodoroMinutes, conflict.breakMinutes))}` : null);
  }, [startTime, computedEnd, date, existingTasks, task]);

  const totalMin = startTime && computedEnd
    ? timeToMinutes(computedEnd) - timeToMinutes(startTime) : null;

  const activeCat = cats.find(c => c.id === category)!;
  const displayColor = color || activeCat?.color || "#1A1814";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || timeConflict) return;
    onSave({
      id: task?.id || uuid(), title: title.trim(), notes: notes.trim()||undefined,
      category, date: date||todayISO(), startTime: startTime||undefined,
      endTime: computedEnd||undefined, color: color||undefined,
      pomodoroMinutes, breakMinutes, longBreakMinutes, longBreakAfter,
      pomodorosPlanned, pomodorosCompleted: task?.pomodorosCompleted||0,
      done: task?.done||false, createdAt: task?.createdAt||Date.now(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={onClose} className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40" />
          <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:20, scale:0.96 }} transition={{ type:"spring", damping:25, stiffness:300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto border border-ink-100">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: displayColor }} />
                    <h2 className="text-xl font-black text-ink-800">{task ? "تعديل المهمة" : "مهمة جديدة"}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    {task && onDelete && (
                      <button type="button" onClick={() => setShowDelete(true)}
                        className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center transition">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                    <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-ink-50 flex items-center justify-center">
                      <X className="w-4 h-4 text-ink-500" />
                    </button>
                  </div>
                </div>

                {/* Delete confirm */}
                {showDelete && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <span className="text-sm text-red-700 font-medium">حذف هذه المهمة نهائيًا؟</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowDelete(false)} className="text-xs px-3 py-1.5 rounded-lg bg-white border text-ink-600">إلغاء</button>
                      <button type="button" onClick={() => { onDelete?.(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold">حذف</button>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">عنوان المهمة</label>
                  <input type="text" value={title} onChange={e=>setTitle(e.target.value)} autoFocus required
                    placeholder="مثلاً: مراجعة الفصل الثالث"
                    className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none transition text-sm" />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">الفئة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {cats.map(c => (
                      <button key={c.id} type="button" onClick={() => setCategory(c.id as Category)}
                        className="py-2.5 rounded-xl text-sm font-bold transition border-2"
                        style={{ background: category===c.id ? c.color : c.bg, color: category===c.id ? "#fff" : c.text, borderColor: category===c.id ? c.color : "transparent" }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom color */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-2">لون مخصص (اختياري)</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => setColor(undefined)}
                      className={`w-7 h-7 rounded-full border-2 text-[10px] flex items-center justify-center transition ${!color ? "border-ink-800 bg-ink-100" : "border-ink-200 bg-ink-50 hover:border-ink-400"}`}>
                      ∅
                    </button>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: color===c ? c : "transparent", outline: color===c ? `3px solid ${c}55` : "none", outlineOffset: "2px" }} />
                    ))}
                    <label className="w-7 h-7 rounded-full border-2 border-dashed border-ink-300 flex items-center justify-center cursor-pointer hover:border-ink-500 overflow-hidden relative" title="لون مخصص">
                      <input type="color" value={color||"#000000"} onChange={e=>setColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                      <span className="text-xs text-ink-400">+</span>
                    </label>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-600 mb-1.5">التاريخ</label>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 mb-1.5">وقت البداية</label>
                    <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl bg-ink-50 border outline-none text-sm transition ${timeConflict ? "border-red-400 bg-red-50" : "border-transparent focus:border-ink-300 focus:bg-white"}`} />
                  </div>
                </div>

                {startTime && computedEnd && (
                  <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${timeConflict ? "bg-red-50 border border-red-200" : "bg-ink-50"}`}>
                    {timeConflict ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /> : <Clock className="w-4 h-4 text-ink-400 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-700 tabular">{formatTime12(startTime)} — {formatTime12(computedEnd)}</span>
                        {totalMin && <span className="text-[10px] text-ink-400">({totalMin} دقيقة)</span>}
                      </div>
                      {timeConflict && <p className="text-[10px] text-red-600 mt-0.5">{timeConflict}</p>}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">ملاحظات (اختياري)</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="تفاصيل إضافية..."
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none text-sm resize-none" />
                </div>

                {/* Pomodoro */}
                <div className="bg-ink-50/60 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-ink-700">🍅 إعدادات البومودورو</h3>
                  <NR label="عدد الجلسات" value={pomodorosPlanned} onChange={setPomodorosPlanned} min={1} max={20} suffix="جلسة" />
                  <NR label="مدة جلسة العمل" value={pomodoroMinutes} onChange={setPomodoroMinutes} min={5} max={90} step={5} suffix="دقيقة" />
                  <NR label="الاستراحة القصيرة" value={breakMinutes} onChange={setBreakMinutes} min={1} max={30} suffix="دقيقة" />
                  <NR label="الاستراحة الطويلة" value={longBreakMinutes} onChange={setLongBreakMinutes} min={5} max={60} step={5} suffix="دقيقة" />
                  <NR label="استراحة طويلة كل" value={longBreakAfter} onChange={setLongBreakAfter} min={2} max={8} suffix="جلسات" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-ink-50 hover:bg-ink-100 text-ink-700 font-bold text-sm transition">إلغاء</button>
                  <button type="submit" disabled={!title.trim()||!!timeConflict}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
                    style={{ background: timeConflict ? "#EF4444" : displayColor }}>
                    {timeConflict ? "الوقت محجوز ⛔" : task ? "حفظ التعديلات" : "إضافة المهمة"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NR({ label, value, onChange, min, max, step=1, suffix }: { label:string; value:number; onChange:(v:number)=>void; min:number; max:number; step?:number; suffix:string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-700 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={()=>onChange(Math.max(min,value-step))} className="w-7 h-7 rounded-lg bg-white hover:bg-ink-100 flex items-center justify-center border border-ink-100"><Minus className="w-3 h-3"/></button>
        <div className="w-16 text-center"><span className="text-sm font-black tabular text-ink-800">{value}</span><span className="text-[10px] text-ink-400 mr-1">{suffix}</span></div>
        <button type="button" onClick={()=>onChange(Math.min(max,value+step))} className="w-7 h-7 rounded-lg bg-white hover:bg-ink-100 flex items-center justify-center border border-ink-100"><Plus className="w-3 h-3"/></button>
      </div>
    </div>
  );
}
