import type {
  PlayerClass,
  HeroGender,
  SageLifeFocus,
  OnboardingWeakness,
  OnboardingCommitment,
  OnboardingDeepProfile,
} from '@/types/game';

/** Answers collected in the Sage onboarding wizard (cold-start input). */
export type OnboardingUserProfile = {
  playerClass: PlayerClass;
  heroDisplayName: string;
  heroGender: HeroGender;
  sageFocus: SageLifeFocus;
  weakness: OnboardingWeakness;
  commitment: OnboardingCommitment;
  /** Present when the player completed the deep profiling path. */
  deepProfile: OnboardingDeepProfile | null;
};
