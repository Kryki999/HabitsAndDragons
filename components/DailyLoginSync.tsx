import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/** Runs once on app load: economy day rollover, morning gold, habit day reset. */
export default function DailyLoginSync() {
  useEffect(() => {
    const state = useGameStore.getState();
    state.processDailyLogin();
    state.resetDailyHabits();
  }, []);

  return null;
}
