import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Monitor, Wifi, Volume2, Bluetooth, Cpu, Box, Maximize2, Minimize2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';
import {
  EssentialVersionsSummary,
  DriverVersionCompare,
} from '../common/DriverVersionDisplay';
import { formatDriverVersion, formatInstalledDriverLabel, getDriverStatusLabel, hasDriverUpdate, collapseEssentialDrivers, isWindowsUpdateSource, isDriverStoreOnlySource, getVendorUpdateLinkLabel } from '../../utils/driverFormat';
import { driverService } from '../../services/api';
import { isSafeExternalUrl } from '../../utils/safeUrl';

interface DriversWidgetProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const DriversWidget: React.FC<DriversWidgetProps> = ({ isExpanded = false, onToggleExpand }) => {
  const drivers = useAppStore((s) => s.drivers);
  const isLoading = useAppStore((s) => s.isLoading);
  const setDrivers = useAppStore((s) => s.setDrivers);
  const setLoading = useAppStore((s) => s.setLoading);
  const pushStatusToast = useAppStore((s) => s.pushStatusToast);
  const simplifiedMode = useAppStore((s) => s.settings.simplifiedMode);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const filteredDrivers = useMemo(() => {
    if (drivers.length === 0 || drivers[0]?.name === 'No hardware drivers detected') {
      return drivers;
    }
    if (!simplifiedMode) {
      return drivers;
    }
    const collapsed = collapseEssentialDrivers(drivers);
    return collapsed.length > 0 ? collapsed : drivers;
  }, [drivers, simplifiedMode]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const result = await driverService.getDrivers(simplifiedMode, true);
      setDrivers(result);
    } catch (error) {
      console.error('Failed to refresh drivers:', error);
      pushStatusToast('Échec du scan des pilotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWindowsUpdate = async () => {
    try {
      await driverService.openWindowsUpdate();
    } catch (error) {
      console.error('Failed to open Windows Update:', error);
      pushStatusToast('Impossible d\'ouvrir Windows Update', 'error');
    }
  };

  const handleOpenUrl = async (url: string) => {
    if (!url || !isSafeExternalUrl(url)) {
      console.warn('Blocked unsafe external URL:', url);
      return;
    }
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'installed': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
      case 'update available': return 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20';
      case 'verify online': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      default: return 'text-[var(--text-muted)] bg-[var(--surface-inset)] border-[var(--border-strong)]';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Graphics': return <Monitor size={20} className="text-blue-500" />;
      case 'Network': return <Wifi size={20} className="text-emerald-500" />;
      case 'Storage': return <HardDrive size={20} className="text-amber-500" />;
      case 'Audio': return <Volume2 size={20} className="text-purple-500" />;
      case 'Bluetooth': return <Bluetooth size={20} className="text-cyan-500" />;
      case 'Firmware': return <Cpu size={20} className="text-[var(--text-muted)]" />;
      default: return <Box size={20} className="text-[var(--text-subtle)]" />;
    }
  };

  const driverKey = (driver: { name: string; version: string }) =>
    `${driver.name}-${driver.version}`;

  const isSimplified = simplifiedMode;
  const installedCount = filteredDrivers.filter((d) => d.status === 'Installed').length;
  const updateCount = filteredDrivers.filter((d) => hasDriverUpdate(d)).length;
  const verifyCount = filteredDrivers.filter((d) => d.status === 'Verify Online').length;
  const showEssentialSummary =
    isSimplified &&
    filteredDrivers.length > 0 &&
    filteredDrivers[0].name !== 'No hardware drivers detected';

  useEffect(() => {
    setExpandedDriver(null);
  }, [isSimplified]);

