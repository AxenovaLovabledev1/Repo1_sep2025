'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TypewriterState {
  display: string;
  isFinished: boolean;
  cancel: () => void;
}

export function useTypewriter(text: string, speed = 45, active = true): TypewriterState {
  const [display, setDisplay] = useState<string>(active ? '' : text);
  const [isFinished, setIsFinished] = useState<boolean>(!active);

  useEffect(() => {
    if (!active) {
      setDisplay(text);
      setIsFinished(true);
      return;
    }

    setDisplay('');
    setIsFinished(false);

    if (!text) {
      setIsFinished(true);
      return;
    }

    const intervalMs = Math.max(16, Math.floor(1000 / speed));
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplay(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
        setIsFinished(true);
      }
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [active, speed, text]);

  const cancel = useCallback(() => {
    setDisplay(text);
    setIsFinished(true);
  }, [text]);

  return { display, isFinished, cancel };
}
