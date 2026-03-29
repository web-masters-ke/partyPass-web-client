"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export default function DateTimePicker({ value, onChange, disabled, placeholder = "Select date & time" }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"date" | "time">("date");
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.slice(0, 4)) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5, 7)) - 1 : new Date().getMonth());
  const [selDate, setSelDate] = useState(() => value?.slice(0, 10) ?? "");
  const [selHour, setSelHour] = useState(() => value ? parseInt(value.slice(11, 13)) : 20);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setStep("date");
      }
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    if (value) {
      setSelDate(value.slice(0, 10));
      setSelHour(parseInt(value.slice(11, 13)) || 20);
      setViewYear(parseInt(value.slice(0, 4)));
      setViewMonth(parseInt(value.slice(5, 7)) - 1);
    }
  }, [value]);

  function toggleOpen() {
    if (disabled || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dropW = 288;
    const left = rect.left + dropW > window.innerWidth - 8 ? rect.right - dropW : rect.left;
    setPos({ top: rect.bottom + window.scrollY + 6, left: left + window.scrollX });
    setOpen(o => !o);
    setStep("date");
  }

  function display() {
    if (!value) return null;
    const [datePart, timePart] = value.split("T");
    const [y, m, d] = datePart.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
    const monthName = MONTHS[parseInt(m) - 1].slice(0, 3);
    return `${dayName}, ${parseInt(d)} ${monthName} ${y}  ·  ${timePart}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelDate(d);
    setStep("time");
  }

  function selectMinute(min: number) {
    onChange(`${selDate}T${String(selHour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    setOpen(false);
    setStep("date");
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const today = new Date().toISOString().slice(0, 10);

  const dropdown = (
    <div
      ref={dropRef}
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999, width: 288 }}
      className="bg-white border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
    >
      {step === "date" ? (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface)] text-[var(--muted)] text-lg">‹</button>
            <p className="text-sm font-black">{MONTHS[viewMonth]} {viewYear}</p>
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface)] text-[var(--muted)] text-lg">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(d => (
              <p key={d} className="text-center text-[10px] font-black text-[var(--muted)] py-1">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSel = iso === selDate;
              const isToday = iso === today;
              return (
                <button key={i} type="button" onClick={() => selectDay(day)}
                  className={`w-full aspect-square rounded-full text-xs font-semibold transition-colors flex items-center justify-center
                    ${isSel ? "bg-[var(--primary)] text-white"
                      : isToday ? "border border-[var(--primary)] text-[var(--primary)]"
                      : "hover:bg-[var(--surface)] text-[var(--text)]"}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <button type="button" onClick={() => setStep("date")}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] mb-4 transition-colors">
            <span className="text-base leading-none">‹</span>
            {selDate && new Date(selDate + "T12:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
          </button>

          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Hour</p>
          <div className="grid grid-cols-6 gap-1 mb-4">
            {HOURS.map(h => (
              <button key={h} type="button" onClick={() => setSelHour(h)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors
                  ${selHour === h ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)]"}`}>
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">
            Minute <span className="normal-case font-medium opacity-60">— tap to confirm</span>
          </p>
          <div className="grid grid-cols-6 gap-1">
            {MINUTES.map(m => (
              <button key={m} type="button" onClick={() => selectMinute(m)}
                className="py-1.5 rounded-lg text-xs font-bold bg-[var(--surface)] hover:bg-[var(--primary)] hover:text-white text-[var(--text)] transition-colors">
                :{String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`input-base w-full text-left flex items-center justify-between gap-3 ${!value ? "text-[var(--muted)]" : ""}`}
      >
        <span className="flex-1 truncate">{display() ?? placeholder}</span>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="shrink-0 opacity-40">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {mounted && open && createPortal(dropdown, document.body)}
    </div>
  );
}
