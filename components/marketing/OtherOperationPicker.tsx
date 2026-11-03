"use client";
import { Globe, Palette, FileText, SlidersHorizontal } from "lucide-react";
import styles from "./marketing.module.css";

const options = [
  { value: "website", name: "Website update", owner: "Developer", icon: Globe },
  { value: "materials", name: "Marketing materials", owner: "Designer", icon: Palette },
  { value: "agenda", name: "Agenda update", owner: "Designer", icon: FileText },
];

export function OtherOperationPicker({ value, onChange, manager }: {
  value: string[];
  onChange: (value: string[]) => void;
  manager: boolean;
}) {
  const choices = manager
    ? [...options, { value: "custom", name: "Custom workflow", owner: "Choose delivery stages", icon: SlidersHorizontal }]
    : options;

  function toggle(operation: string) {
    if (value.includes(operation)) {
      onChange(value.filter(item => item !== operation));
    } else if (operation === "custom") {
      onChange(["custom"]);
    } else {
      onChange([...value.filter(item => item !== "custom"), operation]);
    }
  }

  return (
    <fieldset className={`${styles.full} ${styles.operationFieldset}`}>
      <legend>What do you need?</legend>
      <div className={`${styles.operationChoices} ${styles.otherOperationChoices}`}>
        {choices.map(({ value: operation, name, owner, icon: Icon }) => (
          <label key={operation} data-selected={value.includes(operation)}>
            <input type="checkbox" name="otherOperations" value={operation}
              checked={value.includes(operation)} onChange={() => toggle(operation)} />
            <Icon size={18} aria-hidden="true" />
            <span>{name}<small>{owner}</small></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
