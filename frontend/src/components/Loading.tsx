// frontend/src/components/Loading.tsx
import styles from "./Loading.module.css";

export default function Loading({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingBg}></div>
      <div className={`${styles.loader} ${styles.loaded}`}>
        <div className={styles.box}>
          <span className={styles.loadingText}>
            {children || "Carregando..."}
          </span>
        </div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
      </div>
    </div>
  );
}