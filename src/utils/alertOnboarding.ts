const ONBOARDING_KEY = 'koi_alerts_onboarding_done';

export function isAlertsOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markAlertsOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Failed to persist alerts onboarding flag:', error);
  }
}
