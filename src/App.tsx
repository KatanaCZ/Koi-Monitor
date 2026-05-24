import React, { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TitleBar, ZenTitleBarDock, TITLE_BAR_SHELL_CLASS } from './components/layout';
import { SakuraParticles, SplashScreen, NotificationLayer, AlertOnboardingModal, ZenPondBackground, type SettingsTabId } from './components/common';
import { useAppStore } from './store';
import { driverService } from './services/api';
import { DEFAULT_DNS_CHECKLIST } from './types';
import { runDnsPingSession } from './utils/dnsPing';
import { useFocusTrap } from './hooks/useFocusTrap';
import { useTelemetryPoller } from './hooks/useTelemetryPoller';
import { useSystemTray } from './hooks/useSystemTray';
import { useAutostart } from './hooks/useAutostart';
import { useThresholdAlerts } from './hooks/useThresholdAlerts';
import { useAmbientMusic } from './hooks/useAmbientMusic';
import { useEasterEggMusic } from './hooks/useEasterEggMusic';
import { markAlertsOnboardingDone, isAlertsOnboardingDone } from './utils/alertOnboarding';
import { DEFAULT_ALERT_THRESHOLDS } from './types';
import { syncGlassBlurClass } from './utils/glassBlur';
import { syncAtmosphereFromSettings } from './utils/atmosphereSettings';
import {
  isSplashDashboardReady,
  preloadSplashCharts,
  SPLASH_DASHBOARD_WARMUP_MS,
} from './utils/splashReadiness';
import { isDevSessionReload, markDevSessionBooted, shouldSkipDevSplash } from './utils/devSession';
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
  const backgroundAura = useAppStore((s) => s.settings.backgroundAura);
  const neonGlow = useAppStore((s) => s.settings.neonGlow);
  const calmMotion = useAppStore((s) => s.settings.calmMotion);
  const sakuraColor = useAppStore((s) => s.settings.sakuraColor);
  const zenMode = useAppStore((s) => s.zenMode);
  const notificationPanelOpen = useAppStore((s) => s.notificationPanelOpen);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);
  const prefersReducedMotion = useReducedMotion();
  const setDnsResults = useAppStore((s) => s.setDnsResults);
  const setDrivers = useAppStore((s) => s.setDrivers);
  const setLoading = useAppStore((s) => s.setLoading);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);

  useTelemetryPoller();
  useSystemTray();
  useAutostart();
  useThresholdAlerts();

  const [showSplash, setShowSplash] = useState(() => !shouldSkipDevSplash());
  const { toggleAmbientMute, ambientMusicMuted } = useAmbientMusic(showSplash);
  const { registerEasterClick } = useEasterEggMusic(showSplash);
  const [showAlertOnboarding, setShowAlertOnboarding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId | undefined>();
  const [driversFetchSettled, setDriversFetchSettled] = useState(() => isDevSessionReload());
  const [expandedWidget, setExpandedWidget] = useState<'dns' | 'drivers' | null>(null);
  const [dnsRowHeight, setDnsRowHeight] = useState<number | null>(null);
  const [chartsPreloaded, setChartsPreloaded] = useState(false);
  const [splashWarmupElapsed, setSplashWarmupElapsed] = useState(false);
  const cpuHistorySeq = useAppStore((s) => s.cpuHistoryRing.seq);

  const isDriversReady = driversFetchSettled;
  const allBackendReady = isSystemReady && isDnsReady && isDriversReady;
  const isDashboardReady = isSplashDashboardReady({
    cpuHistorySeq,
    chartsPreloaded,
    warmupElapsed: splashWarmupElapsed,
  });

  useEffect(() => {
    if (!showSplash) return;
    let cancelled = false;
    void preloadSplashCharts().then(() => {
      if (!cancelled) setChartsPreloaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [showSplash]);

  useEffect(() => {
    if (!showSplash || !allBackendReady) {
      setSplashWarmupElapsed(false);
      return;
    }
    const timer = setTimeout(() => setSplashWarmupElapsed(true), SPLASH_DASHBOARD_WARMUP_MS);
    return () => clearTimeout(timer);
  }, [showSplash, allBackendReady]);

  const handleSplashComplete = useCallback(() => {
    markDevSessionBooted();
    setShowSplash(false);
    if (!isAlertsOnboardingDone()) {
      setShowAlertOnboarding(true);
    }
  }, []);

  const handleEnableAlerts = useCallback(() => {
    markAlertsOnboardingDone();
    updateSettings({
      alertThresholds: {
        ...DEFAULT_ALERT_THRESHOLDS,
        enabled: true,
      },
    });
    setShowAlertOnboarding(false);
    pushStatusToast('Veille activée — Koi a l’œil sur votre machine.', 'success');
  }, [updateSettings, pushStatusToast]);

  const handleDeclineAlerts = useCallback(() => {
    markAlertsOnboardingDone();
    updateSettings({
      alertThresholds: {
        ...DEFAULT_ALERT_THRESHOLDS,
        enabled: false,
      },
    });
    setShowAlertOnboarding(false);
  }, [updateSettings]);
  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setSettingsInitialTab(undefined);
  }, []);
  const openSettings = useCallback((tab?: SettingsTabId) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  }, []);
  const handleToggleDnsExpand = useCallback(() => setExpandedWidget('dns'), []);
  const handleDnsLayoutHeight = useCallback((height: number | null) => {
    setDnsRowHeight(height);
  }, []);
  const handleToggleDriversExpand = useCallback(() => setExpandedWidget('drivers'), []);
  const handleCloseExpanded = useCallback(() => setExpandedWidget(null), []);
  const expandedDialogRef = useFocusTrap(expandedWidget !== null);

  const runDnsPing = useCallback(
    async (checklist: string[]) => {
      const customDns = useAppStore.getState().settings.customDns;
      await runDnsPingSession(checklist, customDns, {
        onSuccess: setDnsResults,
        toast: (message) => pushStatusToast(message, 'warning'),
      }, { errorMessage: 'Test DNS indisponible' });
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
  const handleCustomizeDrivers = useCallback(() => {
    openSettings('general');
  }, [openSettings]);

  const fetchDrivers = useCallback(
    async (force = false, enrich = false) => {
      const requestedMode = simplifiedMode;
      setDriversFetchSettled(false);
      try {
        setLoading(true);
        const driverList = await driverService.getDrivers(requestedMode, force, enrich);
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

  const enrichDriversInBackground = useCallback(async () => {
    const requestedMode = simplifiedMode;
    try {
      const driverList = await driverService.getDrivers(requestedMode, false, true);
      if (useAppStore.getState().settings.simplifiedMode !== requestedMode) {
        return;
      }
      setDrivers(driverList);
    } catch (error) {
      console.error('Failed to enrich driver updates:', error);
    }
  }, [simplifiedMode, setDrivers]);

  useEffect(() => {
    const devReload = isDevSessionReload();

    void (async () => {
      if (devReload) {
        setDriversFetchSettled(true);
      }
      await fetchDrivers(false, false);
      if (!devReload) {
        void enrichDriversInBackground();
      }
    })();
  }, [simplifiedMode, fetchDrivers, enrichDriversInBackground]);

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
    if (zenMode) setExpandedWidget(null);
  }, [zenMode]);

  useEffect(() => {
    syncGlassBlurClass(enableGlassmorphicBlur);
  }, [enableGlassmorphicBlur]);

  useEffect(() => {
    syncAtmosphereFromSettings({ backgroundAura, neonGlow, calmMotion, sakuraColor });
  }, [backgroundAura, neonGlow, calmMotion, sakuraColor]);

  useEffect(() => {
    if (!zenMode || isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (notificationPanelOpen) {
        setNotificationPanelOpen(false);
        return;
      }
      setZenMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, setZenMode, isSettingsOpen, notificationPanelOpen, setNotificationPanelOpen]);

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
      <a href="#main" className="skip-link">
        Aller au contenu principal
      </a>

      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isSystemReady={isSystemReady}
            isDnsReady={isDnsReady}
            isDriversReady={isDriversReady}
            isDashboardReady={isDashboardReady}
            onComplete={handleSplashComplete}
          />
        )}
      </AnimatePresence>

      <AlertOnboardingModal
        isOpen={showAlertOnboarding}
        onEnable={handleEnableAlerts}
        onDecline={handleDeclineAlerts}
      />

      <SakuraParticles />

      <AnimatePresence>
        {zenMode && !showSplash ? <ZenPondBackground key="zen-pond" /> : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 15 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className={`mx-auto w-full flex-1 flex flex-col z-10 relative min-h-0 ${
          zenMode ? 'max-w-none px-0 py-0' : 'max-w-7xl px-4 md:px-8 py-6 space-y-6'
        }`}
      >
        {zenMode ? (
          <div className={TITLE_BAR_SHELL_CLASS}>
            <ZenTitleBarDock>
              <TitleBar
                title="Koi Monitor"
                onOpenSettings={() => openSettings()}
                ambientMusicMuted={ambientMusicMuted}
                onToggleAmbientMute={toggleAmbientMute}
                onEasterSecretTap={registerEasterClick}
              />
            </ZenTitleBarDock>
          </div>
        ) : (
          <TitleBar
            title="Koi Monitor"
            onOpenSettings={() => openSettings()}
            ambientMusicMuted={ambientMusicMuted}
            onToggleAmbientMute={toggleAmbientMute}
            onEasterSecretTap={registerEasterClick}
          />
        )}

        <main id="main" className={`flex-1 flex flex-col min-h-0 w-full ${zenMode ? 'items-stretch' : 'space-y-6'}`}>
          <h1 className="sr-only">Koi Monitor — Tableau de bord système</h1>

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
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <WidgetFallback />
                      <WidgetFallback />
                      <WidgetFallback />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <WidgetFallback />
                      <WidgetFallback />
                    </div>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <CpuWidget />
                    <RamWidget />
                    <GpuWidget />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <div className="flex flex-col min-h-0 h-full">
                      <NetworkWidget layoutHeight={dnsRowHeight} />
                    </div>
                    <div className="lg:col-span-2 flex flex-col min-h-0 h-full">
                      <div
                        className={`h-full min-h-0 flex flex-col ${
                          expandedWidget === 'dns'
                            ? 'opacity-0 pointer-events-none'
                            : 'opacity-100 transition-opacity duration-300'
                        }`}
                      >
                        <DnsWidget
                          onToggleExpand={handleToggleDnsExpand}
                          onAutoTest={handleAutoDnsTest}
                          onCustomize={handleCustomizeDns}
                          onLayoutHeightChange={handleDnsLayoutHeight}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full min-h-[380px]">
                  <div
                    className={
                      expandedWidget === 'drivers'
                        ? 'opacity-0 pointer-events-none'
                        : 'opacity-100 transition-opacity duration-300'
                    }
                  >
                    <DriversWidget
                      onToggleExpand={handleToggleDriversExpand}
                      onCustomize={handleCustomizeDrivers}
                    />
                  </div>
                </div>
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="zen"
              initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.98 }}
              transition={{
                duration: prefersReducedMotion ? 0.15 : 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex-1 flex flex-col min-h-0 w-full h-full relative z-[2]"
            >
              <Suspense fallback={<WidgetFallback />}>
                <div className="flex-1 flex flex-col min-h-0 w-full h-full">
                  <ZenClockWidget />
                </div>
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      </motion.div>

      <AnimatePresence>
        {expandedWidget && !zenMode && (
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
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={
                expandedWidget === 'drivers'
                  ? { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
                  : { type: 'spring', damping: 25, stiffness: 200 }
              }
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl cursor-default"
            >
              <Suspense fallback={expandedWidget === 'drivers' ? null : <WidgetFallback />}>
                {expandedWidget === 'dns' && (
                  <DnsWidget
                    isExpanded={true}
                    onToggleExpand={handleCloseExpanded}
                    onAutoTest={handleAutoDnsTest}
                    onCustomize={handleCustomizeDns}
                  />
                )}
                {expandedWidget === 'drivers' && (
                  <DriversWidget
                    isExpanded={true}
                    onToggleExpand={handleCloseExpanded}
                    onCustomize={handleCustomizeDrivers}
                  />
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
            onEasterSecretTap={registerEasterClick}
          />
        </Suspense>
      )}

      <NotificationLayer />
    </div>
  );
};

export default App;
