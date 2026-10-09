import type { Transition } from "framer-motion";

export type MotionRole =
  | "eyebrow"
  | "heading"
  | "copy"
  | "content"
  | "item"
  | "visual"
  | "cta";

export type ScrollDirection = "down" | "up";

export type MotionState = {
  opacity: number;
  x: number;
  y: number;
  scale: number;
};

export const SECTION_ENTRY_VIEWPORT = 0.5;
export const SECTION_EXIT_PROGRESS = 0.9;
export const SECTION_REVERSE_EXIT_PROGRESS = 1 - SECTION_EXIT_PROGRESS;
export const SECTION_MOTION_DURATION = 0.8;

export const MOTION_ROLE_ORDER: MotionRole[] = [
  "eyebrow",
  "heading",
  "copy",
  "content",
  "item",
  "visual",
  "cta",
];

export const sectionEase = [0.16, 1, 0.3, 1] as const;

const entranceY: Record<MotionRole, number> = {
  eyebrow: 14,
  heading: 28,
  copy: 20,
  content: 26,
  item: 26,
  visual: 30,
  cta: 14,
};

const entranceX: Record<MotionRole, number> = {
  eyebrow: -24,
  heading: -48,
  copy: -36,
  content: -30,
  item: -26,
  visual: 44,
  cta: -22,
};

const release: Record<MotionRole, MotionState> = {
  eyebrow: { opacity: 0.15, x: 0, y: -10, scale: 1 },
  heading: { opacity: 0.15, x: 0, y: -22, scale: 1 },
  copy: { opacity: 0, x: 0, y: -16, scale: 1 },
  content: { opacity: 0.08, x: 0, y: -22, scale: 0.99 },
  item: { opacity: 0.08, x: 0, y: -22, scale: 0.99 },
  visual: { opacity: 0.12, x: 0, y: -20, scale: 0.99 },
  cta: { opacity: 0, x: 0, y: -12, scale: 1 },
};

const delay: Record<MotionRole, number> = {
  eyebrow: 0,
  heading: 0.07,
  copy: 0.12,
  content: 0.16,
  item: 0.16,
  visual: 0.16,
  cta: 0.22,
};

export function getActiveState(): MotionState {
  return { opacity: 1, x: 0, y: 0, scale: 1 };
}

export function getEntranceState(
  role: MotionRole,
  direction: ScrollDirection,
  compact: boolean,
  reduced: boolean,
  index = 0,
): MotionState {
  if (reduced) return getActiveState();

  const sign = direction === "down" ? 1 : -1;
  const factor = compact ? 0.65 : 1;
  const horizontalDirection = role === "item" && index % 2 === 1 ? -1 : 1;

  return {
    opacity: 0,
    x: Math.round(entranceX[role] * factor) * horizontalDirection,
    y: Math.round(entranceY[role] * factor) * sign,
    scale: role === "visual" ? 0.985 : 1,
  };
}

export function getReleaseTarget(
  role: MotionRole,
  direction: ScrollDirection,
  compact: boolean,
  reduced: boolean,
): MotionState {
  if (reduced) return getActiveState();

  const state = release[role];
  const sign = direction === "down" ? 1 : -1;
  const factor = compact ? 0.65 : 1;

  return {
    ...state,
    y: Math.round(state.y * factor) * sign,
  };
}

export function getLifecycleReleaseProgress(
  progress: number,
  direction: ScrollDirection,
) {
  if (direction === "down") {
    return Math.min(
      1,
      Math.max(0, (progress - SECTION_EXIT_PROGRESS) / (1 - SECTION_EXIT_PROGRESS)),
    );
  }

  return Math.min(
    1,
    Math.max(0, (SECTION_REVERSE_EXIT_PROGRESS - progress) / SECTION_REVERSE_EXIT_PROGRESS),
  );
}

export function getReleaseProgress(
  direction: ScrollDirection,
  progress: number,
) {
  return getLifecycleReleaseProgress(progress, direction);
}

export function isEntryBoundaryCrossed(
  direction: ScrollDirection,
  progress: number,
  startOutside: boolean,
  endOutside: boolean,
) {
  return direction === "down"
    ? startOutside && progress > 0
    : endOutside && progress < 1;
}

export function getEntranceTransition(
  role: MotionRole,
  index: number,
  compact: boolean,
  reduced: boolean,
): Transition {
  const stagger = compact ? 0.045 : 0.07;

  return {
    duration: reduced ? 0 : SECTION_MOTION_DURATION,
    ease: sectionEase,
    delay: reduced
      ? 0
      : delay[role] + (role === "item" ? index * stagger : 0),
  };
}
