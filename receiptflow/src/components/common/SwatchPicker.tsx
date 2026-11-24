import { useId } from 'react';
import { Check } from 'lucide-react';
import { normalizeHex, readableOn } from '@/lib/color';
import { cn } from '@/lib/cn';
import type { Swatch } from '@/lib/theme';

interface SwatchPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches: Swatch[];
  allowCustom?: boolean;
  /** Hides the visible label (it stays available to screen readers). */
  hideLabel?: boolean;
  className?: string;
}

/** A radio-group of colour swatches, with an optional free colour picker. */
export function SwatchPicker({ label, value, onChange, swatches, allowCustom = true, hideLabel, className }: SwatchPickerProps) {
  const current = normalizeHex(value) ?? value;
  const isPreset = swatches.some((swatch) => swatch.value.toLowerCase() === current.toLowerCase());
  const customId = useId();

  return (
    <div className={className}>
      <p id={`${customId}-label`} className={cn('mb-2 text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`${customId}-label`} className="flex flex-wrap items-center gap-2.5">
        {swatches.map((swatch) => {
          const selected = swatch.value.toLowerCase() === current.toLowerCase();
          return (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={swatch.label}
              title={swatch.label}
              onClick={() => onChange(swatch.value)}
              style={{ backgroundColor: swatch.value, color: readableOn(swatch.value) }}
              className={cn(
                'grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow',
                selected ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-line-strong',
              )}
            >
              {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
        {allowCustom && (
          <label
            title="Custom colour"
            className={cn(
              'relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-surface transition-shadow focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent',
              !isPreset ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-line-strong',
            )}
            style={{
              background: isPreset
                ? 'conic-gradient(from 0deg, #e5484d, #f5a524, #46a758, #3e63dd, #8e4ec6, #e5484d)'
                : current,
              color: isPreset ? '#fff' : readableOn(current),
            }}
          >
            <span className="sr-only">Custom colour</span>
            {!isPreset && <Check className="pointer-events-none size-4" strokeWidth={3} aria-hidden="true" />}
            <input
              type="color"
              value={normalizeHex(current) ?? '#17805a'}
              onChange={(event) => onChange(event.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={`${label}: custom colour`}
            />
          </label>
        )}
      </div>
    </div>
  );
}
