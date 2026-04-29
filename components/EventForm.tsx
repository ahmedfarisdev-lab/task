import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { CalendarEvent } from "@/lib/types";
import { todayISO, formatTime12, timeToMinutes } from "@/lib/utils";

// ألوان سريعة للأحداث
const PRESET_COLORS = [
  "#E53E3E", // أحمر
  "#DD6B20", // برتقالي
  "#D69E2E", // أصفر ذهبي
  "#38A169", // أخضر
  "#3182CE", // أزرق
  "#805AD5", // بنفسجي
  "#D53F8C", // وردي
  "#319795", // تيل
  "#718096", // رمادي
  "#1A1814", // أسود
];

const EVENT_TYPES = [
  { id: "meeting",   label: "اجتماع",      icon: "🤝" },
  { id: "lecture",   label: "محاضرة",      icon: "🎓" },
  { id: "reminder",  label: "تذكير",       icon: "🔔" },
  { id: "call",      label: "مكالمة",      icon: "📞" },
  { id: "other",     label: "أخرى",        icon: "📌" },
];

interface Props {
  open: boolean;
  event?: CalendarEvent | null;
  defaultDate: string;
  defaultTime?: string;
  existingEvents: CalendarEvent[];
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: () => void;
}

export function EventForm({ open, event, defaultDate, defaultTime, existingEvents, onClose, onSave, onDelete }: Props) {
  const [title, setTitle]         = useState("");
  const [notes, setNotes]         = useState("");
  const [date, setDate]           = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime]     = useState("");
  const [color, setColor]         = useState(PRESET_COLORS[4]);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setNotes(event.notes || "");
      setDate(event.date);
      setStartTime(event.startTime);
      setEndTime(event.endTime);
      setColor(event.color);
    } else {
      setTitle("");
      setNotes("");
      setDate(defaultDate);
      setStartTime(defaultTime || "");
      // افتراضي: ساعة بعد البداية
      if (defaultTime) {
        const [h, m] = defaultTime.split(":").map(Number);
        const endH = Math.min(23, h + 1);
        setEndTime(`${endH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      } else {
        setEndTime("");
      }
      setColor(PRESET_COLORS[4]);
    }
    setTimeError(null);
    setShowDelete(false);
  }, [event, defaultDate, defaultTime, open]);

  // التحقق من صحة الوقت والتعارض
  useEffect(() => {
    if (!startTime || !endTime) { setTimeError(null); return; }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setTimeError("وقت النهاية يجب أن يكون بعد وقت البداية");
      return;
    }
    const conflict = existingEvents.find((ev) => {
      if (event && ev.id === event.id) return false;
      if (ev.date !== date) return false;
      const aS = timeToMinutes(startTime), aE = timeToMinutes(endTime);
      const bS = timeToMinutes(ev.startTime), bE = timeToMinutes(ev.endTime);
      return aS < bE && bS < aE;
    });
    if (conflict) {
      setTimeError(`يتعارض مع حدث: "${conflict.title}" ${formatTime12(conflict.startTime)}–${formatTime12(conflict.endTime)}`);
    } else {
      setTimeError(null);
    }
  }, [startTime, endTime, date, existingEvents, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime || timeError) return;

    const newEvent: CalendarEvent = {
      id: event?.id || uuid(),
      type: "event",
      title: title.trim(),
      notes: notes.trim() || undefined,
      date: date || todayISO(),
      startTime,
      endTime,
      color,
      createdAt: event?.createdAt || Date.now(),
    };

    onSave(newEvent);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto border border-ink-100">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <h2 className="text-xl font-black text-ink-800">{event ? "تعديل الحدث" : "حدث جديد"}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    {event && onDelete && (
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

                {showDelete && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <span className="text-sm text-red-700 font-medium">حذف هذا الحدث نهائيًا؟</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowDelete(false)} className="text-xs px-3 py-1.5 rounded-lg bg-white border text-ink-600">إلغاء</button>
                      <button type="button" onClick={() => { onDelete?.(); onClose(); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold">حذف</button>
                    </div>
                  </div>
                )}

                {/* نوع الحدث (للعنوان السريع) */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-2">نوع الحدث</label>
                  <div className="flex gap-2 flex-wrap">
                    {EVENT_TYPES.map((et) => (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => {
                          if (!title) setTitle(et.label);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-ink-100 hover:border-ink-300 hover:bg-ink-50 transition flex items-center gap-1"
                      >
                        <span>{et.icon}</span>
                        <span>{et.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* العنوان */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">العنوان</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    placeholder="مثلاً: اجتماع مع الفريق"
                    className="w-full px-4 py-3 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none text-sm transition"
                    required
                  />
                </div>

                {/* التاريخ والوقت */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">التاريخ</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink-600 mb-1.5">من</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className={`w-full px-3 py-2.5 rounded-xl bg-ink-50 border outline-none text-sm transition ${
                        timeError ? "border-red-300 bg-red-50" : "border-transparent focus:border-ink-300 focus:bg-white"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-600 mb-1.5">إلى</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className={`w-full px-3 py-2.5 rounded-xl bg-ink-50 border outline-none text-sm transition ${
                        timeError ? "border-red-300 bg-red-50" : "border-transparent focus:border-ink-300 focus:bg-white"
                      }`}
                    />
                  </div>
                </div>

                {/* معلومات الوقت / خطأ */}
                {(startTime && endTime) && (
                  <div className={`rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs ${timeError ? "bg-red-50 border border-red-200" : "bg-ink-50"}`}>
                    {timeError
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      : <Clock className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                    }
                    {timeError
                      ? <span className="text-red-600 font-medium">{timeError}</span>
                      : (
                        <span className="text-ink-600 tabular font-bold">
                          {formatTime12(startTime)} — {formatTime12(endTime)}
                          {!timeError && startTime && endTime && (
                            <span className="text-ink-400 font-normal mr-2">
                              ({timeToMinutes(endTime) - timeToMinutes(startTime)} دقيقة)
                            </span>
                          )}
                        </span>
                      )
                    }
                  </div>
                )}

                {/* اختيار اللون */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-2">لون الحدث</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          background: c,
                          borderColor: color === c ? c : "transparent",
                          outline: color === c ? `3px solid ${c}55` : "none",
                          outlineOffset: "2px",
                        }}
                        aria-label={`لون ${c}`}
                      />
                    ))}
                    {/* color picker مخصص */}
                    <label
                      className="w-8 h-8 rounded-full border-2 border-dashed border-ink-200 flex items-center justify-center cursor-pointer hover:border-ink-400 transition overflow-hidden"
                      title="لون مخصص"
                    >
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="opacity-0 absolute w-1 h-1"
                      />
                      <span className="text-xs text-ink-400">+</span>
                    </label>
                  </div>
                </div>

                {/* ملاحظات */}
                <div>
                  <label className="block text-xs font-bold text-ink-600 mb-1.5">ملاحظات (اختياري)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="تفاصيل إضافية، مكان الاجتماع..."
                    className="w-full px-3 py-2.5 rounded-xl bg-ink-50 border border-transparent focus:border-ink-300 focus:bg-white outline-none text-sm resize-none"
                  />
                </div>

                {/* أزرار */}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-ink-50 hover:bg-ink-100 text-ink-700 font-bold text-sm transition">
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || !startTime || !endTime || !!timeError}
                    className="flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition disabled:opacity-50"
                    style={{ background: timeError ? "#EF4444" : color }}
                  >
                    {timeError ? "الوقت محجوز ⛔" : event ? "حفظ التعديلات" : "إضافة الحدث"}
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
