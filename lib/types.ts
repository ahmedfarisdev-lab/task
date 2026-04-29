export type Category = "study" | "work";

export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  bg: string;
  ring: string;
  text: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (24h) - وقت البداية
  endTime?: string;   // HH:mm (24h) - وقت النهاية (محسوب تلقائيًا)
  color?: string;     // لون مخصص (اختياري) يُلغي لون الفئة
  pomodoroMinutes: number; // مدة جلسة العمل
  breakMinutes: number; // مدة الاستراحة القصيرة
  longBreakMinutes: number; // مدة الاستراحة الطويلة
  longBreakAfter: number; // كل كم جلسة استراحة طويلة
  pomodorosPlanned: number; // عدد الجلسات المخطط لها
  pomodorosCompleted: number;
  done: boolean;
  createdAt: number;
}

/** حدث تقويم (اجتماع، محاضرة، تذكير...) - بدون pomodoro */
export interface CalendarEvent {
  id: string;
  type: "event"; // للتمييز عن Task
  title: string;
  notes?: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm - مطلوب دائمًا
  endTime: string;     // HH:mm - مطلوب دائمًا
  color: string;       // HEX - المستخدم يختار
  createdAt: number;
}

export interface PomodoroState {
  taskId: string | null;
  phase: "idle" | "work" | "break" | "longBreak";
  remainingMs: number;
  isRunning: boolean;
  startedAt: number | null;
  cycleCount: number;
  soundEnabled: boolean;
  autoStartNext: boolean;
}

export type View = "calendar" | "today" | "stats";
