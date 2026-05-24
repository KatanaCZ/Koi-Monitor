import React from 'react';
import { useAppStore } from '../../store';
import { NotificationPanel } from './NotificationPanel';
import { StatusToast } from './StatusToast';

/** Couche fixe au-dessus du dashboard / Zen — évite le masquage par les bento cards. */
export const NotificationLayer: React.FC = () => {
  const notificationPanelOpen = useAppStore((s) => s.notificationPanelOpen);
  const setNotificationPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);

  return (
    <div className="fixed inset-0 z-[10050] pointer-events-none isolate">
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />
      <StatusToast />
    </div>
  );
};
