import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Sun, Moon, Maximize2, Settings, Flower, Bell, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store';
import { hideToTray } from '../../utils/systemTray';
import { SlashTitle } from '../common/SlashTitle';
import { SystemUptimeChip } from '../common/SystemUptimeChip';
import { selectUnreadAlertCount } from '../../utils/notificationLog';

interface TitleBarProps {
  title: string;
  onOpenSettings?: () => void;
  ambientMusicMuted?: boolean;
  onToggleAmbientMute?: () => void;
  onEasterSecretTap?: () => void;
}

/** Même largeur et marge haute que le bandeau dashboard (`max-w-7xl` + gouttières + `pt-6`). */
export const TITLE_BAR_SHELL_CLASS =
  'w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 shrink-0';

export const TitleBar: React.FC<TitleBarProps> = ({
  title,
  onOpenSettings,
  ambientMusicMuted = true,
  onToggleAmbientMute,
  onEasterSecretTap,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const zenMode = useAppStore((s) => s.zenMode);
  const minimizeToTray = useAppStore((s) => s.settings.minimizeToTray);
  const setTheme = useAppStore((s) => s.setTheme);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const notificationPanelOpen = useAppStore((s) => s.notificationPanelOpen);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const unreadAlertCount = useAppStore((s) => selectUnreadAlertCount(s.notificationLog));

  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    if (minimizeToTray) {
      await hideToTray();
      return;
    }
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
    const maximized = await window.isMaximized();
    setIsMaximized(maximized);
  };

  const handleClose = async () => {
    if (minimizeToTray) {
      await hideToTray();
      return;
    }
    const window = getCurrentWindow();
    await window.close();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.div
      className="h-12 w-full flex items-center justify-between px-4 liquid-glass rounded-2xl shrink-0 overflow-visible"
      initial={zenMode ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={
        zenMode
          ? { duration: 0 }
          : { stiffness: 100, damping: 20, type: 'spring' }
      }
      data-tauri-drag-region
    >
      <div className="flex items-center min-w-0 overflow-visible shrink-0">
        <SlashTitle
          variant="static"
          size="sm"
          className="w-auto min-w-[6.75rem] pointer-events-auto"
          onSecretTap={onEasterSecretTap}
        />
        <span className="sr-only">{title}</span>
      </div>

      {!zenMode ? (
        <div
          className="flex flex-1 justify-center min-w-0 px-2 pointer-events-none"
          data-tauri-drag-region
        >
          <SystemUptimeChip />
        </div>
      ) : (
        <div className="flex-1 min-w-0" data-tauri-drag-region />
      )}

      <div className="flex items-center gap-1 shrink-0">
        <nav aria-label="Actions de la fenêtre" className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleAmbientMute}
          aria-pressed={!ambientMusicMuted}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            !ambientMusicMuted
              ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-text)] hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
          }`}
          title={ambientMusicMuted ? 'Activer la musique ambiante' : 'Couper la musique ambiante'}
          aria-label={ambientMusicMuted ? 'Activer la musique ambiante' : 'Couper la musique ambiante'}
        >
          {ambientMusicMuted ? (
            <VolumeX size={16} />
          ) : (
            <Volume2 size={16} className={!calmMotion ? 'animate-pulse' : ''} />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          aria-expanded={notificationPanelOpen}
          aria-haspopup="dialog"
          className={`relative w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            notificationPanelOpen || unreadAlertCount > 0
              ? 'bg-[color-mix(in_srgb,var(--neon-green)_14%,transparent)] text-[var(--neon-green-text)] hover:bg-[color-mix(in_srgb,var(--neon-green)_20%,transparent)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
          }`}
          title="Journal de veille"
          aria-label={
            unreadAlertCount > 0
              ? `Journal de veille, ${unreadAlertCount} signaux manqués`
              : 'Journal de veille'
          }
        >
          <Bell size={16} />
          {unreadAlertCount > 0 && (
            <span className="absolute top-2 right-2 min-w-[1rem] h-4 px-1 rounded-full bg-[var(--neon-green)] text-[#041510] text-[10px] font-bold leading-4 text-center">
              {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
            </span>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSettings}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Paramètres"
          aria-label="Ouvrir les paramètres"
        >
          <Settings size={16} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setZenMode(!zenMode)}
          aria-pressed={zenMode}
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
            zenMode 
              ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 mr-1' 
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] mr-1'
          }`}
          title={zenMode ? "Désactiver le mode Zen" : "Activer le mode Zen"}
          aria-label={zenMode ? "Désactiver le mode Zen" : "Activer le mode Zen"}
        >
          <Flower size={16} className={zenMode ? "animate-pulse" : ""} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Changer de thème"
          aria-label="Changer de thème de l'application"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          title={minimizeToTray ? 'Masquer dans la barre des tâches' : 'Réduire'}
          aria-label={minimizeToTray ? 'Masquer dans la barre des tâches' : 'Réduire la fenêtre'}
        >
          <Minus size={16} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMaximize}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
          title={isMaximized ? "Restaurer" : "Agrandir"}
          aria-label={isMaximized ? "Restaurer la taille de la fenêtre" : "Agrandir la fenêtre"}
        >
          {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-500 hover:text-white transition-colors ml-1"
          title={minimizeToTray ? 'Masquer dans la barre des tâches' : 'Fermer'}
          aria-label={minimizeToTray ? 'Masquer dans la barre des tâches' : 'Fermer la fenêtre de l\'application'}
        >
          <X size={16} />
        </motion.button>
        </nav>
      </div>
    </motion.div>
  );
};