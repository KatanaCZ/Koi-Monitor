import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Sun, Moon, Maximize2, Settings, Flower } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../store';
import { SlashTitle } from '../common/SlashTitle';

interface TitleBarProps {
  title: string;
  onOpenSettings?: () => void;
  playSlashAnimation?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  title,
  onOpenSettings,
  playSlashAnimation = true,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const zenMode = useAppStore((s) => s.zenMode);
  const setTheme = useAppStore((s) => s.setTheme);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
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
    const window = getCurrentWindow();
    await window.close();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.div
      className="h-12 flex items-center justify-between px-4 liquid-glass rounded-2xl shrink-0 overflow-visible"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ stiffness: 100, damping: 20, type: "spring" }}
      data-tauri-drag-region
    >
      <div className="flex items-center min-w-0 pointer-events-none overflow-visible">
        {playSlashAnimation ? (
          <SlashTitle
            key="titlebar-slash"
            size="sm"
            reducedMotion={prefersReducedMotion ?? false}
            className="!pt-0 !pb-0 w-auto min-w-[6.75rem]"
          />
        ) : (
          <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ rotate: 45, scale: 1.05 }}
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
              ? 'bg-[var(--neon-pink)] text-white shadow-lg shadow-[var(--neon-pink)]/30 mr-1' 
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
          title="Réduire"
          aria-label="Réduire la fenêtre"
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
          title="Fermer"
          aria-label="Fermer la fenêtre de l'application"
        >
          <X size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
};