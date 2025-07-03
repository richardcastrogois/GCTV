"use client";

import { ReactNode, useState, useEffect } from "react";
import styles from "./LoadingSimple.module.css"; // Importar o módulo CSS

interface LoadingSimpleProps {
  children?: ReactNode;
}

export default function LoadingSimple({ children }: LoadingSimpleProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 10) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.loadingWrapper}>
      <div
        className={styles.loadingSpinner}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.05s linear",
        }}
      >
        <div className={styles.spinnerCircle}>
          <div
            className={`${styles.spinnerDot} ${styles.dotBlue}`}
            style={{
              animation: `${styles.googleBounce} 1.4s infinite ease-in-out`,
            }}
          ></div>
          <div
            className={`${styles.spinnerDot} ${styles.dotRed}`}
            style={{
              animation: `${styles.googleBounce} 1.4s infinite ease-in-out 0.1s`,
            }}
          ></div>
          <div
            className={`${styles.spinnerDot} ${styles.dotYellow}`}
            style={{
              animation: `${styles.googleBounce} 1.4s infinite ease-in-out 0.2s`,
            }}
          ></div>
          <div
            className={`${styles.spinnerDot} ${styles.dotGreen}`}
            style={{
              animation: `${styles.googleBounce} 1.4s infinite ease-in-out 0.3s`,
            }}
          ></div>
        </div>
      </div>
      {children && <div className={styles.loadingText}>{children}</div>}
    </div>
  );
}
