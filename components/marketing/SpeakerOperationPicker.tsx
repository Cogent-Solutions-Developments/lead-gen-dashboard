"use client";
import { Globe, FileText, Layers, PencilLine, Trash2, Repeat2 } from "lucide-react";
import styles from "./marketing.module.css";
export const speakerOperations = [
  { value: "website", name: "Update website", owner: "Developer", icon: Globe },
  { value: "agenda", name: "Update agenda", owner: "Designer", icon: FileText },
  { value: "website_agenda", name: "Update website & agenda", owner: "Developer + Designer", icon: Layers },
  { value: "update_post", name: "Update post", owner: "Designer → Social media", icon: PencilLine },
  { value: "republish_post", name: "Republish post", owner: "Designer → Social media", icon: Repeat2 },
  { value: "delete_post", name: "Delete post", owner: "Social media", icon: Trash2 },
] as const;
export function SpeakerOperationPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset className={`${styles.full} ${styles.operationFieldset}`}>
    <legend>What needs updating?</legend>
    <div className={styles.operationChoices}>
      {speakerOperations.map(({ value: operation, name, owner, icon: Icon }) => <label key={operation} data-selected={value === operation}>
        <input type="radio" name="operation" value={operation} checked={value === operation} onChange={() => onChange(operation)} />
        <Icon size={18} aria-hidden="true" /><span>{name}<small>{owner}</small></span>
      </label>)}
    </div>
  </fieldset>;
}
