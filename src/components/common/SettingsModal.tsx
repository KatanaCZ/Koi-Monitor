import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, RotateCcw, Monitor, Eye, Wifi, Info, Bell } from 'lucide-react';
import { useAppStore } from '../../store';
import {
  AppSettings,
  POPULAR_DNS_SERVERS,
  DEFAULT_DNS_CHECKLIST,
  DEFAULT_ALERT_THRESHOLDS,
  normalizeDnsChecklist,
} from '../../types';
import { syncGlassBlurClass } from '../../utils/glassBlur';
import {
  isMaxAtmosphereProfile,
  MAX_ATMOSPHERE_TOAST,
} from '../../utils/atmosphereSettings';
import {
  ATMOSPHERE_PRESET_SEGMENT,
  applyAtmospherePreset,
  inferAtmospherePreset,
  type AtmospherePresetId,
} from '../../utils/atmospherePresets';
import { REFRESH_OPTIONS, DNS_OPTIONS, BACKGROUND_AURA_SEGMENT, NEON_GLOW_SEGMENT } from '../../utils/settingsOptions';
import { isValidCustomDnsIpv4 } from '../../utils/dnsPing';
import {
  ALERT_SENSITIVITY_SEGMENT,
  applyDesktopSensitivity,
  applyGamingNetworkAlerts,
  inferDesktopSensitivity,
  isGamingNetworkAlertsEnabled,
} from '../../utils/alertPresets';
import type { AlertDesktopSensitivity } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { SlashTitle } from './SlashTitle';
import { DonateButton } from './DonateButton';
import { toastToneClass } from './StatusToast';

type TabId = 'general' | 'visual' | 'network' | 'alerts' | 'about';

export type SettingsTabId = TabId;

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'general', label: 'Essentiel', icon: <Monitor size={15} /> },
  { id: 'visual', label: 'Atmosphère', icon: <Eye size={15} /> },
  { id: 'network', label: 'Connexion', icon: <Wifi size={15} /> },
  { id: 'alerts', label: 'Veille', icon: <Bell size={15} /> },
  { id: 'about', label: 'À propos', icon: <Info size={15} /> },
];

const SAKURA_OPTIONS: { value: AppSettings['sakuraIntensity']; label: string }[] = [
  { value: 'off', label: 'Aucun' },
  { value: 'low', label: 'Léger' },
  { value: 'medium', label: 'Doux' },
  { value: 'high', label: 'Dense' },
];

const SAKURA_COLOR_OPTIONS: { value: AppSettings['sakuraColor']; label: string }[] = [
  { value: 'pink', label: 'Rose' },
  { value: 'purple', label: 'Violet' },
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Menthe' },
];

const THEME_OPTIONS = [
  { value: 'dark' as const, label: 'Sombre' },
  { value: 'light' as const, label: 'Clair' },
];

const SegmentControl: <T extends string | number>(props: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  wrap?: boolean;
  compact?: boolean;
}) => React.ReactElement = ({
  options,
  value,
  onChange,
  ariaLabel,
  wrap = false,
  compact = false,
}) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={`${wrap ? 'flex flex-wrap w-full' : 'inline-flex'} bg-[var(--surface-inset)] p-1 rounded-xl gap-1`}
  >
    {options.map((option, index) => (
      <button
        key={option.value}
        role="radio"
        aria-checked={value === option.value}
        tabIndex={value === option.value ? 0 : value === null && index === 0 ? 0 : -1}
        onClick={() => onChange(option.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(options[(index + 1) % options.length].value);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(options[(index - 1 + options.length) % options.length].value);
          }
        }}
        className={`${wrap ? 'flex-1 min-w-0 justify-center' : ''} ${compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} font-medium rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
          value === option.value
            ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const SettingRow: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 sm:items-center py-2 border-b border-[var(--border)] last:border-b-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--foreground)] leading-snug">{label}</p>
      {hint && (
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{hint}</p>
      )}
    </div>
    <div className="sm:justify-self-end">{children}</div>
  </div>
);

const NeonSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <SettingRow label={label} hint={hint}>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-300 cursor-pointer ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-muted)]'
      }`}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  </SettingRow>
);

const SettingSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="pb-1">
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-subtle)] mb-1 pt-2 first:pt-0">
      {title}
    </p>
    <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--surface-inset)]/30 px-3">
      {children}
    </div>
  </div>
);

