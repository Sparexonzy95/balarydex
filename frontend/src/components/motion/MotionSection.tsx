import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ForwardedRef,
} from "react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  getActiveState,
  getEntranceState,
  getEntranceTransition,
  getLifecycleReleaseProgress,
  getReleaseTarget,
  isEntryBoundaryCrossed,
  SECTION_ENTRY_VIEWPORT,
  SECTION_EXIT_PROGRESS,
  SECTION_MOTION_DURATION,
  SECTION_REVERSE_EXIT_PROGRESS,
  type MotionRole,
  type ScrollDirection,
} from "@/lib/section-motion";

export type MotionRootTag = "section" | "article" | "footer" | "header" | "div";

type MotionSectionProps = HTMLAttributes<HTMLElement> & {
  as?: MotionRootTag;
  exit?: boolean;
  backgroundClassName?: string;
};

type MotionElementProps = {
  className?: string;
  innerClassName?: string;
  role: MotionRole;
  index?: number;
  children?: React.ReactNode;
  style?: CSSProperties;
  id?: string;
};

type EntryState = {
  id: number;
  direction: ScrollDirection;
  entered: boolean;
};

type MotionSectionContextValue = {
  compact: boolean;
  entry: EntryState;
  exit: boolean;
  reduced: boolean;
  releaseDirection: ScrollDirection;
  releaseProgress: MotionValue<number>;
};

const MotionSectionContext = createContext<MotionSectionContextValue | null>(null);
const settledEntry: EntryState = {
  id: 1,
  direction: "down",
  entered: true,
};

