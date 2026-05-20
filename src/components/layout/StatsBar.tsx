import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, MemoryStick, Monitor, Wifi, Clock } from 'lucide-react';
import { useAppStore } from '../../store';
import { NeonBentoCard } from '../common';

export const StatsBar: React.FC = () => {
  const { systemInfo } = useAppStore();
  const [liveUptime, setLiveUptime] = useState(0);

  useEffect(() => {
    if (systemInfo?.uptime) {
      setLiveUptime(systemInfo.uptime);
    }
  }, [systemInfo?.uptime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveUptime((prev) => (prev > 0 ? prev + 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cpu = systemInfo?.cpu.usage ?? 0;
  const ram = systemInfo?.memory.usage_percent ?? 0;
  const gpu = systemInfo?.gpu?.[0]?.usage ?? 0;
  const network = systemInfo?.network ?? { download_speed: 0, upload_speed: 0 };

  const formatSpeed = (speed: number) => {
    if (speed < 1) return (speed * 1024).toFixed(0) + ' KB/s';
    return speed.toFixed(1) + ' MB/s';
  };

  const formatUptime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return 'Calcul...';
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const dStr = days > 0 ? `${days}j ` : '';
    const hStr = hours > 0 || days > 0 ? `${hours}h ` : '';
    const mStr = `${minutes}m `;
    const sStr = `${seconds}s`;
    
    return `${dStr}${hStr}${mStr}${sStr}`;
  };

  // Determine a scaling relative percentage for network activity up to 100 MB/s max
  const getNetworkPercentage = () => {
    const speed = network.download_speed; // in MB/s
    if (speed <= 0) return 0;
    return Math.min(100, Math.max(5, (speed / 100) * 100));
  };

  const stats = [
    { 
      icon: Cpu, 
      label: 'CPU', 
      value: `${cpu.toFixed(0)}%`, 
      percent: cpu,
      color: 'var(--neon-pink)',
      textColor: 'var(--neon-pink-text)'
    },
    { 
      icon: MemoryStick, 
      label: 'RAM', 
      value: `${ram.toFixed(0)}%`, 
      percent: ram,
      color: 'var(--neon-cyan)',
      textColor: 'var(--neon-cyan-text)'
    },
    { 
      icon: Monitor, 
      label: 'GPU', 
      value: `${gpu.toFixed(0)}%`, 
      percent: gpu,
      color: 'var(--neon-purple)',
      textColor: 'var(--neon-purple-text)'
    },
    { 
      icon: Wifi, 
      label: 'Réseau', 
      value: formatSpeed(network.download_speed), 
      percent: getNetworkPercentage(),
      isNetwork: true,
      color: 'var(--neon-turquoise)',
      textColor: 'var(--neon-turquoise-text)'
    },
  ];
  return (
    <NeonBentoCard className="!flex-row flex-wrap justify-center items-center p-4 gap-4" delay={0.1}>
      <div className="flex flex-wrap justify-center items-center gap-4 w-full">
        {stats.map((stat, index) => {
          // Circular Progress Ring calculations
          const radius = 16;
          const strokeWidth = 2.5;
          const circumference = 2 * Math.PI * radius;
          const percentValue = stat.isNetwork && stat.percent > 0 ? Math.max(25, stat.percent) : stat.percent;
          const strokeDashoffset = circumference - (percentValue / 100) * circumference;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ stiffness: 100, damping: 20, type: 'spring', delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-4 py-2.5 px-4 rounded-2xl bg-[var(--background-accent)]/45 border border-white/5 shadow-md backdrop-blur-md relative overflow-hidden group transition-all"
            >
              {/* Radial Progress Circle with centered Lucide Icon */}
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90">
                  {/* Outer circle track */}
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* Glowing progress arc */}
                  <motion.circle
                    cx="22"
                    cy="22"
                    r={radius}
                    stroke={stat.color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 3px ${stat.color}88)`,
                    }}
                  />
                </svg>
                {/* Centered Icon */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: stat.color }}>
                  <stat.icon size={15} />
                </div>
              </div>

              {/* Stat Info */}
              <div className="z-10 relative">
                <p className="text-[9px] uppercase font-black tracking-widest opacity-60 mb-0.5">
                  {stat.label}
                </p>
                <p 
                  className="text-base font-bold mono-text tracking-tight"
                  style={{ color: stat.textColor, textShadow: `0 0 10px ${stat.color}22` }}
                >
                  {stat.value}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Uptime Component - Centered & Harmonized inside the grid flow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ stiffness: 100, damping: 20, type: 'spring', delay: 0.6 }}
          whileHover={{ scale: 1.03 }}
          className="flex items-center gap-4 py-2.5 px-4 rounded-2xl bg-[var(--background-accent)]/45 border border-white/5 shadow-md backdrop-blur-md relative overflow-hidden group transition-all"
        >
          {/* Glowing Clock icon inside a breathing/pulsing green ring (placed on the left) */}
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0 text-[var(--neon-green)]">
            <svg className="w-11 h-11 -rotate-90">
              <circle
                cx="22"
                cy="22"
                r={16}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={2.5}
                fill="transparent"
              />
              {/* Pulsing Uptime visual pulse */}
              <motion.circle
                cx="22"
                cy="22"
                r={16}
                stroke="var(--neon-green)"
                strokeWidth={2.5}
                fill="transparent"
                strokeDasharray={2 * Math.PI * 16}
                animate={{ 
                  strokeDashoffset: [0, 2 * Math.PI * 16],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4, 
                  ease: "linear" 
                }}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px var(--neon-green))`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>

          {/* Uptime Info (placed on the right) */}
          <div className="z-10 relative text-left">
            <p className="text-[9px] uppercase font-black tracking-widest opacity-60 mb-0.5" style={{ color: 'var(--neon-green-text)' }}>
              Système Uptime
            </p>
            <p className="text-base font-bold mono-text tracking-tight text-[var(--neon-green-text)]" style={{ textShadow: `0 0 10px var(--neon-green)22` }}>
              {formatUptime(liveUptime)}
            </p>
          </div>
        </motion.div>
      </div>
    </NeonBentoCard>
  );
}