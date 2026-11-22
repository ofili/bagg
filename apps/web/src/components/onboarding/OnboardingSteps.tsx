
import { StepIndicator } from '@/components/ui/StepIndicator';

export type OnboardingStep = 'business' | 'plan';

type Props = {
  current: OnboardingStep;
  includePlan?: boolean;
};

export function OnboardingSteps({
  current,
  includePlan = true,
}: Props) {
  const steps = [
    { id: 'business', label: 'Business details' },
    ...(includePlan
      ? [{ id: 'plan', label: 'Choose a plan' }]
      : []),
  ];

  return (
    <StepIndicator
      steps={steps}
      current={current}
      label="Setup progress"
    />
  );
}
