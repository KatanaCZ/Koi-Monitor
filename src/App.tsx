import React, { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar } from './components/layout/TitleBar';
import { StatsBar } from './components/layout/StatsBar';
import {
  CpuWidget,
  RamWidget,
  GpuWidget,
  NetworkWidget,
  DnsWidget,
  DriversWidget,
} from './components/widgets';
import { SakuraParticles, SplashScreen, SettingsModal } from './components/common';
import { useAppStore } from './store';
import { systemService, dnsService, driverService } from './services/api';
import './styles/globals.css';

const App: React.FC = () => {
  const {
    theme,
    systemInfo,
    dnsResults,
    drivers,
    settings,
    setSystemInfo,
    setDnsResults,
    setDrivers,
    setLoading,
    addNetworkHistory,
  } = useAppStore();

  const [showSplash, setShowSplash] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isSystemReady = systemInfo !== null;
  const isDnsReady = dnsResults.length > 0;
  const isDriversReady = drivers.length > 0;

  const fetchSystemInfo = useCallback(async () => {
    try {
      const info = await systemService.getSystemInfo();
      setSystemInfo(info);

      addNetworkHistory(info.network.download_speed, info.network.upload_speed);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  }, [setSystemInfo, addNetworkHistory]);

  const fetchDnsInfo = useCallback(async () => {
    try {
      const results = await dnsService.pingAllDns();
      setDnsResults(results);
    } catch (error) {
      console.error('Failed to fetch DNS info:', error);
    }
  }, [setDnsResults]);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const driverList = await driverService.getDrivers();
      setDrivers(driverList);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setDrivers]);

  useEffect(() => {
    fetchSystemInfo();
    fetchDnsInfo();
    fetchDrivers();

    const interval = setInterval(() => {
      fetchSystemInfo();
    }, settings.refreshInterval);

    const dnsInterval = setInterval(() => {
      fetchDnsInfo();
    }, settings.dnsInterval);

    return () => {
      clearInterval(interval);
      clearInterval(dnsInterval);
    };
  }, [fetchSystemInfo, fetchDnsInfo, fetchDrivers, settings.refreshInterval, settings.dnsInterval]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (settings.enableGlassmorphicBlur) {
      document.documentElement.classList.remove('no-blur');
    } else {
      document.documentElement.classList.add('no-blur');
    }
  }, [settings.enableGlassmorphicBlur]);

  return (
    <div className="min-h-[100dvh] flex flex-col relative w-full overflow-hidden bg-[var(--background)]">
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            isSystemReady={isSystemReady}
            isDnsReady={isDnsReady}
            isDriversReady={isDriversReady}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      <SakuraParticles />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 15 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="max-w-7xl mx-auto w-full flex-1 flex flex-col px-4 md:px-8 py-6 z-10 relative space-y-6"
      >
        <TitleBar title="Koi Monitor" onOpenSettings={() => setIsSettingsOpen(true)} />
        
        <StatsBar />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          <CpuWidget />
          <RamWidget />
          <GpuWidget />
          <NetworkWidget />
          <div className="lg:col-span-2">
            <DnsWidget />
          </div>
        </div>

        {/* Drivers Section */}
        <div className="w-full min-h-[300px]">
          <DriversWidget />
        </div>
      </motion.div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;