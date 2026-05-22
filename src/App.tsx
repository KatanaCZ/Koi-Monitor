import React, { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar } from './components/layout/TitleBar';
import { StatsBar } from './components/layout/StatsBar';
import { SakuraParticles, SplashScreen, StatusToast, type SettingsTabId } from './components/common';
import { useAppStore } from './store';
import { driverService } from './services/api';
import { DEFAULT_DNS_CHECKLIST } from './types';
import { pingDnsChecklist } from './utils/dnsPing';
import { useFocusTrap } from './hooks/useFocusTrap';
import { useTelemetryPoller } from './hooks/useTelemetryPoller';
import { syncGlassBlurClass } from './utils/glassBlur';
import './styles/globals.css';

const CpuWidget = lazy(() =>
  import('./components/widgets/CpuWidget').then((m) => ({ default: m.CpuWidget })),
);
const RamWidget = lazy(() =>
  import('./components/widgets/RamWidget').then((m) => ({ default: m.RamWidget })),
);
const GpuWidget = lazy(() =>
  import('./components/widgets/GpuWidget').then((m) => ({ default: m.GpuWidget })),
);
const NetworkWidget = lazy(() =>
  import('./components/widgets/NetworkWidget').then((m) => ({ default: m.NetworkWidget })),
);
const DnsWidget = lazy(() =>
  import('./components/widgets/DnsWidget').then((m) => ({ default: m.DnsWidget })),
);
const DriversWidget = lazy(() =>
  import('./components/widgets/DriversWidget').then((m) => ({ default: m.DriversWidget })),
);
const ZenClockWidget = lazy(() =>
  import('./components/widgets/ZenClockWidget').then((m) => ({ default: m.ZenClockWidget })),
);
const SettingsModal = lazy(() =>
  import('./components/common/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);

const WidgetFallback = () => (
  <div className="bento-card h-[380px] animate-pulse bg-[var(--surface-inset)]" aria-hidden="true" />
);

const App: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const isSystemReady = useAppStore((s) => s.systemInfo !== null);
  const isDnsReady = useAppStore(
    (s) => s.dnsResults.length > 0 || s.dnsFetchAttempted,
  );
  const simplifiedMode = useAppStore((s) => s.settings.simplifiedMode);
  const enableGlassmorphicBlur = useAppStore((s) => s.settings.enableGlassmorphicBlur);
  const zenMode = useAppStore((s) => s.zenMode);
  const setDnsResults = useAppStore((s) => s.setDnsResults);
  const setDrivers = useAppStore((s) => s.setDrivers);
  const setLoading = useAppStore((s) => s.setLoading);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);

  useTelemetryPoller();

  const [showSplash, setShowSplash] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId | undefined>();
  const [driversFetchSettled, setDriversFetchSettled] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<'dns' | 'drivers' | null>(null);

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setSettingsInitialTab(undefined);
  }, []);
  const openSettings = useCallback((tab?: SettingsTabId) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  }, []);
  const handleToggleDnsExpand = useCallback(() => setExpandedWidget('dns'), []);
  const handleToggleDriversExpand = useCallback(() => setExpandedWidget('drivers'), []);
  const handleCloseExpanded = useCallback(() => setExpandedWidget(null), []);
  const expandedDialogRef = useFocusTrap(expandedWidget !== null);

  const isDriversReady = driversFetchSettled;

  const runDnsPing = useCallback(
    async (checklist: string[]) => {
      try {
        const results = await pingDnsChecklist(checklist);
        setDnsResults(results);
      } catch (error) {
        console.error('Failed to fetch DNS info:', error);
        pushStatusToast('Test DNS indisponible', 'warning');
      }
    },
    [setDnsResults, pushStatusToast],
  );

  const handleAutoDnsTest = useCallback(async () => {
    const checklist = [...DEFAULT_DNS_CHECKLIST];
    updateSettings({ dnsChecklist: checklist });
    await runDnsPing(checklist);
  }, [updateSettings, runDnsPing]);

  const handleCustomizeDns = useCallback(() => {
    openSettings('network');
  }, [openSettings]);

  const fetchDrivers = useCallback(
    async (force = false) => {
      const requestedMode = simplifiedMode;
      setDriversFetchSettled(false);
      try {
        setLoading(true);
        const driverList = await driverService.getDrivers(requestedMode, force);
        if (useAppStore.getState().settings.simplifiedMode !== requestedMode) {
          return;
        }
        setDrivers(driverList);
      } catch (error) {
        console.error('Failed to fetch drivers:', error);
        pushStatusToast('Analyse des pilotes impossible', 'error');
      } finally {
        if (useAppStore.getState().settings.simplifiedMode === requestedMode) {
          setDriversFetchSettled(true);
          setLoading(false);
        }
      }
    },
    [setLoading, setDrivers, simplifiedMode, pushStatusToast],
  );

  useEffect(() => {
    void fetchDrivers(true);
  }, [simplifiedMode, fetchDrivers]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (zenMode) {
      document.documentElement.dataset.zenMode = 'true';
    } else {
      delete document.documentElement.dataset.zenMode;
    }
  }, [zenMode]);

  useEffect(() => {
    syncGlassBlurClass(enableGlassmorphicBlur);
  }, [enableGlassmorphicBlur]);

  useEffect(() => {
    if (!zenMode || isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, setZenMode, isSettingsOpen]);

  useEffect(() => {
    if (!expandedWidget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedWidget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedWidget]);

  return (
    <div className="min-h-[100dvh] flex flex-col relative w-full overflow-hidden bg-[var(--background)]">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isSystemReady={isSystemReady}
            isDnsReady={isDnsReady}
            isDriversReady={isDriversReady}
            onComplete={handleSplashComplete}
          />
        )}
      </AnimatePresence>

      <SakuraParticles />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 15 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="mx-auto w-full flex-1 flex flex-col z-10 relative max-w-7xl px-4 md:px-8 py-6 space-y-6"
      >
        <TitleBar
          title="Koi Monitor"
          onOpenSettings={() => openSettings()}
          playSlashAnimation={!showSplash}
        />

        {!zenMode && <StatsBar />}

        <AnimatePresence mode="wait">
          {!zenMode ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <WidgetFallback />
                    <WidgetFallback />
                    <WidgetFallback />
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                  <CpuWidget />
                  <RamWidget />
                  <GpuWidget />
                  <NetworkWidget />
                  <div className="lg:col-span-2">
                    <div
                      className={
                        expandedWidget === 'dns'
                          ? 'opacity-0 pointer-events-none'
                          : 'opacity-100 transition-opacity duration-300'
                      }
                    >
                      <DnsWidget
                        onToggleExpand={handleToggleDnsExpand}
                        onAutoTest={handleAutoDnsTest}
                        onCustomize={handleCustomizeDns}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full min-h-[480px]">
                  <div
                    className={
                      expandedWidget === 'drivers'
                        ? 'opacity-0 pointer-events-none'
                        : 'opacity-100 transition-opacity duration-300'
                    }
                  >
                    <DriversWidget onToggleExpand={handleToggleDriversExpand} />
                  </div>
                </div>
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="zen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <Suspense fallback={<WidgetFallback />}>
                <ZenClockWidget />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {expandedWidget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-[var(--overlay)] cursor-pointer"
            onClick={handleCloseExpanded}
            role="presentation"
          >
            <motion.div
              ref={expandedDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={
                expandedWidget === 'dns'
                  ? 'Moniteur DNS agrandi'
                  : 'Analyse des pilotes agrandie'
              }
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl cursor-default"
            >
              <Suspense fallback={<WidgetFallback />}>
                {expandedWidget === 'dns' && (
                  <DnsWidget
                    isExpanded={true}
                    onToggleExpand={handleCloseExpanded}
                    onAutoTest={handleAutoDnsTest}
                    onCustomize={handleCustomizeDns}
                  />
                )}
                {expandedWidget === 'drivers' && (
                  <DriversWidget isExpanded={true} onToggleExpand={handleCloseExpanded} />
                )}
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
            initialTab={settingsInitialTab}
          />
        </Suspense>
      )}

      <StatusToast />
    </div>
  );
};

export default App;
