import { cn } from '@/lib/cn';

const hl = (delay: number) => ({ '--d': `${delay}s` }) as React.CSSProperties;

/**
 * The product in one picture: a receipt, a scan pass, and what the scan found.
 * Everything here is illustrative sample content, not account data.
 */
export function ReceiptScan({ className }: { className?: string }) {
  return (
    <div className={cn('relative mx-auto w-full max-w-[28rem] pb-4 sm:pb-20', className)}>
      <div className="relative w-[17.5rem] max-w-full -rotate-2 sm:w-[18.5rem]">
        <div className="receipt-paper rounded-t-xl px-5 pb-7 pt-6 font-mono text-[12px] leading-relaxed shadow-pop">
          <div className="text-center">
            <p className="font-display text-[15px] font-semibold">
              <span className="hl" style={hl(1.4)}>
                Kape Kabisera
              </span>
            </p>
            <p className="text-[11px] text-paper-faint">Official receipt · No. 004281</p>
          </div>
          <div className="perforation my-3.5" />
          <dl className="flex flex-col gap-1 tabular-nums">
            {[
              ['Iced latte ×2', '190.00'],
              ['Ensaymada ×1', '65.00'],
              ['Pandesal ×6', '36.00'],
            ].map(([item, price]) => (
              <div key={item} className="flex justify-between gap-3">
                <dt>{item}</dt>
                <dd>{price}</dd>
              </div>
            ))}
          </dl>
          <div className="perforation my-3.5" />
          <div className="flex justify-between text-paper-faint tabular-nums">
            <span>VAT included</span>
            <span>31.18</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-display text-base font-semibold tabular-nums">
            <span>Total</span>
            <span className="hl" style={hl(1.9)}>
              ₱291.00
            </span>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-paper-faint">
            <span>
              <span className="hl" style={hl(1.65)}>
                21/11/2026
              </span>
            </span>
            <span>Paid · Cash</span>
          </div>
          <div aria-hidden="true" className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent shadow-[0_0_14px_2px_var(--accent)]" />
        </div>
      </div>

      <div
        className="result-in relative z-10 -mt-5 ml-auto mr-0 w-64 max-w-[92%] rounded-panel border border-line bg-surface p-4 shadow-pop sm:absolute sm:-right-4 sm:bottom-0 sm:mt-0"
        style={{ '--d': '2.3s' } as React.CSSProperties}
      >
        <p className="text-[13px] font-medium text-ink-muted">Ready to save</p>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Merchant</dt>
            <dd className="font-medium">Kape Kabisera</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Date</dt>
            <dd className="font-medium">Nov 21, 2026</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Total</dt>
            <dd className="font-display text-base font-semibold tabular-nums text-accent-ink">₱291.00</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
