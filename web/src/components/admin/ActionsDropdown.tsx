'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
};

export function ActionsDropdown({
  actions,
  'aria-label': ariaLabel = 'Actions',
}: {
  actions: ActionItem[];
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (btnRef.current && typeof window !== 'undefined') {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.min(rect.right - 180, window.innerWidth - 188);
      setPosition({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
  };

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) {
      document.addEventListener('click', handleClickOutside);
      updatePosition();
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-button hover:bg-neutral-mist text-neutral-slate"
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && position && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] py-1 bg-neutral-white rounded-card border border-neutral-outline shadow-card"
            style={{ top: position.top, left: position.left }}
          >
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => {
                  a.onClick();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                  a.danger ? 'text-student-coral hover:bg-red-50' : 'text-neutral-carbon hover:bg-neutral-mist'
                }`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
