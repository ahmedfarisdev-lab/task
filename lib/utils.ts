export function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function formatTime12(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function arabicDayName(d: Date): string {
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[d.getDay()];
}

export function arabicMonthName(d: Date): string {
  const months = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
  ];
  return months[d.getMonth()];
}

export function getCurrentTimeHHmm(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/** تحويل HH:mm إلى دقائق من منتصف الليل */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** تحويل دقائق إلى HH:mm */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * احسب وقت النهاية بناءً على:
 * pomodorosPlanned × pomodoroMinutes + (pomodorosPlanned - 1) × breakMinutes
 */
export function computeEndTime(
  startTime: string,
  pomodorosPlanned: number,
  pomodoroMinutes: number,
  breakMinutes: number
): string {
  const start = timeToMinutes(startTime);
  const workDuration = pomodorosPlanned * pomodoroMinutes;
  const breakDuration = Math.max(0, pomodorosPlanned - 1) * breakMinutes;
  return minutesToTime(start + workDuration + breakDuration);
}

/**
 * هل تتداخل فترتا [s1,e1) و [s2,e2)؟
 * الأوقات بصيغة HH:mm
 */
export function timesOverlap(
  s1: string, e1: string,
  s2: string, e2: string
): boolean {
  const a = timeToMinutes(s1);
  const b = timeToMinutes(e1);
  const c = timeToMinutes(s2);
  const d = timeToMinutes(e2);
  return a < d && c < b;
}