function useCompactMotion() {
  const [compact, setCompact] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export const MotionSection = forwardRef<HTMLElement, MotionSectionProps>(function MotionSection({
  as = "section",
  exit = false,
  backgroundClassName,
  className = "",
  children,
  ...props
}: MotionSectionProps, forwardedRef) {
  const Root = as;
  const rootRef = useRef<HTMLElement>(null);
  const compact = useCompactMotion();
  const reduced = useReducedMotion() ?? false;
  const initialized = useRef(false);
  const lowerOutside = useRef(true);
  const upperOutside = useRef(false);
  const lowerExitArmed = useRef(false);
  const upperExitArmed = useRef(false);
  const releaseProgress = useMotionValue(0);
  const [releaseDirection, setReleaseDirection] =
    useState<ScrollDirection>("down");
  const [entry, setEntry] = useState<EntryState>({
    id: 0,
    direction: "down",
    entered: false,
  });
  const { scrollYProgress: lifecycleProgress } = useScroll({
    target: rootRef,
    offset: ["start 50%", "end 50%"],
  });
  const { scrollYProgress: backgroundProgress } = useScroll({
    target: rootRef,
    offset: ["start 100%", "start 55%"],
  });
  const backgroundOpacity = useTransform(backgroundProgress, [0, 1], [0, 1]);
  const setRootRef = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
    assignRef(forwardedRef, node);
  }, [forwardedRef]);

  const beginEntry = useCallback((direction: ScrollDirection) => {
    if (direction === "down") {
      lowerOutside.current = false;
      lowerExitArmed.current = false;
      upperExitArmed.current = true;
    } else {
      upperOutside.current = false;
      lowerExitArmed.current = true;
      upperExitArmed.current = false;
    }

    releaseProgress.set(0);
    setReleaseDirection(direction);
    setEntry((current) => ({
      id: current.id + 1,
      direction,
      entered: true,
    }));
  }, [releaseProgress]);

  const updateLifecycle = useCallback((current: number, previous: number) => {
    if (current === previous) return;

    const direction: ScrollDirection = current > previous ? "down" : "up";
    const enteredDown = isEntryBoundaryCrossed(
      "down",
      current,
      lowerOutside.current,
      upperOutside.current,
    );
    const enteredUp = isEntryBoundaryCrossed(
      "up",
      current,
      lowerOutside.current,
      upperOutside.current,
    );

    if (enteredDown || enteredUp) beginEntry(direction);

    if (current <= 0) lowerOutside.current = true;
    if (current >= 1) upperOutside.current = true;

    if (current > SECTION_REVERSE_EXIT_PROGRESS) lowerExitArmed.current = true;
    if (current < SECTION_EXIT_PROGRESS) upperExitArmed.current = true;

    if (!exit || reduced) {
      releaseProgress.set(0);
      return;
    }

    if (current >= SECTION_EXIT_PROGRESS && upperExitArmed.current) {
      setReleaseDirection("down");
      releaseProgress.set(getLifecycleReleaseProgress(current, "down"));
    } else if (
      current <= SECTION_REVERSE_EXIT_PROGRESS &&
      lowerExitArmed.current
    ) {
      setReleaseDirection("up");
      releaseProgress.set(getLifecycleReleaseProgress(current, "up"));
    } else {
      releaseProgress.set(0);
    }
  }, [beginEntry, exit, reduced, releaseProgress]);

  useMotionValueEvent(lifecycleProgress, "change", (current) => {
    const previous = lifecycleProgress.getPrevious();
    if (previous === undefined) return;
    initialized.current = true;
    updateLifecycle(current, previous);
  });

  useEffect(() => {
    if (initialized.current) return;

    const frame = window.requestAnimationFrame(() => {
      if (initialized.current) return;
      initialized.current = true;
      const node = rootRef.current;
      const rect = node?.getBoundingClientRect();
      const measuredProgress = rect && rect.height > 0
        ? (window.innerHeight * SECTION_ENTRY_VIEWPORT - rect.top) / rect.height
        : lifecycleProgress.get();

      if (measuredProgress > 0 && measuredProgress < 1) {
        lowerExitArmed.current = measuredProgress > SECTION_REVERSE_EXIT_PROGRESS;
        upperExitArmed.current = measuredProgress < SECTION_EXIT_PROGRESS;
        beginEntry("down");
      } else {
        lowerOutside.current = measuredProgress <= 0;
        upperOutside.current = measuredProgress >= 1;
        lowerExitArmed.current = measuredProgress > 0;
        upperExitArmed.current = measuredProgress < 1;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [beginEntry, lifecycleProgress]);

  useEffect(() => {
    if (!exit || reduced) releaseProgress.set(0);
  }, [exit, reduced, releaseProgress]);

  const context = useMemo<MotionSectionContextValue>(
    () => ({
      compact,
      entry,
      exit,
      reduced,
      releaseDirection,
      releaseProgress,
    }),
    [compact, entry, exit, reduced, releaseDirection, releaseProgress],
  );

  return (
    <Root
      ref={setRootRef as never}
      className={`relative isolate ${className}`}
      data-motion-exit={String(exit)}
      data-motion-entry-vh={SECTION_ENTRY_VIEWPORT * 100}
      data-motion-exit-progress={SECTION_EXIT_PROGRESS * 100}
      data-motion-duration-ms={SECTION_MOTION_DURATION * 1000}
      data-motion-section=""
      {...props}
    >
      {backgroundClassName && (
        <motion.div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 -z-10 ${backgroundClassName}`}
          data-motion-background=""
          style={{ opacity: reduced ? 1 : backgroundOpacity }}
        />
      )}
      <MotionSectionContext.Provider value={context}>
        {children}
      </MotionSectionContext.Provider>
    </Root>
  );
});

export function MotionElement({
  role,
  index = 0,
  className = "",
  innerClassName = "",
  children,
  style,
  ...props
}: MotionElementProps) {
  const context = useContext(MotionSectionContext);
  const controls = useAnimationControls();
  const fallbackProgress = useMotionValue(0);
  const compact = context?.compact ?? false;
  const entry = context?.entry ?? settledEntry;
  const reduced = context?.reduced ?? false;
  const releaseDirection = context?.releaseDirection ?? "down";
  const releaseProgress = context?.releaseProgress ?? fallbackProgress;
  const releaseTarget = getReleaseTarget(
    role,
    releaseDirection,
    compact,
    reduced,
  );
  const releaseOpacity = useTransform(
    releaseProgress,
    [0, 1],
    [1, releaseTarget.opacity],
  );
  const releaseY = useTransform(
    releaseProgress,
    [0, 1],
    [0, releaseTarget.y],
  );
  const releaseX = useTransform(
    releaseProgress,
    [0, 1],
    [0, releaseTarget.x],
  );
  const releaseScale = useTransform(
    releaseProgress,
    [0, 1],
    [1, releaseTarget.scale],
  );

  useEffect(() => {
    if (!entry.entered || reduced) {
      controls.set(
        reduced
          ? getActiveState()
          : getEntranceState(role, entry.direction, compact, false, index),
      );
      return;
    }

    controls.set(getEntranceState(role, entry.direction, compact, false, index));
    const frame = window.requestAnimationFrame(() => {
      void controls.start({
        ...getActiveState(),
        transition: getEntranceTransition(role, index, compact, false),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [compact, controls, entry, index, reduced, role]);

  return (
    <motion.div
      className={className}
      data-motion-index={index}
      data-motion-role={role}
      style={{
        ...style,
        "--section-motion-duration": `${SECTION_MOTION_DURATION}s`,
        opacity: context?.exit === false ? 1 : releaseOpacity,
        scale: context?.exit === false ? 1 : releaseScale,
        x: context?.exit === false ? 0 : releaseX,
        y: context?.exit === false ? 0 : releaseY,
      } as CSSProperties}
      {...props}
    >
      <motion.div
        animate={controls}
        className={`${innerClassName} ${className.includes("h-full") && !innerClassName.includes("h-full") ? "h-full flex flex-col flex-1" : ""}`.trim()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function MotionHeading({
  className = "",
  children,
  ...props
}: Omit<MotionElementProps, "role">) {
  return (
    <MotionElement role="heading" className={className} {...props}>
      <div className="motion-heading-mask">{children}</div>
    </MotionElement>
  );
}
