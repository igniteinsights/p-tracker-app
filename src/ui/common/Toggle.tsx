interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

export function Toggle({ label, hint, checked, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="toggle-row"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-row__text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <span className={`toggle${checked ? ' toggle--on' : ''}`} aria-hidden="true" />
    </button>
  );
}
