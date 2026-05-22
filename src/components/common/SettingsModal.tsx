import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, RotateCcw, Monitor, Eye, Wifi, Info } from 'lucide-react';
import { useAppStore } from '../../store';
import { AppSettings, POPULAR_DNS_SERVERS, DEFAULT_DNS_CHECKLIST, normalizeDnsChecklist } from '../../types';
import { syncGlassBlurClass } from '../../utils/glassBlur';
import { REFRESH_OPTIONS, DNS_OPTIONS } from '../../utils/settingsOptions';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { SlashTitle } from './SlashTitle';

type TabId = 'general' | 'visual' | 'network' | 'about';

export type SettingsTabId = TabId;

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'general', label: 'Général', icon: <Monitor size={14} /> },
  { id: 'visual', label: 'Visuel', icon: <Eye size={14} /> },
  { id: 'network', label: 'Réseau & DNS', icon: <Wifi size={14} /> },
  { id: 'about', label: 'À propos', icon: <Info size={14} /> },
];

const SAKURA_OPTIONS: { value: AppSettings['sakuraIntensity']; label: string }[] = [
  { value: 'off', label: 'Désactivé' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
];

const SAKURA_COLOR_OPTIONS: { value: AppSettings['sakuraColor']; label: string }[] = [
  { value: 'pink', label: 'Rose Sakura' },
  { value: 'purple', label: 'Violet Fuji' },
  { value: 'blue', label: 'Bleu Néon' },
  { value: 'green', label: 'Menthe' },
];

const THEME_OPTIONS = [
  { value: 'dark' as const, label: 'Sombre' },
  { value: 'light' as const, label: 'Clair' },
];

const SegmentControl: <T extends string | number>(props: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) => React.ReactElement = ({ options, value, onChange, ariaLabel }) => (
  <div role="radiogroup" aria-label={ariaLabel} className="inline-flex bg-[var(--surface-inset)] p-1 rounded-xl gap-1">
    {options.map((option, index) => (
      <button
        key={option.value}
        role="radio"
        aria-checked={value === option.value}
        tabIndex={value === option.value ? 0 : -1}
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
        className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
          value === option.value
            ? 'bg-[var(--neon-pink)] text-white shadow-lg shadow-[var(--neon-pink)]/30'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const NeonSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      {description && (
        <span className="text-xs text-[var(--text-muted)]">{description}</span>
      )}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
        checked ? 'bg-[var(--neon-pink)]' : 'bg-[var(--surface-muted)]'
      }`}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

const CheckboxItem: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <button
    role="checkbox"
    aria-checked={checked}
    aria-label={description ? `${label} (${description})` : label}
    onClick={() => onChange(!checked)}
    className="flex items-start gap-2 py-2 cursor-pointer group w-full min-w-0 text-left"
  >
    <div
      className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
        checked
          ? 'bg-[var(--neon-pink)] border-[var(--neon-pink)]'
          : 'border-[var(--border-strong)] group-hover:border-[var(--neon-pink)]'
      }`}
    >
      {checked && (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </motion.svg>
      )}
    </div>
    <span className="flex-1 min-w-0">
      <span className="block text-sm text-[var(--foreground)] leading-snug">{label}</span>
      {description && (
        <span className="block text-xs text-[var(--text-muted)] mono-text leading-snug mt-0.5">
          {description}
        </span>
      )}
    </span>
  </button>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aboutSlashKey, setAboutSlashKey] = useState(0);
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
  }, [isOpen, initialTab]);

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
      showToast("Au moins un serveur DNS doit rester actif", "warning");
      return;
    }
    updateSettings({ dnsChecklist: newList });
    showToast(`DNS ${name} ${checked ? 'ajouté' : 'retiré'}`);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      showToast("Cliquez à nouveau pour confirmer la réinitialisation", "warning");
      return;
    }

    const defaultSettings: AppSettings = {
      refreshInterval: 2000,
      dnsInterval: 15000,
      sakuraIntensity: 'medium',
      sakuraColor: 'pink',
      enableGlassmorphicBlur: true,
      dnsChecklist: [...DEFAULT_DNS_CHECKLIST],
      simplifiedMode: true,
    };
    updateSettings(defaultSettings);

    syncGlassBlurClass(defaultSettings.enableGlassmorphicBlur);
    setConfirmReset(false);
    showToast("Paramètres réinitialisés avec succès !");
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });

    if (key === 'enableGlassmorphicBlur') {
      syncGlassBlurClass(Boolean(value));
    }
    if (key === 'simplifiedMode') {
      if (value) {
        showToast('Mode pilotes essentiels activé — rescan en cours');
      } else {
        showToast(
          "Mode étendu activé — l'analyse complète peut prendre 1 à 2 minutes",
          'warning',
        );
      }
    } else {
      showToast("Option enregistrée instantanément !");
    }
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="bento-card p-6 max-h-[85vh] flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
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

              {/* Tabs */}
              <div
                role="tablist"
                aria-label="Catégories de paramètres"
                className="flex gap-1 mb-6 bg-[var(--surface-inset)] p-1 rounded-xl"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`tabpanel-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] ${
                      activeTab === tab.id
                        ? 'bg-[var(--neon-pink)] text-white shadow-lg'
                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
                {activeTab === 'general' && (
                  <motion.div
                    role="tabpanel"
                    id="tabpanel-general"
                    aria-labelledby="tab-general"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Thème de l'application
                      </label>
                      <div className="flex justify-start">
                        <SegmentControl
                          options={THEME_OPTIONS}
                          value={theme}
                          onChange={(v) => setTheme(v)}
                          ariaLabel="Thème de l'application"
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Personnalisez l'ambiance visuelle globale de l'interface
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Intervalle de rafraîchissement
                      </label>
                      <div className="flex justify-start">
                        <SegmentControl
                          options={REFRESH_OPTIONS}
                          value={settings.refreshInterval}
                          onChange={(v) => handleSettingChange('refreshInterval', v)}
                          ariaLabel="Intervalle de rafraîchissement des métriques"
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Fréquence de mise à jour des métriques système
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Intervalle DNS
                      </label>
                      <div className="flex justify-start">
                        <SegmentControl
                          options={DNS_OPTIONS}
                          value={settings.dnsInterval}
                          onChange={(v) => handleSettingChange('dnsInterval', v)}
                          ariaLabel="Intervalle de test du ping DNS"
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Fréquence de ping vers les serveurs DNS
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                      <NeonSwitch
                        checked={settings.simplifiedMode}
                        onChange={(v) => handleSettingChange('simplifiedMode', v)}
                        label="Mode Pilotes simplifiés"
                        description={
                          settings.simplifiedMode
                            ? "N'afficher que les pilotes essentiels (GPU, Réseau, Bluetooth)"
                            : "Analyse étendue (audio, stockage, iGPU…) — le rescan peut prendre 1 à 2 min."
                        }
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'visual' && (
                  <motion.div
                    role="tabpanel"
                    id="tabpanel-visual"
                    aria-labelledby="tab-visual"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Intensité Sakura
                      </label>
                      <div className="flex justify-start">
                        <SegmentControl
                          options={SAKURA_OPTIONS}
                          value={settings.sakuraIntensity}
                          onChange={(v) => handleSettingChange('sakuraIntensity', v)}
                          ariaLabel="Intensité des pétales Sakura animés"
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Nombre de pétales animées (impacte les performances GPU)
                      </p>
                    </div>

                    {settings.sakuraIntensity !== 'off' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-4 border-t border-[var(--border)] space-y-3 overflow-hidden"
                      >
                        <label className="text-sm font-medium text-[var(--foreground)]">
                          Couleur des pétales
                        </label>
                        <div className="flex justify-start">
                          <SegmentControl
                            options={SAKURA_COLOR_OPTIONS}
                            value={settings.sakuraColor || 'pink'}
                            onChange={(v) => handleSettingChange('sakuraColor', v)}
                            ariaLabel="Couleur des pétales Sakura"
                          />
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Sélectionnez la couleur des pétales Sakura animés en arrière-plan
                        </p>
                      </motion.div>
                    )}

                    <div className="pt-4 border-t border-[var(--border)]">
                      <NeonSwitch
                        checked={settings.enableGlassmorphicBlur}
                        onChange={(v) => handleSettingChange('enableGlassmorphicBlur', v)}
                        label="Effet de flou Glassmorphism"
                        description="Flou vitré sur cartes, panneaux et modales (sombre & clair)"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Désactiver améliore les performances sur les PC modestes
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'network' && (
                  <motion.div
                    role="tabpanel"
                    id="tabpanel-network"
                    aria-labelledby="tab-network"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Serveurs DNS à interroger
                      </label>
                      <p className="text-xs text-[var(--text-muted)]">
                        Sélectionnez les serveurs DNS à inclure dans les tests de latence en temps réel :
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)]">
                        {POPULAR_DNS_SERVERS.map((dns) => {
                          const isChecked = settings.dnsChecklist.includes(dns.name);
                          return (
                            <CheckboxItem
                              key={dns.name}
                              label={dns.name}
                              description={dns.ip}
                              checked={isChecked}
                              onChange={(checked) => handleDnsToggle(dns.name, checked)}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] text-xs text-[var(--neon-cyan-text)] space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5">
                        <Info size={14} /> Latence DNS
                      </h4>
                      <p>
                        Les serveurs activés sont testés en parallèle. Celui qui
                        affiche la latence la plus faible est identifié sur le
                        tableau de bord.
                      </p>
                      <p>
                        Désactiver un serveur exclut son test et le retire de
                        l&apos;affichage.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'about' && (
                  <motion.div
                    role="tabpanel"
                    id="tabpanel-about"
                    aria-labelledby="tab-about"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="text-center py-4 overflow-visible">
                      <SlashTitle
                        key={`about-slash-${aboutSlashKey}`}
                        size="md"
                        reducedMotion={prefersReducedMotion ?? false}
                        className="mx-auto max-w-xs"
                      />
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] space-y-3">
                      <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
                        Solution de supervision système pour Windows&nbsp;11. Visibilité
                        en temps réel sur les performances, le réseau et l’état du poste,
                        dans une expérience desktop native et soignée.
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-center text-[var(--text-subtle)] leading-relaxed">
                        Développé avec Tauri, React et Rust
                      </p>
                      <p className="text-[10px] uppercase font-bold tracking-[0.28em] mono-text text-center text-[var(--text-subtle)] pt-3 border-t border-[var(--border)]">
                        Version 1.0.0
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-[var(--border)] shrink-0 space-y-4">
                <AnimatePresence initial={false}>
                  {toast && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                      className="overflow-hidden"
                    >
                      <div
                        role="status"
                        aria-live="polite"
                        className={`px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center justify-center gap-2.5 backdrop-blur-md ${
                          toast.type === 'warning'
                            ? 'bg-amber-500/90 dark:bg-amber-500/80 border-amber-400/30 text-white shadow-amber-500/20'
                            : 'bg-emerald-500/90 dark:bg-emerald-500/80 border-emerald-400/30 text-white shadow-emerald-500/20'
                        }`}
                      >
                        {toast.type === 'warning' ? (
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>{toast.message}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end">
                  <button
                    onClick={handleReset}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      confirmReset
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'
                        : 'text-[var(--neon-pink-text)] hover:bg-[var(--neon-pink)]/10'
                    }`}
                  >
                    <RotateCcw size={14} className={confirmReset ? 'animate-spin' : ''} />
                    {confirmReset ? 'Confirmer la réinitialisation ?' : 'Réinitialiser'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};