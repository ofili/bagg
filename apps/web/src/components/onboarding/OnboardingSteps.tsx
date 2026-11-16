import { StepIndicator } from '@/components/ui/StepIndicator';

const STEPS = [
  { id: 'business', label: 'Business details' },
  { id: 'plan', label: 'Choose a plan' },
];

export type OnboardingStep = 'business' | 'plan';

/** The two-step setup indicator shared by the onboarding screens. */
export function OnboardingSteps({ current }: { current: OnboardingStep }) {
  return (
    <StepIndicator steps={STEPS} current={current} label="Setup progress" />
  );
}
