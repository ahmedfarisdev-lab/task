"use client";

import type { Task, CalendarEvent } from "./types";
import { DEFAULT_CATEGORY_COLORS } from "./categories";

const TASKS_KEY    = "ahmed-productivity-tasks-v2";
const EVENTS_KEY   = "ahmed-productivity-events-v1";
const SETTINGS_KEY = "ahmed-productivity-settings-v2";
const ARCHIVE_KEY  = "ahmed-productivity-archive-v1";

// ===== Types =====

export interface AppSettings {
  soundEnabled: boolean;
  autoStartNext: boolean;
  defaultPomodoroMinutes: number;
  defaultBreakMinutes: number;
  defaultLongBreakMinutes: number;
  defaultLongBreakAfter: number;
  startSoundEnabled: boolean;
  categoryColors: Record<string, string>;
  lastArchiveCheck: string | null; // ISO date of last archive operation
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  autoStartNext: true,
  defaultPomodoroMinutes: 25,
  defaultBreakMinutes: 5,
  defaultLongBreakMinutes: 20,
  defaultLongBreakAfter: 4,
  startSoundEnabled: true,
  categoryColors: { ...DEFAULT_CATEGORY_COLORS },
  lastArchiveCheck: null,
};

export interface ArchiveEntry {
  archivedAt: string;    // ISO date
  cutoffDate: string;    // Items older than this were archived
  tasks: Task[];
  events: CalendarEvent[];
}

export interface ExportData {
  version: 2;
  exportedAt: string;
  tasks: Task[];
  events: CalendarEvent[];
  settings: AppSettings;
  archives: ArchiveEntry[];
}

// ===== Tasks =====
export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(TASKS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {}
}

// ===== Events =====
export function loadEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(EVENTS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveEvents(events: CalendarEvent[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); } catch {}
}

// ===== Settings =====
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const r = localStorage.getItem(SETTINGS_KEY);
    if (!r) return DEFAULT_SETTINGS;
    const p = JSON.parse(r);
    return { ...DEFAULT_SETTINGS, ...p, categoryColors: { ...DEFAULT_SETTINGS.categoryColors, ...(p.categoryColors || {}) } };
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ===== Archive =====
export function loadArchives(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(ARCHIVE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
export function saveArchives(archives: ArchiveEntry[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives)); } catch {}
}

/**
 * تحقق إذا كان يجب أرشفة البيانات القديمة (كل 60 يوم).
 * يُرجع البيانات الجديدة (بعد إزالة القديمة) أو null إذا لم تكن هناك حاجة.
 */
export function checkAndAutoArchive(
  tasks: Task[],
  events: CalendarEvent[],
  settings: AppSettings
): {
  newTasks: Task[];
  newEvents: CalendarEvent[];
  newSettings: AppSettings;
  didArchive: boolean;
  archivedCount: number;
} | null {
  const today = new Date();
  const lastCheck = settings.lastArchiveCheck ? new Date(settings.lastArchiveCheck) : null;

  // تحقق إذا مر 60 يوم على آخر أرشفة
  const daysSinceLastCheck = lastCheck
    ? Math.floor((today.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (daysSinceLastCheck < 60) return null;

  // حدد تاريخ القطع: شهرين للوراء
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  const cutoffISO = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  const archivedTasks  = tasks.filter(t => t.date < cutoffISO);
  const archivedEvents = events.filter(e => e.date < cutoffISO);
  const archivedCount  = archivedTasks.length + archivedEvents.length;

  if (archivedCount === 0) {
    // حدّث تاريخ الفحص فقط
    const newSettings = { ...settings, lastArchiveCheck: today.toISOString().slice(0, 10) };
    return { newTasks: tasks, newEvents: events, newSettings, didArchive: false, archivedCount: 0 };
  }

  // احفظ في الأرشيف
  const existing = loadArchives();
  const entry: ArchiveEntry = {
    archivedAt: today.toISOString(),
    cutoffDate: cutoffISO,
    tasks: archivedTasks,
    events: archivedEvents,
  };
  saveArchives([...existing, entry]);

  const newSettings = { ...settings, lastArchiveCheck: today.toISOString().slice(0, 10) };

  return {
    newTasks:     tasks.filter(t => t.date >= cutoffISO),
    newEvents:    events.filter(e => e.date >= cutoffISO),
    newSettings,
    didArchive:   true,
    archivedCount,
  };
}

// ===== Export / Import =====

/** تصدير كل البيانات كملف JSON */
export function exportAllData(tasks: Task[], events: CalendarEvent[], settings: AppSettings): void {
  if (typeof window === "undefined") return;
  const data: ExportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks,
    events,
    settings,
    archives: loadArchives(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `productivity-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** استيراد البيانات من ملف JSON — يُرجع البيانات أو null في حالة الخطأ */
export function parseImportData(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !Array.isArray(data.tasks) || !Array.isArray(data.events)) return null;
    return data as ExportData;
  } catch {
    return null;
  }
}

/** تطبيق بيانات الاستيراد على localStorage */
export function applyImportData(data: ExportData): void {
  saveTasks(data.tasks || []);
  saveEvents(data.events || []);
  if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  if (data.archives) saveArchives(data.archives);
}
