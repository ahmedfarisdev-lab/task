"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Bell, Zap, Music, Palette, Download, Upload, Archive, CheckCircle } from "lucide-react";
import type { AppSettings, ArchiveEntry } from "@/lib/storage";
import { exportAllData, parseImportData, applyImportData, loadArchives } from "@/lib/storage";
import type { Task, CalendarEvent } from "@/lib/types";
import { CATEGORY_LIST } from "@/lib/categories";

interface Props {
  open: boolean;
  settings: AppSettings;
  tasks: Task[];
  events: CalendarEvent[];
  onClose: () => void;
  onChange: (s: AppSettings) => void;
  onRequestNotification: () => void;
  onImport: (tasks: Task[], events: CalendarEvent[], settings: AppSettings) => void;
  notificationStatus: "default" | "granted" | "denied" | "unsupported";
}

export function SettingsPanel({ open, settings, tasks, events, onClose, onChange, onRequestNotification, onImport, notificationStatus }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMsg, setImportMsg]       = useState("");
  const archives: ArchiveEntry[]        = typeof window !== "undefined" ? loadArchives() : [];
  const totalArchived = archives.reduce((s, a) => s + a.tasks.length + a.events.length, 0);

  const handleExport = () => exportAllData(tasks, events, settings);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const data = parseImportData(json);
      if (!data) {
        setImportStatus("error");
        setImportMsg("الملف غير صالح أو تالف");
        return;
      }
      applyImportData(data);
      onImport(data.tasks, data.events, { ...data.settings } as AppSettings);
      setImportStatus("success");
      setImportMsg(`تم استيراد ${data.tasks.length} مهمة و ${data.events.length} حدث بنجاح`);
    };
    reader.readAsText(file);
    // reset input
    e.target.value = "";
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
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-ink-800">الإعدادات</h2>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-ink-50 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sound */}
              <Section icon={<Volume2 className="w-4 h-4" />} title="الأصوات">
                <Toggle
                  label="تشغيل صوت انتهاء الجلسة"
                  description="نغمة جرس عند اكتمال البومودورو والاستراحة"
                  value={settings.soundEnabled}
                  onChange={(v) => onChange({ ...settings, soundEnabled: v })}
                />
                <Toggle
                  label="صوت بداية الجلسة"
                  description="نغمة قصيرة عند بدء كل جلسة عمل"
                  value={settings.startSoundEnabled}
                  onChange={(v) => onChange({ ...settings, startSoundEnabled: v })}
                />
              </Section>

              {/* Notifications */}
              <Section icon={<Bell className="w-4 h-4" />} title="الإشعارات">
                <div className="bg-ink-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-700">إشعارات النظام</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          notificationStatus === "granted"
                            ? "#E1F5EE"
                            : notificationStatus === "denied"
                            ? "#FCEBEB"
                            : "#FAEEDA",
                        color:
                          notificationStatus === "granted"
                            ? "#085041"
                            : notificationStatus === "denied"
                            ? "#791F1F"
                            : "#854F0B",
                      }}
                    >
                      {notificationStatus === "granted"
                        ? "مفعّلة"
                        : notificationStatus === "denied"
                        ? "محظورة"
                        : notificationStatus === "unsupported"
                        ? "غير مدعومة"
                        : "غير مفعّلة"}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-500 leading-relaxed">
                    تظهر إشعارات النظام عند انتهاء الجلسات حتى لو كان التطبيق في الخلفية
                  </p>
                  {notificationStatus === "default" && (
                    <button
                      onClick={onRequestNotification}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-ink-800 hover:bg-ink-700 text-white text-xs font-bold transition"
                    >
                      تفعيل الإشعارات
                    </button>
                  )}
                </div>
              </Section>

              {/* Auto */}
              <Section icon={<Zap className="w-4 h-4" />} title="السلوك التلقائي">
                <Toggle
                  label="بدء الجلسة التالية تلقائياً"
                  description="ينتقل تلقائياً بين العمل والاستراحة دون توقف"
                  value={settings.autoStartNext}
                  onChange={(v) => onChange({ ...settings, autoStartNext: v })}
                />
              </Section>

              {/* Defaults */}
              <Section icon={<Music className="w-4 h-4" />} title="الإعدادات الافتراضية للمهام الجديدة">
                <NumberSetting
                  label="مدة جلسة العمل"
                  value={settings.defaultPomodoroMinutes}
                  onChange={(v) => onChange({ ...settings, defaultPomodoroMinutes: v })}
                  min={5}
                  max={90}
                  step={5}
                  suffix="دقيقة"
                />
                <NumberSetting
                  label="الاستراحة القصيرة"
                  value={settings.defaultBreakMinutes}
                  onChange={(v) => onChange({ ...settings, defaultBreakMinutes: v })}
                  min={1}
                  max={30}
                  suffix="دقيقة"
                />
                <NumberSetting
                  label="الاستراحة الطويلة"
                  value={settings.defaultLongBreakMinutes}
                  onChange={(v) => onChange({ ...settings, defaultLongBreakMinutes: v })}
                  min={5}
                  max={60}
                  step={5}
                  suffix="دقيقة"
                />
                <NumberSetting
                  label="استراحة طويلة كل"
                  value={settings.defaultLongBreakAfter}
                  onChange={(v) => onChange({ ...settings, defaultLongBreakAfter: v })}
                  min={2}
                  max={8}
                  suffix="جلسات"
                />
              </Section>

              {/* Category Colors */}
              <Section icon={<Palette className="w-4 h-4" />} title="ألوان الفئات">
                <div className="space-y-3">
                  {CATEGORY_LIST.map((cat) => {
                    const currentColor = settings.categoryColors?.[cat.id] ?? cat.color;
                    return (
                      <div key={cat.id} className="flex items-center justify-between bg-ink-50/60 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: currentColor }} />
                          <span className="text-sm font-bold text-ink-800">{cat.label}</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[10px] text-ink-400 tabular">{currentColor.toUpperCase()}</span>
                          <div
                            className="w-8 h-8 rounded-lg border-2 border-ink-100 overflow-hidden relative cursor-pointer hover:border-ink-300 transition"
                            style={{ background: currentColor }}
                          >
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(e) =>
                                onChange({
                                  ...settings,
                                  categoryColors: {
                                    ...settings.categoryColors,
                                    [cat.id]: e.target.value,
                                  },
                                })
                              }
                              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            />
                          </div>
                        </label>
                      </div>
                    );
                  })}
                  <button
                    onClick={() =>
                      onChange({
                        ...settings,
                        categoryColors: { study: "#7B6BB8", work: "#378ADD", leisure: "#1D9E75" },
                      })
                    }
                    className="w-full text-xs text-ink-400 hover:text-ink-700 py-1 transition"
                  >
                    إعادة تعيين الألوان الافتراضية
                  </button>
                </div>
              </Section>

              {/* ===== Data Section ===== */}
              <Section icon={<Archive className="w-4 h-4" />} title="البيانات والنسخ الاحتياطي">
                <div className="space-y-3">

                  {/* Archive info */}
                  <div className="bg-ink-50/60 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-ink-700">الأرشيف التلقائي</p>
                      <p className="text-[10px] text-ink-500 mt-0.5">كل شهرين تُؤرشف البيانات الأقدم من شهرين</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-ink-800 tabular">{totalArchived}</p>
                      <p className="text-[9px] text-ink-400">مؤرشف</p>
                    </div>
                  </div>

                  {settings.lastArchiveCheck && (
                    <p className="text-[10px] text-ink-400 text-center">
                      آخر أرشفة: {new Date(settings.lastArchiveCheck).toLocaleDateString("ar-IQ")}
                    </p>
                  )}

                  {/* Export */}
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ink-800 hover:bg-ink-700 text-white font-bold text-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير كل البيانات</span>
                    <span className="text-ink-400 text-xs mr-auto font-normal">JSON</span>
                  </button>

                  {/* Import */}
                  <button
                    onClick={() => { setImportStatus("idle"); fileInputRef.current?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-ink-300 hover:border-ink-500 hover:bg-ink-50 text-ink-700 font-bold text-sm transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>استيراد من ملف</span>
                    <span className="text-ink-400 text-xs mr-auto font-normal">JSON</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />

                  {/* Import status */}
                  {importStatus !== "idle" && (
                    <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2 ${importStatus === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${importStatus === "success" ? "text-green-500" : "text-red-500"}`} />
                      <span className={`text-xs font-medium ${importStatus === "success" ? "text-green-700" : "text-red-700"}`}>{importMsg}</span>
                    </div>
                  )}

                </div>
              </Section>

              <p className="text-[11px] text-ink-400 text-center pt-4 border-t border-ink-100">
                البيانات محفوظة محلياً في متصفحك
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-ink-700">
        {icon}
        <h3 className="text-xs font-black tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-ink-50 transition text-right"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-ink-800">{label}</div>
        {description && <div className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <div
        className="relative w-11 h-6 rounded-full flex-shrink-0 transition"
        style={{ background: value ? "#1A1814" : "#D8D3C2" }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
          animate={{ right: value ? "2px" : "22px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}

function NumberSetting({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix: string;
}) {
  return (
    <div className="bg-ink-50/60 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-ink-700">{label}</span>
        <span className="text-sm font-black tabular text-ink-800">
          {value} <span className="text-[10px] text-ink-400 font-bold">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-full"
      />
    </div>
  );
}
