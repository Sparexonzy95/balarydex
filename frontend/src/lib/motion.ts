export const smoothEase = [0.16, 1, 0.3, 1] as const;

export const subtleTap = { scale: 0.99 };

export const liftHover = {
  y: -2,
};

export const microTransition = {
  duration: 0.22,
  ease: smoothEase,
} as const;
