import type { CSSProperties } from "react";

const BUTTON: CSSProperties = {
  width: 44,
  height: 44,
  padding: 0,
  display: "grid",
  placeItems: "center",
  border: "1px solid #30363d",
  borderRadius: "50%",
  background: "#161b22",
  color: "#e6edf3",
  cursor: "pointer",
};

const DISABLED: CSSProperties = { opacity: 0.4, cursor: "default" };

const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface RangeControlProps {
  rangeKm: number;
  steps: readonly number[];
  onChange: (km: number) => void;
  compact?: boolean;
}

export function RangeControl({ rangeKm, steps, onChange, compact = false }: RangeControlProps) {
  const i = steps.indexOf(rangeKm);
  const canDecrease = i > 0;
  const canIncrease = i >= 0 && i < steps.length - 1;

  if (compact) {
    const next = steps[(i + 1) % steps.length];
    return (
      <button
        type="button"
        aria-label={`Range ${rangeKm} km. Change to ${next} km`}
        onClick={() => onChange(next)}
        style={{
          minHeight: 44,
          padding: "0 14px",
          border: "1px solid #30363d",
          borderRadius: 999,
          background: "#161b22",
          color: "#e6edf3",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {rangeKm} km
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        aria-label="Decrease range"
        disabled={!canDecrease}
        onClick={() => onChange(steps[i - 1])}
        style={{ ...BUTTON, ...(canDecrease ? {} : DISABLED) }}
      >
        <MinusIcon />
      </button>

      <span
        aria-live="polite"
        style={{
          minWidth: 64,
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          color: "#e6edf3",
        }}
      >
        {rangeKm} km
      </span>

      <button
        type="button"
        aria-label="Increase range"
        disabled={!canIncrease}
        onClick={() => onChange(steps[i + 1])}
        style={{ ...BUTTON, ...(canIncrease ? {} : DISABLED) }}
      >
        <PlusIcon />
      </button>
    </div>
  );
}