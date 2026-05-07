"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";

type Props = {
  id?: string;
  value: string;
  onChange: (val: string) => void;
};

type Step = "year" | "month" | "day";

const CURRENT_YEAR = new Date().getFullYear();

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DobPickerPro({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("year");

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);

  const years = useMemo(() => {
    return Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => CURRENT_YEAR - i);
  }, []);

  const months = [
    "Th1","Th2","Th3","Th4","Th5","Th6",
    "Th7","Th8","Th9","Th10","Th11","Th12"
  ];

  const days = useMemo(() => {
    if (!year || month === null) return [];
    return Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, i) => i + 1
    );
  }, [year, month]);

  const display = value
    ? format(new Date(value), "dd/MM/yyyy")
    : "dd/mm/yyyy";

  return (
    <div className="relative w-full">
      {/* INPUT */}
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setStep("year");
        }}
        className="w-full rounded-xl border px-3 py-2 text-left shadow-sm hover:border-teal-400"
      >
        {display}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-2xl border bg-white p-4 shadow-xl">

          {/* HEADER */}
          <div className="mb-3 text-sm font-semibold text-center">
            {step === "year" && "Chọn năm"}
            {step === "month" && "Chọn tháng"}
            {step === "day" && "Chọn ngày"}
          </div>

          {/* YEAR STEP */}
          {step === "year" && (
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    setYear(y);
                    setStep("month");
                  }}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-teal-100"
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* MONTH STEP */}
          {step === "month" && (
            <div className="grid grid-cols-3 gap-2">
              {months.map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    setMonth(i);
                    setStep("day");
                  }}
                  className="rounded-lg px-2 py-3 text-sm hover:bg-teal-100"
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* DAY STEP */}
          {step === "day" && (
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    if (year !== null && month !== null) {
                      const date = new Date(year, month, d);
                      onChange(toYmd(date));
                      setOpen(false);
                    }
                  }}
                  className="rounded-lg px-2 py-2 text-sm hover:bg-teal-100"
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* BACK BUTTON */}
          {step !== "year" && (
            <button
              onClick={() =>
                setStep(step === "day" ? "month" : "year")
              }
              className="mt-3 text-xs text-teal-600 hover:underline"
            >
              ← Quay lại
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Tên dùng trong form đặt tour */
export { DobPickerPro as PassengerDobPicker };