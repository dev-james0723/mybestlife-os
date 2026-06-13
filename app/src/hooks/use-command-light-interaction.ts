"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";

type CommandLightStyle = CSSProperties & {
  "--knowledge-command-light-x": string;
  "--knowledge-command-light-y": string;
  "--knowledge-command-light-active": string;
};

export function useCommandLightInteraction(reduceMotion: boolean | null | undefined) {
  const elementRef = useRef<HTMLButtonElement>(null);
  const interactionResetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (interactionResetRef.current) {
        window.clearTimeout(interactionResetRef.current);
      }
    };
  }, []);

  const setInteractiveLightPosition = useCallback(
    (target: HTMLButtonElement, clientX: number, clientY: number) => {
      if (reduceMotion) return;
      const rect = target.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));

      if (interactionResetRef.current) {
        window.clearTimeout(interactionResetRef.current);
        interactionResetRef.current = null;
      }

      target.style.setProperty("--knowledge-command-light-x", `${x.toFixed(2)}%`);
      target.style.setProperty("--knowledge-command-light-y", `${y.toFixed(2)}%`);
      target.style.setProperty("--knowledge-command-light-active", "1");
    },
    [reduceMotion],
  );

  const fadeInteractiveLight = useCallback(
    (delay = 0) => {
      if (reduceMotion) return;
      if (interactionResetRef.current) {
        window.clearTimeout(interactionResetRef.current);
      }
      interactionResetRef.current = window.setTimeout(() => {
        elementRef.current?.style.setProperty("--knowledge-command-light-active", "0");
        interactionResetRef.current = null;
      }, delay);
    },
    [reduceMotion],
  );

  return {
    ref: elementRef,
    style: {
      "--knowledge-command-light-x": "72%",
      "--knowledge-command-light-y": "28%",
      "--knowledge-command-light-active": "0",
    } as CommandLightStyle,
    handlers: {
      onMouseEnter: (event: MouseEvent<HTMLButtonElement>) => {
        setInteractiveLightPosition(event.currentTarget, event.clientX, event.clientY);
      },
      onMouseMove: (event: MouseEvent<HTMLButtonElement>) => {
        setInteractiveLightPosition(event.currentTarget, event.clientX, event.clientY);
      },
      onTouchStart: (event: TouchEvent<HTMLButtonElement>) => {
        const touch = event.touches[0] ?? event.changedTouches[0];
        if (!touch) return;
        setInteractiveLightPosition(event.currentTarget, touch.clientX, touch.clientY);
      },
      onTouchMove: (event: TouchEvent<HTMLButtonElement>) => {
        const touch = event.touches[0] ?? event.changedTouches[0];
        if (!touch) return;
        setInteractiveLightPosition(event.currentTarget, touch.clientX, touch.clientY);
      },
      onTouchEnd: () => fadeInteractiveLight(420),
      onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
        setInteractiveLightPosition(event.currentTarget, event.clientX, event.clientY);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        setInteractiveLightPosition(event.currentTarget, event.clientX, event.clientY);
      },
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        setInteractiveLightPosition(event.currentTarget, event.clientX, event.clientY);
      },
      onPointerUp: () => fadeInteractiveLight(420),
      onPointerCancel: () => fadeInteractiveLight(),
      onPointerLeave: () => fadeInteractiveLight(80),
    },
  };
}
