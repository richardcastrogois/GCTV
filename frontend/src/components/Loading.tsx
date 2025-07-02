//frontend/src/components/Loading.tsx

import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <>
      <div className={styles.loadingBg}></div>
      <div className={`${styles.loader} ${styles.loaded}`}>
        <div className={styles.box}>
          <span className={styles.loadingText}>Carregando...</span>
        </div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
        <div className={styles.box}></div>
      </div>
    </>
  );
}