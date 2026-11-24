import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from '@/components/ui/Segmented';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ConfirmProvider, useConfirm } from '@/context/ConfirmContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { SwatchPicker } from '@/components/common/SwatchPicker';
import { ACCENT_PRESETS } from '@/lib/theme';
import { wrapLabel } from '@/components/charts/chartSetup';

// jsdom has no <dialog> modal support; emulate the parts the Modal relies on.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};

describe('Field', () => {
  it('links label, hint and error to the control for assistive tech', () => {
    render(<Input label="Amount" error="Enter an amount." hint="ignored while an error shows" />);
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    expect(screen.queryByText(/ignored while/)).toBeNull();
  });
});

describe('Segmented', () => {
  it('supports roving tabindex and arrow-key selection', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<'a' | 'b' | 'c'>('a');
      return (
        <Segmented
          label="Pick"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
          ]}
        />
      );
    }
    render(<Harness />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    radios[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('a'); // wraps
  });
});

describe('SwatchPicker', () => {
  it('marks the current preset and reports picks', async () => {
    const onChange = vi.fn();
    render(<SwatchPicker label="Accent" value={ACCENT_PRESETS[0]!.value} onChange={onChange} swatches={ACCENT_PRESETS} />);
    expect(screen.getByRole('radio', { name: 'Emerald' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Violet' }));
    expect(onChange).toHaveBeenCalledWith(ACCENT_PRESETS[2]!.value);
  });
});

describe('ConfirmProvider', () => {
  function Harness({ onResult }: { onResult: (value: boolean) => void }) {
    const confirm = useConfirm();
    return (
      <Button onClick={async () => onResult(await confirm({ title: 'Delete it?', requireText: 'DELETE', confirmLabel: 'Delete', tone: 'danger' }))}>Open</Button>
    );
  }

  it('resolves false on cancel and true only after the required text is typed', async () => {
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(value) => results.push(value)} />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(results).toEqual([false]));

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const confirmButton = await screen.findByRole('button', { name: 'Delete' });
    expect(confirmButton).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    expect(confirmButton).toBeEnabled();
    await userEvent.click(confirmButton);
    await waitFor(() => expect(results).toEqual([false, true]));
  });
});

describe('ToastProvider', () => {
  it('announces toasts and lets people dismiss them', async () => {
    function Harness() {
      const toast = useToast();
      return <Button onClick={() => toast.error('Something broke')}>Fire</Button>;
    }
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something broke');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('chart label wrapping', () => {
  it('leaves short labels alone and wraps long ones', () => {
    expect(wrapLabel('Bills')).toBe('Bills');
    expect(wrapLabel('Food & Drinks')).toEqual(['Food &', 'Drinks']);
    expect(Array.isArray(wrapLabel('A very long category name indeed here'))).toBe(true);
  });
});
