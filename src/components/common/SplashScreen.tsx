import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Globe, Disc, Loader2, Check, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  isSystemReady: boolean;
  isDnsReady: boolean;
  isDriversReady: boolean;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isSystemReady,
  isDnsReady,
  isDriversReady,
  onComplete,
}) => {
  const [percent, setPercent] = useState(0);
  const [showSystemReady, setShowSystemReady] = useState(false);
  const [showDnsReady, setShowDnsReady] = useState(false);
  const [showDriversReady, setShowDriversReady] = useState(false);

  // Staggered diagnostic simulation sequence with minimum display time
  useEffect(() => {
    let active = true;
    const start = Date.now();

    const checkState = setInterval(() => {
      if (!active) return;
      const elapsed = Date.now() - start;

      // Step 1: System info check (minimum 800ms)
      if (isSystemReady && elapsed >= 800) {
        setShowSystemReady(true);
      }
      // Step 2: DNS check (minimum 1800ms)
      if (isDnsReady && elapsed >= 1800) {
        setShowDnsReady(true);
      }
      // Step 3: Drivers check (minimum 2800ms)
      if (isDriversReady && elapsed >= 2800) {
        setShowDriversReady(true);
      }
    }, 50);

    return () => {
      active = false;
      clearInterval(checkState);
    };
  }, [isSystemReady, isDnsReady, isDriversReady]);

  // Smooth slow progress bar animation mapped to staggered rows
  useEffect(() => {
    let target = 0;
    if (showSystemReady) target += 33;
    if (showDnsReady) target += 33;
    if (showDriversReady) target += 34;

    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev < target) {
          return prev + 1; // Slow increment
        }
        return prev;
      });
    }, 15);

    return () => clearInterval(interval);
  }, [showSystemReady, showDnsReady, showDriversReady]);

  // Trigger completion only when the percent has fully reached 100%
  useEffect(() => {
    if (percent === 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000); // 1-second premium pause at 100% to let the user enjoy the completed screen
      return () => clearTimeout(timer);
    }
  }, [percent, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.05,
        filter: 'blur(10px)',
        transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } 
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090514] select-none"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#ff2d95]/10 via-[#9d4edd]/5 to-[#00d4ff]/10 rounded-full blur-[120px]" />
      </div>

      {/* Main glassmorphism container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="w-[90%] max-w-md p-8 rounded-3xl border border-white/5 bg-slate-950/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(157,78,221,0.15)] flex flex-col items-center relative overflow-hidden"
      >
        {/* Subtle top Sakura bloom shine */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-pink-500/20 blur-2xl rounded-full" />

        {/* Koi Silhouette Logo with double ring glowing orbit */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-pink-500/30 shadow-[0_0_15px_rgba(255,45,149,0.2)]"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            className="absolute inset-2 rounded-full border border-double border-[#00d4ff]/30 shadow-[0_0_20px_rgba(0,212,255,0.15)]"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8] 
            }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff2d95] via-[#9d4edd] to-[#00d4ff] flex items-center justify-center shadow-[0_0_30px_rgba(157,78,221,0.5)]"
          >
            <Sparkles size={28} className="text-white" />
          </motion.div>
        </div>

        {/* Brand Name */}
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
          <span>🌸</span> Koi Monitor <span>🌸</span>
        </h2>
        <p className="text-[10px] uppercase font-bold tracking-widest text-[#9d4edd] mb-6">
          Tokyo Night Edition
        </p>

        {/* Loading Steps */}
        <div className="w-full space-y-3.5 mb-8">
          <LoadingRow 
            icon={<Cpu size={14} />} 
            label="Analyse du matériel (CPU, RAM, GPU)" 
            isReady={showSystemReady} 
            themeColor="#ff2d95"
          />
          <LoadingRow 
            icon={<Globe size={14} />} 
            label="Mesure des latences réseau et DNS" 
            isReady={showDnsReady} 
            themeColor="#00d4ff"
          />
          <LoadingRow 
            icon={<Disc size={14} />} 
            label="Scan des pilotes système physiques" 
            isReady={showDriversReady} 
            themeColor="#00ff9d"
          />
        </div>

        {/* Progress Bar Container */}
        <div className="w-full">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2 px-1">
            <span className="mono-text tracking-wider">Diagnostic système...</span>
            <span className="mono-text text-[#ff2d95]">{percent}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div
              style={{ width: `${percent}%` }}
              className="h-full bg-gradient-to-r from-[#ff2d95] via-[#9d4edd] to-[#00d4ff] rounded-full shadow-[0_0_10px_rgba(0,212,255,0.5)] transition-all duration-150 ease-out"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface LoadingRowProps {
  icon: React.ReactNode;
  label: string;
  isReady: boolean;
  themeColor: string;
}

const LoadingRow: React.FC<LoadingRowProps> = ({ icon, label, isReady, themeColor }) => {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/5 border border-white/[0.03] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center" style={{ color: isReady ? themeColor : '#64748b' }}>
          {icon}
        </div>
        <span className="text-xs text-slate-300 font-medium">{label}</span>
      </div>
      <div className="flex items-center justify-center min-w-5">
        {isReady ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"
          >
            <Check size={10} className="text-emerald-400 font-bold" />
          </motion.div>
        ) : (
          <Loader2 size={12} className="text-slate-500 animate-spin" />
        )}
      </div>
    </div>
  );
};