  return (
    <NeonBentoCard
      className={
        isExpanded
          ? "w-full max-w-5xl h-auto max-h-[85vh] md:max-h-[90vh] shadow-2xl"
          : "h-[480px]"
      }
      themeColor="var(--neon-purple)"
      delay={0.6}
      layoutId="drivers-widget-card"
    >
      <div className="flex flex-col gap-6 flex-1 min-h-0 min-w-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 shrink-0 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] shrink-0">
            <HardDrive size={20} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] leading-tight">
              Analyse des pilotes
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-snug">
              {filteredDrivers.length} pilote{filteredDrivers.length !== 1 ? 's' : ''}
              {isSimplified
                ? ' essentiel' + (filteredDrivers.length !== 1 ? 's' : '') + ' · GPU, réseau, Bluetooth'
                : ' · GPU, réseau, audio, stockage'}
              {' · '}
              versions installées ci-dessous
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Analyse des pilotes en cours' : 'Scanner les pilotes'}
            className={`px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] text-sm font-semibold flex items-center gap-2 transition-colors min-h-[44px] ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <motion.div
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw size={16} className="text-[var(--text-muted)]" />
            </motion.div>
            {isLoading ? 'Analyse...' : 'Scanner les pilotes'}
          </motion.button>
          
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="w-11 h-11 rounded-xl border flex items-center justify-center cursor-pointer transition-colors bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--neon-purple)]/30 text-[var(--foreground)] shrink-0"
              aria-label={isExpanded ? "Réduire le widget" : "Agrandir le widget"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      {showEssentialSummary ? (
        <>
          <EssentialVersionsSummary
            drivers={filteredDrivers}
            compact={!isExpanded}
          />
          <div
            className="h-px w-full shrink-0 bg-[var(--border)]"
            aria-hidden="true"
          />
        </>
      ) : null}

      
      {/* Driver List */}
      <div
        className={`flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1 ${
          isExpanded ? 'max-h-[50vh] md:max-h-[55vh]' : ''
        }`}
      >
          {filteredDrivers.map((driver) => {
            const key = driverKey(driver);
            const isOpen = expandedDriver === key;

            return (
            <div
              key={key}
              onClick={() => setExpandedDriver(isOpen ? null : key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedDriver(isOpen ? null : key);
                }
              }}
              tabIndex={0}
              role="button"
              aria-expanded={isOpen}
              aria-label={
                hasDriverUpdate(driver)
                  ? `${driver.name}, version installée ${formatDriverVersion(driver.version)}, mise à jour ${formatDriverVersion(driver.latest_version)} disponible`
                  : `${driver.name}, version installée ${formatDriverVersion(driver.version)}, ${driver.status}`
              }
              className={`rounded-2xl bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] border backdrop-blur-sm cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-[var(--neon-pink)] focus-visible:outline-none shrink-0 ${
                isSimplified ? 'p-3' : 'p-4'
              } ${
                isOpen
                  ? 'border-[var(--neon-pink)]/40 hover:border-[var(--neon-pink)]/50'
                  : hasDriverUpdate(driver)
                    ? 'border-sky-500/35 hover:border-sky-500/45 ring-1 ring-sky-500/10'
                  : 'border-[var(--border)] hover:border-[var(--neon-pink)]/30'
              }`}
            >
              <div className={`flex items-start w-full ${isSimplified ? 'gap-3' : 'gap-4'}`}>
                <div className={`rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${isSimplified ? 'w-8 h-8' : 'w-10 h-10'}`}>
                  {getCategoryIcon(driver.category)}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <p className={`font-semibold text-[var(--foreground)] truncate leading-snug ${isSimplified ? 'text-xs' : 'text-sm'}`}>
                    {driver.name}
                  </p>
                  <p className={`text-[var(--text-muted)] truncate leading-snug ${isSimplified ? 'text-[10px]' : 'text-xs'}`}>
                    {driver.provider}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 min-w-[9.5rem] max-w-[52%]">
                  {hasDriverUpdate(driver) ? (
                    <DriverVersionCompare
                      installed={driver.version}
                      latest={driver.latest_version}
                      size={isSimplified ? 'compact' : 'default'}
                      layout="stack"
                      className="w-full"
                    />
                  ) : (
                    <span
                      className={`mono-text font-semibold text-[var(--neon-purple-text)] truncate max-w-full ${
                        isSimplified ? 'text-[10px]' : 'text-xs'
                      }`}
                      title={`Version installée : ${formatDriverVersion(driver.version)}`}
                    >
                      {formatInstalledDriverLabel(driver.version)}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`rounded-full border whitespace-nowrap ${getStatusColorClass(driver.status)} ${isSimplified ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                        {getDriverStatusLabel(driver.status, driver)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-center text-[var(--text-muted)] shrink-0 ${isSimplified ? 'w-5 h-5' : 'w-6 h-6'}`} aria-hidden="true">
                      {isOpen ? (
                        <ChevronUp size={isSimplified ? 14 : 16} />
                      ) : (
                        <ChevronDown size={isSimplified ? 14 : 16} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className={`border-t border-[var(--border)] space-y-4 ${isSimplified ? 'pt-3 mt-3 overflow-y-auto min-h-0' : 'pt-4 mt-4'}`}>
                  {hasDriverUpdate(driver) ? (
                    <DriverVersionCompare
                      installed={driver.version}
                      latest={driver.latest_version}
                      size="default"
                      layout="inline"
                      className="w-full justify-start"
                    />
                  ) : null}
                  <div className="grid grid-cols-2 gap-4">
                        {!hasDriverUpdate(driver) ? (
                          <div>
                            <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">Version installée</p>
                            <p className="text-sm font-medium mono-text text-[var(--foreground)]">
                              {formatInstalledDriverLabel(driver.version)}
                            </p>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">Date installée</p>
                          <p className="text-sm font-medium mono-text text-[var(--foreground)]">
                            {driver.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">Catégorie</p>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {driver.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">Fournisseur</p>
                          <p className="text-sm font-medium text-[var(--foreground)] break-words" title={driver.provider}>
                            {driver.provider}
                          </p>
                        </div>
                        {driver.hardware_id && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-[var(--text-subtle)] uppercase font-semibold tracking-wider mb-2">ID Matériel</p>
                            <p className="text-[11px] font-medium mono-text text-[var(--text-muted)] bg-[var(--surface-inset)] p-2 rounded-lg border border-[var(--border)] break-all" title={driver.hardware_id}>
                              {driver.hardware_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {hasDriverUpdate(driver) ? (
                        <div className="space-y-3">
                          {isDriverStoreOnlySource(driver) ? (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                              Version repérée dans le magasin de pilotes — non proposée par Windows Update sur ce PC.
                            </p>
                          ) : null}
                          {isWindowsUpdateSource(driver) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenWindowsUpdate();
                              }}
                              className="w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-400"
                            >
                              <ExternalLink size={16} />
                              Ouvrir Windows Update
                            </button>
                          ) : null}
                          {driver.update_url &&
                          (isDriverStoreOnlySource(driver) || isWindowsUpdateSource(driver)) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenUrl(driver.update_url!);
                              }}
                              className={`w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                                isWindowsUpdateSource(driver)
                                  ? 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]'
                                  : 'bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-400'
                              }`}
                            >
                              <ExternalLink size={16} />
                              {getVendorUpdateLinkLabel(driver)}
                            </button>
                          ) : null}
                          {isDriverStoreOnlySource(driver) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleOpenWindowsUpdate();
                              }}
                              className="w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]"
                            >
                              Vérifier Windows Update
                            </button>
                          ) : null}
                        </div>
                      ) : driver.update_url ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUrl(driver.update_url!);
                          }}
                          className={`w-full min-h-[44px] py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            driver.status === 'Verify Online'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400'
                              : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-muted)] text-[var(--foreground)]'
                          }`}
                        >
                          <ExternalLink size={16} />
                          {driver.status === 'Verify Online'
                            ? 'Vérifier en ligne'
                            : 'Page constructeur'}
                        </button>
                      ) : null}
                </div>
              )}
            </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className={`rounded-2xl bg-[var(--surface-inset)] border border-[var(--border)] backdrop-blur-sm text-center shrink-0 z-10 relative ${isSimplified ? 'p-3' : 'p-4'}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)] leading-relaxed">
          {filteredDrivers.length} pilotes •{' '}
          <span className="text-emerald-500" style={{ textShadow: '0 0 10px rgba(16,185,129,0.5)' }}>
            {installedCount} installés
          </span>
          {updateCount > 0 ? (
            <>
              {' • '}
              <span className="text-sky-500" style={{ textShadow: '0 0 10px rgba(14,165,233,0.5)' }}>
                {updateCount} mise{updateCount !== 1 ? 's' : ''} à jour
              </span>
            </>
          ) : null}
          {' • '}
          <span className="text-amber-500" style={{ textShadow: '0 0 10px rgba(245,158,11,0.5)' }}>
            {verifyCount} à vérifier
          </span>
        </p>
      </div>
      </div>
    </NeonBentoCard>
  );
};