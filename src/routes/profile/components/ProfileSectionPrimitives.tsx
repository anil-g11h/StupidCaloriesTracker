import React from 'react';

export function OptionCard({
  title,
  subtitle,
  isOpen,
  onToggle,
  children
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-surface transition-colors"
      >
        <div>
          <h2 className="text-base font-bold text-text-main">{title}</h2>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        <span className="text-text-muted text-sm font-bold">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="p-4 border-t border-border-subtle">{children}</div>}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
