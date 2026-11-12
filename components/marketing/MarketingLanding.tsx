"use client";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./marketing.module.css";

export function MarketingLanding() {
  const { user } = useAuth();
  return <section className={styles.workspace}>
    <header className={styles.header}><div>
      <div className={styles.eyebrow}><Megaphone size={14} /> Marketing department</div>
      <h1>Marketing home<span className={styles.liveDot} /></h1>
      <p>Your event agendas and marketing materials, together.</p>
    </div></header>
    <div className={styles.welcome}><div>
      <h2>Welcome{user?.fullName ? `, ${user.fullName}` : ""}</h2>
      <p>Use Agenda and Materials in the sidebar to browse current files and version history. Marketing Managers and Designers can upload new versions.</p>
    </div></div>
  </section>;
}
