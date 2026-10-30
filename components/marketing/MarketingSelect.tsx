"use client";

type Option = { value: string; label: string; disabled?: boolean };

// Light retains its native form control; shared settings use the same value API.
export function MarketingSelect({ options, value, defaultValue, onValueChange, label, name, required, disabled, className }: {
  options: Option[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  label: string; name?: string; required?: boolean; disabled?: boolean; className?: string;
}) {
  return <select aria-label={label} name={name} required={required} disabled={disabled} className={className}
    value={value} defaultValue={defaultValue} onChange={event => onValueChange?.(event.target.value)}>
    {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </select>;
}
