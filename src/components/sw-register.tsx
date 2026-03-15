'use client';

import { useEffect } from 'react';
import { info, error } from '@/lib/services/logger';

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          info(`Service Worker registered: ${reg.scope}`);
        })
        .catch((err) => {
          error(`Service Worker registration failed: ${err}`);
        });
    }
  }, []);

  return null;
}
