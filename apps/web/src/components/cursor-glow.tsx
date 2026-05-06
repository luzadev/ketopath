'use client';

import { useEffect, useRef } from 'react';

/**
 * Cursor-tracking glow — un alone radiale che segue il puntatore.
 * Si appiccica al parent posizionato relative/absolute. Rispetta
 * `prefers-reduced-motion` (in quel caso resta centrato).
 */
export function CursorGlow({
  className = '',
  color = 'hsl(var(--pomodoro))',
  size = 520,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    let targetX = parent.clientWidth / 2;
    let targetY = parent.clientHeight / 3;
    let currentX = targetX;
    let currentY = targetY;

    function onMove(e: PointerEvent): void {
      const rect = parent!.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
    }

    function loop(): void {
      // Easing: avvicino la posizione corrente al target con un delta morbido.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      if (el) {
        el.style.transform = `translate3d(${currentX - size / 2}px, ${currentY - size / 2}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    }

    parent.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener('pointermove', onMove);
    };
  }, [size]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 rounded-full mix-blend-multiply ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        opacity: 0.55,
        filter: 'blur(48px)',
        transform: `translate3d(${-size}px, ${-size}px, 0)`,
        willChange: 'transform',
      }}
    />
  );
}
