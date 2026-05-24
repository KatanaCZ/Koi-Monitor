/** Chaînes user-facing pilotes — ton Premium Zen, français naturel */

export const EMPTY_DRIVERS_BACKEND_NAME = 'No hardware drivers detected';
export const EMPTY_DRIVERS_USER_LABEL = 'Rien pour l\'instant, lancez un scan';
export const EMPTY_DRIVERS_TOAST =
  'Calme plat côté pilotes, Koi n\'a rien trouvé, un scan suffit';

export function normalizeDriverName(name: string): string {
  if (name === EMPTY_DRIVERS_BACKEND_NAME) return EMPTY_DRIVERS_USER_LABEL;
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
  if (isEmptyDriversList(drivers)) {
    return 'Koi écoute, rien en vue pour l\'instant, lancez un scan';
  }
  const count = drivers.length;
  if (count === 0) {
    return 'Scannez pour découvrir les pilotes de votre machine';
  }
  if (count === 1 && simplified) {
    return '1 essentiel, graphique, réseau ou Bluetooth, version sous les yeux';
  }
  if (simplified) {
    return `${count} essentiels, graphique, réseau et Bluetooth, versions sous les yeux`;
  }
  return `${count} pilotes, graphique, réseau, audio et stockage, versions sous les yeux`;
}

export function getSummaryBandTitle(count: number): string {
  if (count <= 0) return 'Pilotes en attente';
  return `${count} pilote${count !== 1 ? 's' : ''} sous surveillance`;
}

export function getSummaryBandSubtitle(
  installedCount: number,
  updateCount: number,
  verifyCount: number,
): string {
  const parts: string[] = [];
  if (installedCount > 0) {
    parts.push(`${installedCount} serein${installedCount !== 1 ? 's' : ''}`);
  }
  if (updateCount > 0) {
    parts.push(`${updateCount} nouveauté${updateCount !== 1 ? 's' : ''}`);
  }
  if (verifyCount > 0) {
    parts.push(`${verifyCount} à confirmer`);
  }
  if (parts.length === 0) return 'Lancez un scan pour commencer';
  return parts.join(', ');
}

export function getSummaryBandBadge(
  updateCount: number,
  verifyCount: number,
): { label: string; tone: 'ok' | 'update' | 'verify' } {
  if (updateCount > 0) {
    return {
      label: `${updateCount} nouveauté${updateCount !== 1 ? 's' : ''}`,
      tone: 'update',
    };
  }
  if (verifyCount > 0) {
    return {
      label: `${verifyCount} à confirmer`,
      tone: 'verify',
    };
  }
  return { label: 'Tout est à jour', tone: 'ok' };
}

export const DRIVER_STORE_WARNING_LINE_1 =
  'Version repérée dans le magasin de pilotes.';
export const DRIVER_STORE_WARNING_LINE_2 =
  'Windows Update ne la propose pas encore sur ce PC.';

export const SCAN_BUTTON_IDLE = 'Scanner les pilotes';
export const SCAN_BUTTON_LOADING = 'Scan en cours';
