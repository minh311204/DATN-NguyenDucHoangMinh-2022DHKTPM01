'use client';

import { CheckCircle2, ChevronRight, FileText, Flag, Wallet } from 'lucide-react';

const STEPS = [
  { label: 'NHẬP THÔNG TIN', Icon: FileText },
  { label: 'THANH TOÁN', Icon: Wallet },
  { label: 'HOÀN TẤT', Icon: Flag },
] as const;

export type BookingFlowStepperProps =
  | { variant: 'booking'; activeStep: 1 | 2 }
  | { variant: 'complete' };

function stepUi(
  stepIndex: 1 | 2 | 3,
  props: BookingFlowStepperProps,
): 'pending' | 'active' | 'done' {
  if (props.variant === 'complete') return 'done';
  if (props.activeStep === 1)
    return stepIndex === 1 ? 'active' : 'pending';
  if (stepIndex === 1) return 'done';
  if (stepIndex === 2) return 'active';
  return 'pending';
}

/**
 * Tiến trình đặt tour — bước 1–2 trên `/book`, hoặc cả 3 bước xanh sau thanh toán xong.
 */
export function BookingFlowStepper(props: BookingFlowStepperProps) {
  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-4"
      aria-label="Tiến trình đặt tour"
    >
      {STEPS.map(({ label, Icon }, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const ui = stepUi(idx, props);
        const isLast = idx === 3;

        const circleClasses =
          ui === 'active'
            ? 'border-[#0b5ea8] bg-[#0b5ea8] text-white shadow-md shadow-sky-100'
            : ui === 'done'
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-stone-300 bg-white text-stone-400';

        const labelClasses =
          ui === 'active'
            ? 'text-[#0b5ea8]'
            : ui === 'done'
              ? 'text-emerald-600'
              : 'text-stone-400';

        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex max-w-[7rem] flex-col items-center sm:max-w-none">
              <div
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors sm:h-14 sm:w-14',
                  circleClasses,
                ].join(' ')}
              >
                {ui === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                ) : (
                  <Icon
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={[
                  'mt-1.5 max-w-[7rem] text-center text-[10px] font-semibold uppercase leading-tight sm:max-w-none sm:text-xs',
                  labelClasses,
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {!isLast ? (
              <ChevronRight
                className="h-4 w-4 shrink-0 self-center text-stone-300 sm:h-5 sm:w-5"
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
