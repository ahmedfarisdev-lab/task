"use client";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// تشغيل نغمة بجرس لطيف عند انتهاء جلسة العمل
export function playEndChime() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 880, time: 0, duration: 0.3 },
    { freq: 1108.73, time: 0.18, duration: 0.3 },
    { freq: 1318.51, time: 0.36, duration: 0.6 },
  ];

  notes.forEach((n) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.time);
    g.gain.exponentialRampToValueAtTime(0.25, now + n.time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration);
    o.start(now + n.time);
    o.stop(now + n.time + n.duration);
  });
}

// نغمة بداية الجلسة (نغمة واحدة قصيرة وخفيفة)
export function playStartChime() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.value = 660;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  o.start(now);
  o.stop(now + 0.4);
}

// نغمة بداية الاستراحة
export function playBreakChime() {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0 },
    { freq: 659.25, time: 0.15 },
  ];

  notes.forEach((n) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.time);
    g.gain.exponentialRampToValueAtTime(0.2, now + n.time + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.time + 0.5);
    o.start(now + n.time);
    o.stop(now + n.time + 0.5);
  });
}

// طلب إذن الإشعارات
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// إرسال إشعار النظام
export function sendNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "pomodoro",
    });
  } catch {}
}
