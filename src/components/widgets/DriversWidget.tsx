import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDrive, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Monitor, Wifi, Volume2, Bluetooth, Cpu, Box } from 'lucide-react';
import { useAppStore } from '../../store';
import { DriverInfo } from '../../types';
import { NeonBentoCard } from '../common';
import { driverService } from '../../services/api';

export const DriversWidget: React.FC = () => {
  const { drivers, isLoading, setDrivers, setLoading, settings } = useAppStore();
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categoryMapping: Record<string, string[]> = {
    gpu: ['Graphics'],
    network: ['Network'],
    audio: ['Audio'],
    storage: ['Storage'],
  };

  const enabledCategories = settings.simplifiedMode
    ? ['Graphics', 'Network']
    : ['Graphics', 'Network', 'Audio', 'Storage'];

  const categories = ['all', ...new Set(drivers.map(d => d.category))];

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || driver.category === categoryFilter;
    const matchesEnabled = categoryFilter === 'all' || enabledCategories.includes(driver.category);
    return matchesSearch && matchesCategory && matchesEnabled;
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const result = await driverService.getDrivers(settings.simplifiedMode);
      setDrivers(result);
    } catch (error) {
      console.error('Failed to refresh drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    if (!url) return;
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
      case 'verify online': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Graphics': return <Monitor size={20} className="text-blue-500" />;
      case 'Network': return <Wifi size={20} className="text-emerald-500" />;
      case 'Storage': return <HardDrive size={20} className="text-amber-500" />;
      case 'Audio': return <Volume2 size={20} className="text-purple-500" />;
      case 'Bluetooth': return <Bluetooth size={20} className="text-cyan-500" />;
      case 'Firmware': return <Cpu size={20} className="text-slate-500" />;
      default: return <Box size={20} className="text-slate-400" />;
    }
  };

  return (
    <NeonBentoCard className="h-[380px]" themeColor="var(--neon-purple)" delay={0.6}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <HardDrive size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)] mb-0.5">Driver Analysis</h3>
            <p className="text-xs text-slate-500">
              {drivers.length} hardware drivers • Auto-filter
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefresh}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-semibold flex items-center gap-2 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <motion.div
            animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw size={16} className="text-slate-500 dark:text-slate-400" />
          </motion.div>
          {isLoading ? 'Scanning...' : 'Scan Drivers'}
        </motion.button>
      </div>

      
      {/* Driver List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-[200px] pr-1">
        <AnimatePresence mode="popLayout">
          {filteredDrivers.map((driver, index) => (
            <motion.div
              key={`${driver.name}-${driver.version}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ stiffness: 200, damping: 25, type: 'spring' }}
              onClick={() => setExpandedDriver(expandedDriver === driver.name ? null : driver.name)}
              className="p-4 rounded-2xl bg-[var(--background-accent)]/20 hover:bg-[var(--background-accent)]/50 border border-[var(--border)] hover:border-[var(--neon-pink)]/30 backdrop-blur-sm cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                    {getCategoryIcon(driver.category)}
                  </div>
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate mb-0.5">
                      {driver.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {driver.provider} • v{driver.version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className={`px-3 py-1 rounded-full border ${getStatusColorClass(driver.status)}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {driver.status}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {expandedDriver === driver.name ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedDriver === driver.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Version</p>
                          <p className="text-sm font-medium mono-text text-[var(--foreground)]">
                            {driver.version}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Date</p>
                          <p className="text-sm font-medium mono-text text-[var(--foreground)]">
                            {driver.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Category</p>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {driver.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Provider</p>
                          <p className="text-sm font-medium text-[var(--foreground)] truncate" title={driver.provider}>
                            {driver.provider}
                          </p>
                        </div>
                        {driver.hardware_id && (
                          <div className="col-span-2">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Hardware ID</p>
                            <p className="text-[11px] font-medium mono-text text-slate-500 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 truncate" title={driver.hardware_id}>
                              {driver.hardware_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {driver.update_url && (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUrl(driver.update_url!);
                          }}
                          className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            driver.status === 'Verify Online'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <ExternalLink size={16} />
                          {driver.status === 'Verify Online' ? 'Check Latest Version' : 'View Manufacturer Page'}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 rounded-xl bg-[var(--background-accent)]/30 border border-[var(--border)] backdrop-blur-sm text-center mt-auto shrink-0 z-10 relative">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">
          {filteredDrivers.length} Drivers • 
          {' '}<span className="text-emerald-500" style={{textShadow: '0 0 10px rgba(16,185,129,0.5)'}}>{filteredDrivers.filter(d => d.status === 'Installed').length} Installed</span> • 
          {' '}<span className="text-amber-500" style={{textShadow: '0 0 10px rgba(245,158,11,0.5)'}}>{filteredDrivers.filter(d => d.status === 'Verify Online').length} Verify Online</span>
        </p>
      </div>
    </NeonBentoCard>
  );
};