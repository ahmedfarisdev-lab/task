"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, Sparkles, ListTodo, CalendarPlus } from "lucide-react";
import type { Task, CalendarEvent } from "@/lib/types";
import { CATEGORY_LIST } from "@/lib/categories";
import {
  loadTasks, saveTasks,
  loadEvents, saveEvents,
  loadSettings, saveSettings,
  checkAndAutoArchive,
  type AppSettings, DEFAULT_SETTINGS
} from "@/lib/storage";
import { todayISO, dateToISO, arabicDayName, computeEndTime, timeToMinutes, minutesToTime } from "@/lib/utils";
import { usePomodoro } from "@/lib/usePomodoro";
import { requestNotificationPermission } from "@/lib/sound";
import { CalendarView } from "@/components/CalendarView";
import { TaskItem } from "@/components/TaskItem";
import { TaskForm } from "@/components/TaskForm";
import { EventForm } from "@/components/EventForm";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { StatsBar } from "@/components/StatsBar";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function Home() {
  const [mounted, setMounted]         = useState(false);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [settings, setSettings]       = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // Task form
  const [taskFormOpen, setTaskFormOpen]   = useState(false);
  const [editingTask, setEditingTask]     = useState<Task | null>(null);
  const [defaultTime, setDefaultTime]     = useState<string | undefined>(undefined);

  // Event form
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent]   = useState<CalendarEvent | null>(null);
  const [eventDefaultTime, setEventDefaultTime] = useState<string | undefined>(undefined);

  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [notifStatus, setNotifStatus]     = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [archiveBanner, setArchiveBanner] = useState<string | null>(null);

  // Load on mount + auto-archive check
  useEffect(() => {
    setMounted(true);
    const loadedTasks    = loadTasks();
    const loadedEvents   = loadEvents();
    const loadedSettings = loadSettings();

    // تحقق من الأرشفة التلقائية كل 60 يوم
    const archiveResult = checkAndAutoArchive(loadedTasks, loadedEvents, loadedSettings);
    if (archiveResult) {
      setTasks(archiveResult.newTasks);
      setEvents(archiveResult.newEvents);
      setSettings(archiveResult.newSettings);
      if (archiveResult.didArchive) {
        setArchiveBanner(`تم أرشفة ${archiveResult.archivedCount} عنصر قديم تلقائيًا ✅`);
        setTimeout(() => setArchiveBanner(null), 6000);
      }
    } else {
      setTasks(loadedTasks);
      setEvents(loadedEvents);
      setSettings(loadedSettings);
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifStatus(Notification.permission as any);
    } else {
      setNotifStatus("unsupported");
    }
  }, []);

  useEffect(() => { if (mounted) saveTasks(tasks); }, [tasks, mounted]);
  useEffect(() => { if (mounted) saveEvents(events); }, [events, mounted]);
  useEffect(() => { if (mounted) saveSettings(settings); }, [settings, mounted]);

  const updateTask = useCallback((id: string, updater: (t: Task) => Task) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? updater(t) : t)));
  }, []);

  const pomodoro = usePomodoro(tasks, updateTask, {
    soundEnabled: settings.soundEnabled,
    autoStartNext: settings.autoStartNext,
    startSoundEnabled: settings.startSoundEnabled,
  });

  // الفئات مع الألوان المخصصة
  const activeCategoryList = useMemo(() => {
    return CATEGORY_LIST.map((c) => {
      const color = settings.categoryColors?.[c.id] ?? c.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return {
        ...c,
        color,
        bg:   `rgb(${Math.round(r+(255-r)*0.85)},${Math.round(g+(255-g)*0.85)},${Math.round(b+(255-b)*0.85)})`,
        text: `rgb(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)})`,
      };
    });
  }, [settings.categoryColors]);

  const dayTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.date === selectedDate);
    if (filterCategory) filtered = filtered.filter((t) => t.category === filterCategory);
    return filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [tasks, selectedDate, filterCategory]);

  const isSelectedToday = selectedDate === todayISO();

  // ===== Handlers: Tasks =====
  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      if (exists) return prev.map((t) => (t.id === task.id ? task : t));
      return [...prev, task];
    });
  };

  const handleDeleteTask = (id: string) => {
    if (pomodoro.taskId === id) pomodoro.stop();
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, pomodorosCompleted: !t.done && t.pomodorosCompleted < t.pomodorosPlanned ? t.pomodorosPlanned : t.pomodorosCompleted }
          : t
      )
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultTime(undefined);
    setTaskFormOpen(true);
  };

  const handleAddNewTask = () => {
    setEditingTask(null);
    setDefaultTime(undefined);
    setTaskFormOpen(true);
  };

  // ===== Handlers: Drag move =====
  const handleMoveTask = (id: string, newStartTime: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newEnd = computeEndTime(newStartTime, t.pomodorosPlanned, t.pomodoroMinutes, t.breakMinutes);
      return { ...t, startTime: newStartTime, endTime: newEnd };
    }));
  };

  const handleMoveEvent = (id: string, newStartTime: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== id) return e;
      const dur = timeToMinutes(e.endTime) - timeToMinutes(e.startTime);
      return { ...e, startTime: newStartTime, endTime: minutesToTime(timeToMinutes(newStartTime) + dur) };
    }));
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    setEvents((prev) => {
      const exists = prev.find((e) => e.id === event.id);
      if (exists) return prev.map((e) => (e.id === event.id ? event : e));
      return [...prev, event];
    });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventDefaultTime(undefined);
    setEventFormOpen(true);
  };

  const handleAddNewEvent = () => {
    setEditingEvent(null);
    setEventDefaultTime(undefined);
    setEventFormOpen(true);
  };

  // النقر على خانة وقت في التقويم
  const handleTimeSlotClick = (time: string) => {
    // افتح قائمة الاختيار: مهمة أم حدث؟
    // للبساطة: نفتح نموذج الحدث (الأكثر ملاءمة للنقر المباشر)
    setEditingEvent(null);
    setEventDefaultTime(time);
    setEventFormOpen(true);
  };

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? "granted" : "denied");
  };

  const handleImport = (importedTasks: Task[], importedEvents: CalendarEvent[], importedSettings: AppSettings) => {
    setTasks(importedTasks);
    setEvents(importedEvents);
    setSettings(importedSettings);
  };

  const navigateWeek = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset * 7);
    setSelectedDate(dateToISO(d));
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-400 text-sm">جارٍ التحميل...</div>
      </div>
    );
  }

  const selectedDateObj = new Date(selectedDate);

  return (
    <div className="min-h-screen pb-36">
      {/* Archive banner */}
      <AnimatePresence>
        {archiveBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3 pointer-events-none"
          >
            <div className="bg-green-700 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
              <span>📦</span>
              <span>{archiveBanner}</span>
              <button onClick={() => setArchiveBanner(null)} className="mr-2 opacity-70 hover:opacity-100 pointer-events-auto">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-ink-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-black text-ink-800 leading-tight">نظام الإنتاجية</h1>
              <p className="text-[10px] text-ink-400 leading-tight">مركّز · منظّم · منتج</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-xl hover:bg-ink-50 flex items-center justify-center transition border border-ink-100"
            aria-label="الإعدادات"
          >
            <Settings className="w-4 h-4 text-ink-700" />
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Stats */}
        <StatsBar tasks={dayTasks} />

        {/* Pomodoro Timer */}
        <PomodoroTimer
          pomodoro={pomodoro}
          soundEnabled={settings.soundEnabled}
          onToggleSound={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
        />

        {/* Calendar — Google Calendar Style */}
        <CalendarView
          tasks={tasks}
          events={events}
          selectedDate={selectedDate}
          categoryColors={settings.categoryColors}
          onSelectDate={setSelectedDate}
          onPrevWeek={() => navigateWeek(-1)}
          onNextWeek={() => navigateWeek(1)}
          onToday={() => setSelectedDate(todayISO())}
          onTimeSlotClick={handleTimeSlotClick}
          onTaskClick={handleEditTask}
          onEventClick={handleEditEvent}
          onMoveTask={handleMoveTask}
          onMoveEvent={handleMoveEvent}
        />

        {/* Tasks Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-ink-700" />
              <h2 className="text-sm font-black text-ink-800">
                مهام {isSelectedToday ? "اليوم" : `${arabicDayName(selectedDateObj)} ${selectedDateObj.getDate()}`}
              </h2>
              <span className="text-xs text-ink-400 tabular">({dayTasks.length})</span>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFilterCategory(null)}
              className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border"
              style={{
                background: filterCategory === null ? "#1A1814" : "transparent",
                color: filterCategory === null ? "#FFF" : "#5C5444",
                borderColor: filterCategory === null ? "#1A1814" : "rgba(26,24,20,0.1)",
              }}
            >
              الكل
            </button>
            {activeCategoryList.map((c) => {
              const isActive  = filterCategory === c.id;
              const allCount  = tasks.filter((t) => t.date === selectedDate && t.category === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCategory(isActive ? null : c.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border flex items-center gap-1.5"
                  style={{
                    background:  isActive ? c.color : c.bg,
                    color:       isActive ? "#FFF" : c.text,
                    borderColor: isActive ? c.color : "transparent",
                  }}
                >
                  <span>{c.label}</span>
                  {allCount > 0 && (
                    <span className="text-[10px] tabular px-1.5 rounded-full"
                      style={{ background: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)" }}>
                      {allCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Task list */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {dayTasks.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center py-12 rounded-3xl bg-white/40 border border-dashed border-ink-200">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-ink-50 flex items-center justify-center">
                    <ListTodo className="w-6 h-6 text-ink-300" />
                  </div>
                  <p className="text-sm font-bold text-ink-600 mb-1">لا توجد مهام بعد</p>
                  <p className="text-xs text-ink-400 mb-4">انقر على وقت في التقويم لإضافة حدث، أو أضف مهمة جديدة</p>
                  <button onClick={handleAddNewTask}
                    className="px-4 py-2 rounded-xl bg-ink-800 hover:bg-ink-700 text-white text-xs font-bold transition inline-flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    أضف مهمة
                  </button>
                </motion.div>
              ) : (
                dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isActive={pomodoro.taskId === task.id}
                    isRunning={pomodoro.isRunning && pomodoro.taskId === task.id}
                    onStart={() => pomodoro.start(task)}
                    onPause={pomodoro.pause}
                    onToggleDone={() => handleToggleDone(task.id)}
                    onEdit={() => handleEditTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* FABs */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {/* زر إضافة حدث */}
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.92 }}
          onClick={handleAddNewEvent}
          className="px-4 py-3 rounded-2xl border-2 border-ink-800 bg-white hover:bg-ink-50 text-ink-800 font-bold text-sm shadow-lg flex items-center gap-2 transition"
        >
          <CalendarPlus className="w-4 h-4" />
          حدث
        </motion.button>

        {/* زر إضافة مهمة */}
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.92 }}
          onClick={handleAddNewTask}
          className="px-5 py-3.5 rounded-2xl bg-ink-800 hover:bg-ink-700 text-white font-bold text-sm shadow-xl shadow-ink-900/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          مهمة جديدة
        </motion.button>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        open={taskFormOpen}
        task={editingTask}
        defaultDate={selectedDate}
        defaultTime={defaultTime}
        defaultSettings={{
          pomodoroMinutes:  settings.defaultPomodoroMinutes,
          breakMinutes:     settings.defaultBreakMinutes,
          longBreakMinutes: settings.defaultLongBreakMinutes,
          longBreakAfter:   settings.defaultLongBreakAfter,
        }}
        existingTasks={tasks}
        categoryColors={settings.categoryColors}
        onClose={() => { setTaskFormOpen(false); setEditingTask(null); setDefaultTime(undefined); }}
        onSave={handleSaveTask}
        onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
      />

      {/* Event Form Modal */}
      <EventForm
        open={eventFormOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        defaultTime={eventDefaultTime}
        existingEvents={events}
        onClose={() => { setEventFormOpen(false); setEditingEvent(null); setEventDefaultTime(undefined); }}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? () => handleDeleteEvent(editingEvent.id) : undefined}
      />

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        tasks={tasks}
        events={events}
        onClose={() => setSettingsOpen(false)}
        onChange={setSettings}
        onRequestNotification={handleRequestNotif}
        onImport={handleImport}
        notificationStatus={notifStatus}
      />
      {/* About Footer */}
      <div className="mt-16 mb-4 max-w-3xl mx-auto px-4">
        <div className="rounded-2xl border border-ink-100 px-5 py-4 text-center" style={{ background: "rgba(255,255,255,0.6)" }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-ink-800 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-accent" />
            </div>
            <span className="text-xs font-black text-ink-800">نظام الإنتاجية</span>
          </div>
          <p className="text-[11px] text-ink-500 leading-relaxed">
            تم تطوير هذا التطبيق بواسطة{" "}
            <span className="font-bold text-ink-700">Ahmed Faris</span>
          </p>
          <p className="text-[10px] text-ink-400 mt-0.5">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
