import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface PillContainerProps {
  children: React.ReactNode;
  onClose: () => void;
  onOpenMain: () => void;
}

export const PillContainer: React.FC<PillContainerProps> = ({ children, onClose, onOpenMain }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Drag uniquement avec le clic gauche, sans bloquer les autres événements
    if (e.button === 0) {
      getCurrentWindow().startDragging();
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      className="relative rounded-[2rem] border border-[var(--border)] overflow-hidden shadow-2xl backdrop-blur-md bg-[var(--surface-inset)] select-none transition-colors hover:border-[var(--border-strong)]"
      data-tauri-drag-region="true"
    >
      {/* Clickable area for opening main window */}
      <div
        className="cursor-pointer pl-6 pr-10 py-4 flex flex-col justify-center"
        onClick={onOpenMain}
        title="Ouvrir Koi Monitor"
        aria-label="Ouvrir Koi Monitor"
        role="button"
        tabIndex={0}
      >
        {children}
      </div>

      {/* Close button that appears on hover */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 right-3 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-5 h-5 rounded-full bg-black/40 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Masquer le widget"
          aria-label="Masquer le widget"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