const DnsCheckbox: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <button
    role="checkbox"
    aria-checked={checked}
    aria-label={`${label} ${description}`}
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
      checked
        ? 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
        : 'border-[var(--border)] bg-[var(--surface-inset)] hover:border-[var(--border-strong)]'
    }`}
  >
    <span
      className={`w-3.5 h-3.5 rounded-md border-2 shrink-0 flex items-center justify-center ${
        checked
          ? 'bg-[var(--accent)] border-[var(--accent)]'
          : 'border-[var(--border-strong)]'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-medium text-[var(--foreground)] truncate">{label}</span>
      <span className="block text-[10px] text-[var(--text-muted)] mono-text">{description}</span>
    </span>
  </button>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
  onEasterSecretTap?: () => void;
}

const customDnsInputClass =
  'w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:italic placeholder:font-light placeholder:tracking-wide placeholder:text-[color-mix(in_srgb,var(--text-subtle)_50%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

const customDnsIpInputClass = `${customDnsInputClass} mono-text placeholder:font-sans placeholder:tracking-wide placeholder:text-[color-mix(in_srgb,var(--text-muted)_42%,transparent)]`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  onEasterSecretTap,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aboutSlashKey, setAboutSlashKey] = useState(0);
  const [customIpDraft, setCustomIpDraft] = useState('');
  const [customLabelDraft, setCustomLabelDraft] = useState('');
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const dialogRef = useFocusTrap(isOpen);
  const prefersReducedMotion = useReducedMotion();

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'about') {
      setAboutSlashKey((key) => key + 1);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (toast) {
      const durationMs = toast.type === 'warning' ? 5_500 : 2_500;
      const timer = setTimeout(() => setToast(null), durationMs);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmReset(false);
      return;
    }
    if (initialTab) {
      setActiveTab(initialTab);
    }
    setCustomIpDraft(settings.customDns?.ip ?? '');
    setCustomLabelDraft(settings.customDns?.label ?? '');
  }, [isOpen, initialTab, settings.customDns?.ip, settings.customDns?.label]);

  useEffect(() => {
    if (confirmReset) {
      const timer = setTimeout(() => setConfirmReset(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmReset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDnsToggle = (name: string, checked: boolean) => {
    const newList = normalizeDnsChecklist(
      checked
        ? [...settings.dnsChecklist, name]
        : settings.dnsChecklist.filter((n) => n !== name),
    );
    if (newList.length === 0) {
      showToast('Gardez au moins un serveur sous observation', 'warning');
      return;
    }
    updateSettings({ dnsChecklist: newList });
    showToast(checked ? `${name} rejoint l'observation` : `${name} retiré de l'observation`);
  };

  const customIpError =
    customIpDraft.trim().length > 0 && !isValidCustomDnsIpv4(customIpDraft.trim())
      ? 'Adresse invalide'
      : '';

  const customDnsDraftIp = customIpDraft.trim();
  const customDnsDraftLabel = customLabelDraft.trim().slice(0, 24);
  const customDnsDirty =
    customDnsDraftIp !== (settings.customDns?.ip ?? '') ||
    customDnsDraftLabel !== (settings.customDns?.label ?? '');
  const canValidateCustomDns =
    customDnsDraftIp.length > 0 &&
    isValidCustomDnsIpv4(customDnsDraftIp) &&
    customDnsDirty;

  const commitCustomDns = () => {
    const ip = customDnsDraftIp;
    const label = customDnsDraftLabel;
    if (!ip) {
      if (settings.customDns !== null) {
        updateSettings({ customDns: null });
      }
      return;
    }
    if (!isValidCustomDnsIpv4(ip)) return;
    const current = settings.customDns;
    if (current?.ip === ip && current.label === label) return;
    updateSettings({ customDns: { ip, label } });
    showToast('Serveur personnel mémorisé');
  };

  const handleCustomDnsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canValidateCustomDns) {
      e.preventDefault();
      commitCustomDns();
    }
  };

  const clearCustomDns = () => {
    setCustomIpDraft('');
    setCustomLabelDraft('');
    updateSettings({ customDns: null });
    showToast('Serveur personnel retiré');
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      showToast('Confirmez une seconde fois pour tout effacer', 'warning');
      return;
    }

    const defaultSettings: AppSettings = {
      refreshInterval: 2000,
      dnsInterval: 15000,
      sakuraIntensity: 'medium',
      sakuraColor: 'pink',
      enableGlassmorphicBlur: true,
      backgroundAura: 'full',
      neonGlow: 'balanced',
      calmMotion: false,
      dnsChecklist: [...DEFAULT_DNS_CHECKLIST],
      customDns: null,
      simplifiedMode: true,
      minimizeToTray: false,
      launchAtStartup: false,
      ambientMusicMuted: false,
      zenMetricsVisible: true,
      alertThresholds: { ...DEFAULT_ALERT_THRESHOLDS },
    };
    updateSettings(defaultSettings);

    syncGlassBlurClass(defaultSettings.enableGlassmorphicBlur);
    setConfirmReset(false);
    showToast('Tout revient à l\'essentiel');
  };

  const handleDesktopSensitivity = (sensitivity: AlertDesktopSensitivity) => {
    updateSettings({
      alertThresholds: {
        ...settings.alertThresholds,
        desktop: applyDesktopSensitivity(sensitivity),
      },
    });
    showToast('Seuil de veille mémorisé');
  };

  const handleGamingNetworkAlerts = (networkAlerts: boolean) => {
    updateSettings({
      alertThresholds: {
        ...settings.alertThresholds,
        gaming: applyGamingNetworkAlerts(networkAlerts),
      },
    });
    showToast('Préférence mémorisée');
  };

  const desktopSensitivity = inferDesktopSensitivity(settings.alertThresholds.desktop);
  const gamingNetworkAlerts = isGamingNetworkAlertsEnabled(settings.alertThresholds.gaming);
  const atmospherePreset = inferAtmospherePreset(settings);
  const alertsEnabled = settings.alertThresholds.enabled;

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const nextSettings = { ...settings, [key]: value };
    const reachedMaxAtmosphere =
      isMaxAtmosphereProfile(nextSettings) && !isMaxAtmosphereProfile(settings);

    updateSettings({ [key]: value });

    if (key === 'enableGlassmorphicBlur') {
      syncGlassBlurClass(Boolean(value));
    }
    if (reachedMaxAtmosphere) {
      showToast(MAX_ATMOSPHERE_TOAST, 'warning');
      return;
    }
    if (key === 'simplifiedMode') {
      if (value) {
        showToast('Mode essentiel activé. Analyse en cours');
      } else {
        showToast('Analyse complète en cours. Comptez une à deux minutes', 'warning');
      }
    } else {
      showToast('Préférence mémorisée');
    }
  };

  const handleAtmospherePreset = (id: AtmospherePresetId) => {
    const patch = applyAtmospherePreset(id);
    const nextSettings = { ...settings, ...patch };
    const reachedMaxAtmosphere =
      isMaxAtmosphereProfile(nextSettings) && !isMaxAtmosphereProfile(settings);

    updateSettings(patch);
    syncGlassBlurClass(Boolean(patch.enableGlassmorphicBlur));

    if (reachedMaxAtmosphere) {
      showToast(MAX_ATMOSPHERE_TOAST, 'warning');
      return;
    }
    showToast('Préférence mémorisée');
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, tabId: TabId) => {
    const currentIndex = tabs.findIndex((t) => t.id === tabId);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveTab(tabs[(currentIndex + 1) % tabs.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
    }
  };

  const panelMotion = {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0 },
  };

  const tabContentClass =
    activeTab === 'about'
      ? 'overflow-visible'
      : 'overflow-y-auto min-h-0';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-sm z-50"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,44rem)] z-50 px-4"
          >
            <div className="bento-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
                <h2 id="settings-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
                  Paramètres
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Fermer les paramètres"
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex min-h-[26rem]">
                <nav
                  role="tablist"
                  aria-label="Catégories de paramètres"
                  className="w-[7.25rem] shrink-0 border-r border-[var(--border)] p-2 flex flex-col gap-1 bg-[var(--surface-inset)]/40"
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                      aria-controls={`tabpanel-${tab.id}`}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer min-h-[3.25rem] ${
                        activeTab === tab.id
                          ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25'
                          : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {tab.icon}
                      <span className="leading-tight text-center">{tab.label}</span>
                    </button>
                  ))}
                </nav>

                <div className="flex-1 flex flex-col min-w-0">
                  <div className={`flex-1 px-5 py-4 ${tabContentClass}`}>
                    {activeTab === 'general' && (
                      <motion.div
                        role="tabpanel"
                        id="tabpanel-general"
                        aria-labelledby="tab-general"
                        {...panelMotion}
                      >
                        <SettingRow label="Cadence" hint="À quelle vitesse Koi lit votre machine">
                          <SegmentControl
                            compact
                            options={REFRESH_OPTIONS}
                            value={settings.refreshInterval}
                            onChange={(v) => handleSettingChange('refreshInterval', v)}
                            ariaLabel="Cadence de lecture des métriques"
                          />
                        </SettingRow>
                        <NeonSwitch
                          checked={settings.simplifiedMode}
                          onChange={(v) => handleSettingChange('simplifiedMode', v)}
                          label="Pilotes essentiels"
                          hint="Trois regards suffisent. L'analyse complète demande un moment de recueil"
                        />
                        <NeonSwitch
                          checked={settings.launchAtStartup}
                          onChange={(v) => handleSettingChange('launchAtStartup', v)}
                          label="Éveil avec Windows"
                          hint="Koi vous accompagne dès l'ouverture de session"
                        />
                        <NeonSwitch
                          checked={settings.minimizeToTray}
                          onChange={(v) => handleSettingChange('minimizeToTray', v)}
                          label="Présence discrète"
                          hint="Fermer masque l'app. Un clic dans la barre la réveille"
                        />
                      </motion.div>
                    )}

                    {activeTab === 'visual' && (
                      <motion.div
                        role="tabpanel"
                        id="tabpanel-visual"
                        aria-labelledby="tab-visual"
                        {...panelMotion}
                        className="space-y-3"
                      >
                        <div className="pb-1">
                          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-subtle)] mb-1">
                            Préréglage Koi
                          </p>
                          <SegmentControl
                            wrap
                            compact
                            options={ATMOSPHERE_PRESET_SEGMENT}
                            value={atmospherePreset}
                            onChange={handleAtmospherePreset}
                            ariaLabel="Préréglage d'atmosphère Koi"
                          />
                          <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-snug">
                            Un geste pour l&apos;ambiance — affinez en dessous si besoin
                          </p>
                        </div>

                        <SettingSection title="Lumière">
                          <SettingRow label="Thème" hint="Clair pour le jour, sombre pour la nuit">
                            <SegmentControl
                              compact
                              options={THEME_OPTIONS}
                              value={theme}
                              onChange={(v) => setTheme(v)}
                              ariaLabel="Thème de l'application"
                            />
                          </SettingRow>
                        </SettingSection>

                        <SettingSection title="Nature">
                          <SettingRow label="Sakura" hint="Pétales flottants en fond d'écran">
                            <SegmentControl
                              compact
                              options={SAKURA_OPTIONS}
                              value={settings.sakuraIntensity}
                              onChange={(v) => handleSettingChange('sakuraIntensity', v)}
                              ariaLabel="Intensité des pétales Sakura"
                            />
                          </SettingRow>
                          {settings.sakuraIntensity !== 'off' && (
                            <SettingRow label="Teinte Sakura" hint="La couleur du vent et des touches de l'interface">
                              <SegmentControl
                                compact
                                options={SAKURA_COLOR_OPTIONS}
                                value={settings.sakuraColor || 'pink'}
                                onChange={(v) => handleSettingChange('sakuraColor', v)}
                                ariaLabel="Teinte des pétales Sakura"
                              />
                            </SettingRow>
                          )}
                        </SettingSection>

                        <SettingSection title="Ambiance">
                          <NeonSwitch
                            checked={settings.enableGlassmorphicBlur}
                            onChange={(v) => handleSettingChange('enableGlassmorphicBlur', v)}
                            label="Verre dépoli"
                            hint="Effet cristal sur les panneaux. Sans lui, l'interface gagne en légèreté"
                          />
                          <SettingRow label="Aura de fond" hint="Brume colorée derrière l'interface. Aucune pour un fond plus neutre">
                            <SegmentControl
                              compact
                              options={BACKGROUND_AURA_SEGMENT}
                              value={settings.backgroundAura}
                              onChange={(v) => handleSettingChange('backgroundAura', v)}
                              ariaLabel="Aura de fond"
                            />
                          </SettingRow>
                          <SettingRow label="Lueur néon" hint="Intensité des reflets sur les chiffres et badges">
                            <SegmentControl
                              compact
                              options={NEON_GLOW_SEGMENT}
                              value={settings.neonGlow}
                              onChange={(v) => handleSettingChange('neonGlow', v)}
                              ariaLabel="Lueur néon"
                            />
                          </SettingRow>
                          <NeonSwitch
                            checked={settings.calmMotion}
                            onChange={(v) => handleSettingChange('calmMotion', v)}
                            label="Animations calmes"
                            hint="Moins de mouvement à l'écran, même si Windows autorise les effets"
                          />
                        </SettingSection>
                      </motion.div>
                    )}

                    {activeTab === 'network' && (
                      <motion.div
                        role="tabpanel"
                        id="tabpanel-network"
                        aria-labelledby="tab-network"
                        {...panelMotion}
                        className="space-y-3"
                      >
                        <SettingRow label="Rythme DNS" hint="Fréquence des contrôles réseau">
                          <SegmentControl
                            compact
                            options={DNS_OPTIONS}
                            value={settings.dnsInterval}
                            onChange={(v) => handleSettingChange('dnsInterval', v)}
                            ariaLabel="Rythme des contrôles DNS"
                          />
                        </SettingRow>
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                            Serveurs observés
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {POPULAR_DNS_SERVERS.map((dns) => (
                              <DnsCheckbox
                                key={dns.name}
                                label={dns.name}
                                description={dns.ip}
                                checked={settings.dnsChecklist.includes(dns.name)}
                                onChange={(checked) => handleDnsToggle(dns.name, checked)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-inset)] p-3">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] leading-snug">
                                Serveur personnel
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                                Un DNS de confiance, chez vous. L&apos;adresse suffit, Koi s&apos;en souvient
                              </p>
                            </div>
                            {settings.customDns && (
                              <button
                                type="button"
                                onClick={clearCustomDns}
                                className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer px-2 py-1 -mr-1 -mt-0.5"
                              >
                                Effacer
                              </button>
                            )}
                          </div>
                          <div className="space-y-2.5">
                            <div>
                              <label
                                htmlFor="custom-dns-ip"
                                className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5"
                              >
                                Adresse
                              </label>
                              <div className="flex gap-2 items-start">
                                <div className="flex-1 min-w-0">
                                  <input
                                    id="custom-dns-ip"
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    spellCheck={false}
                                    placeholder="192.168.1.1 · chez vous, en exemple"
                                    value={customIpDraft}
                                    onChange={(e) => setCustomIpDraft(e.target.value)}
                                    onKeyDown={handleCustomDnsKeyDown}
                                    aria-invalid={customIpError ? true : undefined}
                                    aria-describedby={customIpError ? 'custom-dns-ip-error' : undefined}
                                    className={customDnsIpInputClass}
                                  />
                                  {customIpError && (
                                    <p
                                      id="custom-dns-ip-error"
                                      className="text-[11px] text-amber-600 dark:text-amber-400 mt-1"
                                    >
                                      {customIpError}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={commitCustomDns}
                                  disabled={!canValidateCustomDns}
                                  aria-label="Valider le serveur DNS personnel"
                                  className="shrink-0 h-10 px-4 rounded-xl text-xs font-semibold transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90"
                                >
                                  Valider
                                </button>
                              </div>
                            </div>
                            <div>
                              <label
                                htmlFor="custom-dns-label"
                                className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5"
                              >
                                Surnom
                                <span className="font-normal opacity-70"> · optionnel</span>
                              </label>
                              <input
                                id="custom-dns-label"
                                type="text"
                                maxLength={24}
                                autoComplete="off"
                                placeholder="Pi-hole · Ma box · un mot pour l'accueillir"
                                value={customLabelDraft}
                                onChange={(e) => setCustomLabelDraft(e.target.value)}
                                onKeyDown={handleCustomDnsKeyDown}
                                className={customDnsInputClass}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'alerts' && (
                      <motion.div
                        role="tabpanel"
                        id="tabpanel-alerts"
                        aria-labelledby="tab-alerts"
                        {...panelMotion}
                      >
                        <NeonSwitch
                          checked={alertsEnabled}
                          onChange={(enabled) => {
                            updateSettings({
                              alertThresholds: {
                                ...settings.alertThresholds,
                                enabled,
                              },
                            });
                            showToast('Préférence mémorisée');
                          }}
                          label="Veille Koi"
                          hint="Signaux calmes en bas de l'écran. Jamais de fenêtre intrusive"
                        />
                        {alertsEnabled && (
                          <>
                            <div className="py-3 border-b border-[var(--border)]">
                              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                                Sensibilité
                              </p>
                              <SegmentControl
                                wrap
                                compact
                                options={ALERT_SENSITIVITY_SEGMENT}
                                value={desktopSensitivity}
                                onChange={handleDesktopSensitivity}
                                ariaLabel="Sensibilité de la veille"
                              />
                              <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-snug">
                                Koi s'accorde à votre rythme, au bureau comme en jeu
                              </p>
                            </div>
                            <NeonSwitch
                              checked={gamingNetworkAlerts}
                              onChange={handleGamingNetworkAlerts}
                              label="Latence en jeu"
                              hint="Un signe si le ping s'éloigne de l'habitude en session de jeu"
                            />
                          </>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'about' && (
                      <motion.div
                        role="tabpanel"
                        id="tabpanel-about"
                        aria-labelledby="tab-about"
                        {...panelMotion}
                        className="flex flex-col items-center justify-center h-full text-center gap-2 py-1 overflow-visible"
                      >
                        <SlashTitle
                          key={`about-slash-${aboutSlashKey}`}
                          size="md"
                          reducedMotion={prefersReducedMotion ?? false}
                          className="mx-auto max-w-[11rem] !pt-0 !pb-0"
                          onSecretTap={onEasterSecretTap}
                        />
                        <div className="mt-5 flex flex-col items-center gap-2 w-full">
                          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--accent-text)]">
                            Merci de garder Koi avec vous
                          </p>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[18rem]">
                            Votre machine lue avec tendresse. Charge, connexion, pilotes et veille
                            discrète, au bureau comme en jeu. Pensé pour Windows, léger, fiable,
                            tout simplement.
                          </p>
                          <DonateButton
                            reducedMotion={prefersReducedMotion ?? false}
                            onClick={() =>
                              showToast('Lien de don bientôt disponible — merci pour le geste.')
                            }
                          />
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                            Tauri · React · Rust
                          </p>
                          <p className="text-[10px] font-bold tracking-[0.24em] mono-text text-[var(--text-subtle)]">
                            v1.0.0
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="shrink-0 px-5 py-3 border-t border-[var(--border)] space-y-2">
                    <AnimatePresence initial={false}>
                      {toast && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            role="status"
                            aria-live="polite"
                            className={`px-3 py-2 rounded-xl shadow-md border text-xs font-semibold flex items-center justify-center gap-2 ${toastToneClass(toast.type)}`}
                          >
                            <span>{toast.message}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-end">
                      <button
                        onClick={handleReset}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          confirmReset
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : 'text-[var(--accent-text)] hover:bg-[var(--accent)]/10'
                        }`}
                      >
                        <RotateCcw size={13} className={confirmReset ? 'animate-spin' : ''} />
                        {confirmReset ? 'Vraiment effacer ?' : 'Tout effacer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
