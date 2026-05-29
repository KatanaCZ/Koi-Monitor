import { useEffect } from 'react';
import { useAppStore } from '../store';

interface KeyboardNavigationProps {
  isSettingsOpen: boolean;
  expandedWidget: 'dns' | 'drivers' | null;
  setExpandedWidget: (widget: 'dns' | 'drivers' | null) => void;
}

export const useKeyboardNavigation = ({
  isSettingsOpen,
  expandedWidget,
  setExpandedWidget,
}: KeyboardNavigationProps) => {
  const zenMode = useAppStore((s) => s.zenMode);
  const setZenMode = useAppStore((s) => s.setZenMode);
  const notificationPanelOpen = useAppStore((s) => s.notificationPanelOpen);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);

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
  }, [expandedWidget, setExpandedWidget]);
};
