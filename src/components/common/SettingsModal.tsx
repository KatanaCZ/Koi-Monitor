import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Monitor, Eye, Wifi, Info } from 'lucide-react';
import { useAppStore } from '../../store';
import type { AppSettings } from '../../types';

type TabId = 'general' | 'visual' | 'network' | 'about';

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

const REFRESH_OPTIONS = [
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
];

const DNS_OPTIONS = [
  { value: 10000, label: '10s' },
  { value: 15000, label: '15s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1min' },
];

const SAKURA_OPTIONS: { value: AppSettings['sakuraIntensity']; label: string }[] = [
  { value: 'off', label: 'Désactivé' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
];

const SegmentControl: <T extends string | number>(props: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => React.ReactElement = ({ options, value, onChange }) => (
  <div className="inline-flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl gap-1">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
          value === option.value
            ? 'bg-[var(--neon-pink)] text-white shadow-lg shadow-[var(--neon-pink)]/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
        <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
      )}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
        checked ? 'bg-[var(--neon-pink)]' : 'bg-slate-300 dark:bg-slate-700'
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
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 py-2 cursor-pointer group"
  >
    <div
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
        checked
          ? 'bg-[var(--neon-pink)] border-[var(--neon-pink)]'
          : 'border-slate-400 dark:border-slate-600 group-hover:border-[var(--neon-pink)]'
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
    <span className="text-sm text-[var(--foreground)]">{label}</span>
  </button>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { settings, updateSettings } = useAppStore();

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      refreshInterval: 2000,
      dnsInterval: 15000,
      sakuraIntensity: 'medium',
      enableGlassmorphicBlur: true,
      dnsChecklist: ['Google', 'Cloudflare', 'Quad9', 'OpenDNS'],
      simplifiedMode: true,
    };
    updateSettings(defaultSettings);

    // Update no-blur class
    if (defaultSettings.enableGlassmorphicBlur) {
      document.documentElement.classList.remove('no-blur');
    } else {
      document.documentElement.classList.add('no-blur');
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });

    if (key === 'enableGlassmorphicBlur') {
      if (value) {
        document.documentElement.classList.remove('no-blur');
      } else {
        document.documentElement.classList.add('no-blur');
      }
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="bento-card p-6 max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Paramètres
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-slate-200/30 dark:bg-slate-800/30 p-1 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[var(--neon-pink)] text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto space-y-6">
                {activeTab === 'general' && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">
                        Intervalle de rafraîchissement
                      </label>
                      <div className="flex justify-start">
                        <SegmentControl
                          options={REFRESH_OPTIONS}
                          value={settings.refreshInterval}
                          onChange={(v) => handleSettingChange('refreshInterval', v)}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
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
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fréquence de ping vers les serveurs DNS
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <NeonSwitch
                        checked={settings.simplifiedMode}
                        onChange={(v) => handleSettingChange('simplifiedMode', v)}
                        label="Mode simplifié"
                        description="Afficher uniquement les métriques principales"
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'visual' && (
                  <motion.div
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
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nombre de pétales animées (impacte les performances GPU)
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <NeonSwitch
                        checked={settings.enableGlassmorphicBlur}
                        onChange={(v) => handleSettingChange('enableGlassmorphicBlur', v)}
                        label="Effet de flou Glassmorphism"
                        description="Active le flou d'arrière-plan pour un effet premium"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Désactiver améliore les performances sur les PC modestes
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'network' && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                      <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
                        Serveurs DNS actifs
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Les serveurs DNS à ping sont configurés dans le widget Réseau
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                      <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
                        Filtrage par catégorie
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Activez/désactivez les catégories de pilotes dans l'onglet Général
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'about' && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="text-center py-6">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--neon-pink)]/30">
                        <span className="text-2xl text-white font-bold">K</span>
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">
                        Koi Monitor
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Version 1.0.0
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Application de monitoring système avec une interface glassmorphique
                        et des animations Sakura apaisantes.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Conçu avec Tauri, React, et Tailwind CSS
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--neon-pink)] hover:bg-[var(--neon-pink)]/10 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Réinitialiser
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};