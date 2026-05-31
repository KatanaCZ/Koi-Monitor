import { useAppStore } from '../store';

export const EMPTY_DRIVERS_BACKEND_NAME = 'No hardware drivers detected';

export function getEmptyDriversUserLabel(): string {
  const language = useAppStore.getState().settings.language || 'en';
  return language === 'fr' ? "Rien pour l'instant, lancez un scan" : "Nothing yet, run a scan";
}

export function getEmptyDriversToast(): string {
  const language = useAppStore.getState().settings.language || 'en';
  return language === 'fr'
    ? "Calme plat côté pilotes, Koi n'a rien trouvé, un scan suffit"
    : "Calm waters on the drivers side, Koi found nothing, a scan is enough";
}

export function normalizeDriverName(name: string): string {
  if (name === EMPTY_DRIVERS_BACKEND_NAME) return getEmptyDriversUserLabel();
  return name;
}

export function isEmptyDriversList(drivers: { name: string }[]): boolean {
  return (
    drivers.length === 0 ||
    (drivers.length === 1 && drivers[0]?.name === EMPTY_DRIVERS_BACKEND_NAME)
  );
}

export function getDriversHeaderSubtitle(
  drivers: { name: string }[],
  simplified: boolean,
): string {
  const language = useAppStore.getState().settings.language || 'en';
  if (isEmptyDriversList(drivers)) {
    return language === 'fr'
      ? "Koi écoute, rien en vue pour l'instant, lancez un scan"
      : "Koi is listening, nothing in sight yet, run a scan";
  }
  const count = drivers.length;
  if (count === 0) {
    return language === 'fr'
      ? "Scannez pour découvrir les pilotes de votre machine"
      : "Scan to discover your machine's drivers";
  }
  if (count === 1 && simplified) {
    return language === 'fr'
      ? "1 essentiel, graphique, réseau ou Bluetooth, version sous les yeux"
      : "1 essential (graphics, network, or Bluetooth), version under your eyes";
  }
  if (simplified) {
    return language === 'fr'
      ? `${count} essentiels, graphique, réseau et Bluetooth, versions sous les yeux`
      : `${count} essentials (graphics, network, and Bluetooth), versions under your eyes`;
  }
  return language === 'fr'
    ? `${count} pilotes, graphique, réseau, audio et stockage, versions sous les yeux`
    : `${count} drivers (graphics, network, audio, and storage), versions under your eyes`;
}

export function getSummaryBandTitle(count: number): string {
  const language = useAppStore.getState().settings.language || 'en';
  if (count <= 0) return language === 'fr' ? 'Pilotes en attente' : 'Drivers pending';
  return language === 'fr'
    ? `${count} pilote${count !== 1 ? 's' : ''} sous surveillance`
    : `${count} driver${count !== 1 ? 's' : ''} under observation`;
}

export function getSummaryBandSubtitle(
  installedCount: number,
  updateCount: number,
  verifyCount: number,
): string {
  const language = useAppStore.getState().settings.language || 'en';
  const parts: string[] = [];
  if (installedCount > 0) {
    if (language === 'fr') {
      parts.push(`${installedCount} serein${installedCount !== 1 ? 's' : ''}`);
    } else {
      parts.push(`${installedCount} stable`);
    }
  }
  if (updateCount > 0) {
    if (language === 'fr') {
      parts.push(`${updateCount} nouveauté${updateCount !== 1 ? 's' : ''}`);
    } else {
      parts.push(`${updateCount} update${updateCount !== 1 ? 's' : ''}`);
    }
  }
  if (verifyCount > 0) {
    if (language === 'fr') {
      parts.push(`${verifyCount} à confirmer`);
    } else {
      parts.push(`${verifyCount} to confirm`);
    }
  }
  if (parts.length === 0) return language === 'fr' ? 'Lancez un scan pour commencer' : 'Run a scan to start';
  return parts.join(', ');
}

export function getSummaryBandBadge(
  updateCount: number,
  verifyCount: number,
): { label: string; tone: 'ok' | 'update' | 'verify' } {
  const language = useAppStore.getState().settings.language || 'en';
  if (updateCount > 0) {
    return {
      label: language === 'fr'
        ? `${updateCount} nouveauté${updateCount !== 1 ? 's' : ''}`
        : `${updateCount} update${updateCount !== 1 ? 's' : ''}`,
      tone: 'update',
    };
  }
  if (verifyCount > 0) {
    return {
      label: language === 'fr'
        ? `${verifyCount} à confirmer`
        : `${verifyCount} to confirm`,
      tone: 'verify',
    };
  }
  return {
    label: language === 'fr' ? 'Tout est à jour' : 'All up to date',
    tone: 'ok',
  };
}

export function getDriverStoreWarningLines(): string[] {
  const language = useAppStore.getState().settings.language || 'en';
  return language === 'fr'
    ? ['Version repérée dans le magasin de pilotes.', 'Windows Update ne la propose pas encore sur ce PC.']
    : ['Version found in the driver store.', 'Windows Update does not offer it on this PC yet.'];
}

export function getScanButtonIdle(): string {
  const language = useAppStore.getState().settings.language || 'en';
  return language === 'fr' ? 'Scanner les pilotes' : 'Scan drivers';
}

export function getScanButtonLoading(): string {
  const language = useAppStore.getState().settings.language || 'en';
  return language === 'fr' ? 'Scan en cours' : 'Scanning';
}
