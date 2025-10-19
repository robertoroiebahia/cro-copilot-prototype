type TimerMeta = Record<string, unknown>;

export type StopTimer = (meta?: TimerMeta) => void;

export const startTimer = (label: string): StopTimer => {
  const start = process.hrtime.bigint();
  return (meta?: TimerMeta) => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload: TimerMeta = { durationMs: Number(durationMs.toFixed(2)), ...(meta ?? {}) };
    console.log(`[timer] ${label}`, payload);
  };
};
