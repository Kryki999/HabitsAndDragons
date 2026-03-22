import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/** Runs once on app load: economy day rollover, morning gold, habit day reset. */
export default function DailyLoginSync() {
  const processDailyLogin = useGameStore((s) => s.processDailyLogin);
  const resetDailyHabits = useGameStore((s) => s.resetDailyHabits);

  useEffect(() => {
    processDailyLogin();
    resetDailyHabits();
  }, [processDailyLogin, resetDailyHabits]);

  return null;
}
