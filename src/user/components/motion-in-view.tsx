"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type MotionInViewAxis = "up" | "left" | "right";

type Props = {
  children: ReactNode;
  className?: string;
  /**
   * Hướng trượt lúc mới lộ (giống data-aos fade-left / fade-right / fade-up bên template Travela).
   */
  axis?: MotionInViewAxis;
  /**
   * Kích sớm hơn khi sắp vào viewport (vd. "0px 0px -6% 0px" mặc định: lộ khi còn cách dưới 6% viewport)
   */
  rootMargin?: string;
  /**
   * `true`: chỉ animate một lần lần đầu vào màn hình (kiểu AOS mặc định).
   * `false`: mỗi lần vào viewport thì lộ, ra khỏi viewport thì ẩn lại — cuộn lên/xuống đều có transition.
   */
  once?: boolean;
  /** Trễ bắt đầu transition khi lộ (stagger cấp bố) */
  delayMs?: number;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">;

/**
 * Lộ dần khi cuộn tới (IntersectionObserver), kiểu site du lịch: fade + translateY nhẹ.
 * Mặc định lặp lại khi cuộn ra/vào; truyền `once` để chỉ chạy một lần.
 * prefers-reduced-motion: bỏ qua, hiển thị ổn định.
 */
const AXIS_CLASS: Record<MotionInViewAxis, string> = {
  up: "motion-in-view--from-up",
  left: "motion-in-view--from-left",
  right: "motion-in-view--from-right",
};

export function MotionInView({
  children,
  className,
  axis = "up",
  rootMargin = "0px 0px -6% 0px",
  once = false,
  delayMs = 0,
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fromClass = AXIS_CLASS[axis];

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (once) {
            if (e.isIntersecting) {
              setVisible(true);
              ob.disconnect();
            }
          } else {
            setVisible(e.isIntersecting);
          }
        }
      },
      { root: null, rootMargin, threshold: 0.06 },
    );

    ob.observe(el);
    return () => ob.disconnect();
  }, [once, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-in-view",
        fromClass,
        visible && "motion-in-view--visible",
        className,
      )}
      style={
        visible && delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined
      }
      {...rest}
    >
      {children}
    </div>
  );
}
