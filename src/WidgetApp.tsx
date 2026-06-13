import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store';
import { useTelemetryPoller } from './hooks/useTelemetryPoller';
import { invoke } from '@tauri-apps/api/core';

import { PillContainer } from './components/widget/PillContainer';
import { KoiPill } from './components/widget/KoiPill';
import { ZenPill } from './components/widget/ZenPill';

import { useStorageSync } from './hooks/useStorageSync';

const WidgetApp: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const widgetMode = useAppStore((s) => s.settings.desktopWidgetMode);
  
  // Passive telemetry hook (it sets up listeners for telemetry-update but DNS ping is driven by Main window)
  useTelemetryPoller();
  useStorageSync();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle closing the widget
  const handleClose = async () => {
    try {
      await invoke('close_widget_view');
      // Update store so settings reflect that user closed it manually
      useAppStore.getState().updateSettings({ showDesktopWidget: false });
    } catch (e) {
      console.error('Failed to close widget', e);
    }
  };

  // Handle opening the main window
  const handleOpenMain = async () => {
    try {
      await invoke('open_main_window');
    } catch (e) {
      console.error('Failed to open main window', e);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <PillContainer onClose={handleClose} onOpenMain={handleOpenMain}>
        <AnimatePresence mode="wait">
          {widgetMode === 'koi' ? (
            <motion.div
              key="koi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <KoiPill />
            </motion.div>
          ) : (
            <motion.div
              key="zen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ZenPill />
            </motion.div>
          )}
        </AnimatePresence>
      </PillContainer>
    </div>
  );
};

export default WidgetApp;
