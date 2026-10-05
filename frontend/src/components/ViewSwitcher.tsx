import { VIEWS, type View } from "../types/views";

const LABELS: Record<View, string> = {
  map: 'Map',
  radar: 'Radar',
  dome: 'Dome',
};

interface ViewSwitcherProps {
  view: View;
  onChange: (view: View) => void;
}

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Choose view"
      style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: 'calc(16px + env(safe-area-inset-left, 0px))',
        zIndex: 10,
        display: 'flex',
        gap: 4,
        padding: 4,
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 999,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      {VIEWS.map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            style={{
              minHeight: 44,
              padding: '0 18px',
              border: 0,
              borderRadius: 999,
              background: active ? '#e6edf3' : 'transparent',
              color: active ? '#0d1117' : '#9ba5b0',
              font: 'inherit',
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            {LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}