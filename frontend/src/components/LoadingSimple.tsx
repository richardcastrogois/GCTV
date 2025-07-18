"use client";

import { ReactNode } from "react";
import styles from "./LoadingSimple.module.css";

// 1. A interface agora aceita a propriedade opcional 'isButton'
interface LoadingSimpleProps {
  children?: ReactNode;
  isButton?: boolean;
}

// OTIMIZAÇÃO: Componente simplificado sem JavaScript para animação.
export default function LoadingSimple({
  children,
  isButton = false,
}: LoadingSimpleProps) {
  const spinnerSizeClass = isButton
    ? styles.spinnerButton
    : styles.spinnerLarge;
  const dotSizeClass = isButton ? styles.dotButton : styles.dotLarge;

  if (isButton && !children) {
    return (
      <div className={`${styles.loadingSpinner} ${spinnerSizeClass}`}>
        <div className={styles.spinnerCircle}>
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotBlue}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotRed}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotYellow}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotGreen}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loadingWrapper}>
      <div className={`${styles.loadingSpinner} ${spinnerSizeClass}`}>
        <div className={styles.spinnerCircle}>
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotBlue}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotRed}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotYellow}`}
          />
          <div
            className={`${styles.spinnerDot} ${dotSizeClass} ${styles.dotGreen}`}
          />
        </div>
      </div>
      {children && <div className={styles.loadingText}>{children}</div>}
    </div>
  );
}
