import React, { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar, ZenTitleBarDock, TITLE_BAR_SHELL_CLASS } from './components/layout';
import { SakuraParticles, SplashScreen, NotificationLayer, AlertOnboardingModal, ZenPondBackground, type SettingsTabId } from './components/common';
import { useAppStore } from './store';
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
import {
  isSplashDashboardReady,
  preloadSplashCharts,
  SPLASH_DASHBOARD_WARMUP_MS,
} from './utils/splashReadiness';
import { markDevSessionBooted, shouldSkipDevSplash } from './utils/devSession';
import { useTranslation } from './hooks/useTranslation';
import './styles/globals.css';

// Layout Views
import { DashboardView } from './components/layout/DashboardView';
import { ZenView } from './components/layout/ZenView';

// Custom Hooks
import { useAtmosphereSync } from './hooks/useAtmosphereSync';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useDriversData } from './hooks/useDriversData';

const SettingsModal = lazy(() =>
  import('./components/common/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);

const DnsWidget = lazy(() =>
  import('./components/widgets/DnsWidget').then((m) => ({ default: m.DnsWidget })),
);

const DriversWidget = lazy(() =>
  import('./components/widgets/DriversWidget').then((m) => ({ default: m.DriversWidget })),
);

const App: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const { t, language } = useTranslation();
  const isSystemReady = useAppStore((s) => s.systemInfo !== null);
  const isDnsReady = useAppStore(
    (s) => s.dnsResults.length > 0 || s.dnsFetchAttempted,
  );
  const zenMode = useAppStore((s) => s.zenMode);
  const setDnsResults = useAppStore((s) => s.setDnsResults);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);

  // Background Pollers & Hooks
  useTelemetryPoller();
  useSystemTray();
  useAutostart();
  useThresholdAlerts();
  useAtmosphereSync();

  const [showSplash, setShowSplash] = useState(() => !shouldSkipDevSplash());
  const { toggleAmbientMute, ambientMusicMuted } = useAmbientMusic(showSplash);
  const { registerEasterClick } = useEasterEggMusic(showSplash);
  const [showAlertOnboarding, setShowAlertOnboarding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId | undefined>();
  const [expandedWidget, setExpandedWidget] = useState<'dns' | 'drivers' | null>(null);
  const [dnsRowHeight, setDnsRowHeight] = useState<number | null>(null);
  const [chartsPreloaded, setChartsPreloaded] = useState(false);
  const [splashWarmupElapsed, setSplashWarmupElapsed] = useState(false);
  const cpuHistorySeq = useAppStore((s) => s.cpuHistoryRing.seq);

  // Drivers Polling Hook
  const { driversFetchSettled } = useDriversData();

  // Keyboard navigation custom hook
  useKeyboardNavigation({
    isSettingsOpen,
    expandedWidget,
    setExpandedWidget,
  });

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
    pushStatusToast(
      language === 'fr'
        ? 'Veille activée — Koi a l’œil sur votre machine.'
        : 'Alerts enabled — Koi has an eye on your machine.',
      'success'
    );
  }, [updateSettings, pushStatusToast, language]);

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
      const currentLanguage = useAppStore.getState().settings.language || 'en';
      await runDnsPingSession(checklist, customDns, {
        onSuccess: setDnsResults,
        toast: (message) => pushStatusToast(message, 'warning'),
      }, { errorMessage: currentLanguage === 'fr' ? 'Test DNS indisponible' : 'DNS test unavailable' });
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

  return (
    <div className="min-h-[100dvh] flex flex-col relative w-full overflow-hidden bg-[var(--background)]">
      <a href="#main" className="skip-link">
        {t('skip_to_content')}
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
          <h1 className="sr-only">{t('app_title')}</h1>

          <AnimatePresence mode="wait">
            {!zenMode ? (
              <DashboardView
                expandedWidget={expandedWidget}
                dnsRowHeight={dnsRowHeight}
                onToggleDnsExpand={handleToggleDnsExpand}
                onAutoDnsTest={handleAutoDnsTest}
                onCustomizeDns={handleCustomizeDns}
                onDnsLayoutHeight={handleDnsLayoutHeight}
                onToggleDriversExpand={handleToggleDriversExpand}
                onCustomizeDrivers={handleCustomizeDrivers}
              />
            ) : (
              <ZenView />
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
              <Suspense fallback={expandedWidget === 'drivers' ? null : <div className="bento-card h-[380px] animate-pulse bg-[var(--surface-inset)]" aria-hidden="true" />}>
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
