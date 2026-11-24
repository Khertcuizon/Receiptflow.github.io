import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-fg', className)}>
      <svg viewBox="0 0 24 24" className="size-[1.2rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3.75h7.2L19 8.6v11.65H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" />
        <path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" />
      </svg>
    </span>
  );
}

interface LogoProps {
  to?: string;
  showName?: boolean;
  className?: string;
}

export function Logo({ to = '/', showName = true, className }: LogoProps) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg font-display text-[1.15rem] font-semibold tracking-tight', className)} aria-label="ReceiptFlow home">
      <BrandMark />
      {showName && <span>ReceiptFlow</span>}
    </Link>
  );
}
