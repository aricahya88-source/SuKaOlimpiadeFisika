'use client';

import { X } from 'lucide-react';

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon">✓</div><h3>{title}</h3><p>{description}</p></div>;
}

export function Modal({ open, title, onClose, children, size = 'medium' }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; size?: 'small'|'medium'|'large' }) {
  if (!open) return null;
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}><button className="modal-backdrop" onClick={onClose} aria-label="Tutup"/><section className={`modal-card ${size}`}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={20}/></button></header><div className="modal-body">{children}</div></section></div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}

export function Skeleton({ height = 100 }: { height?: number }) { return <div className="skeleton" style={{ height }} />; }
