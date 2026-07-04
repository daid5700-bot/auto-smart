"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * ModalPortal — renders children directly inside <body>
 * This escapes all stacking contexts (z-index, overflow, transform)
 * so that fixed overlays always cover the entire viewport correctly.
 *
 * Usage: wrap any modal content with <ModalPortal> instead of a plain div.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const portalRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    portalRoot.current = document.body;
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !portalRoot.current) return null;
  return createPortal(children, portalRoot.current);
}
