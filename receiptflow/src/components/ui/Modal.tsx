import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hides the visible title (it stays available to screen readers). */
  hideTitle?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

let openCount = 0;

/** Accessible modal built on the native <dialog>: focus trap, Esc to close, focus restore. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', hideTitle = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      dialog.showModal();
      openCount += 1;
      document.body.style.overflow = 'hidden';
      return () => {
        openCount = Math.max(0, openCount - 1);
        if (openCount === 0) document.body.style.overflow = '';
        if (dialog.open) dialog.close();
      };
    }
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        // A press on the backdrop (the dialog element itself) dismisses it.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-visible rounded-panel border border-line bg-surface p-0 text-ink shadow-pop',
        'backdrop:bg-[rgb(8_14_11/0.55)] backdrop:backdrop-blur-[2px]',
        SIZES[size],
      )}
    >
      {open && (
        <div className="popover-enter flex max-h-[calc(100dvh-2rem)] flex-col" style={{ transformOrigin: 'center' }}>
          <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', hideTitle && 'sr-only')}>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-semibold leading-snug">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          {children && <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
