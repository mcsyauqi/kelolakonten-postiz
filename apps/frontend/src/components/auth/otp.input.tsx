'use client';

import { FC, KeyboardEvent, useCallback, useRef } from 'react';
import { clsx } from 'clsx';

const LENGTH = 6;

export const OtpInput: FC<{
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}> = ({ value, onChange, label, error, disabled, autoFocus }) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // empty slots are kept as spaces so clearing a middle digit doesn't shift the rest
  const digits = Array.from({ length: LENGTH }, (_, i) =>
    (value[i] || '').trim()
  );
  const emit = useCallback(
    (next: string[]) => onChange(next.map((d) => d || ' ').join('').trimEnd()),
    [onChange]
  );

  const focus = useCallback((index: number) => {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }, []);

  const fill = useCallback(
    (index: number, typed: string) => {
      const clean = typed.replace(/\D/g, '');
      if (!clean) {
        return;
      }
      const next = digits.slice();
      clean
        .slice(0, LENGTH - index)
        .split('')
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      emit(next.slice(0, LENGTH));
      focus(index + clean.length);
    },
    [digits, emit, focus]
  );

  const onKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = digits.slice();
        if (next[index]) {
          next[index] = '';
        } else if (index > 0) {
          next[index - 1] = '';
          focus(index - 1);
        }
        emit(next);
      } else if (e.key === 'ArrowLeft') {
        focus(index - 1);
      } else if (e.key === 'ArrowRight') {
        focus(index + 1);
      }
    },
    [digits, emit, focus]
  );

  return (
    <div className="flex flex-col gap-[6px]">
      {!!label && <div className="text-[14px]">{label}</div>}
      <div className="flex gap-[8px]" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={LENGTH}
            aria-label={`${label || ''} ${index + 1}`.trim()}
            onChange={(e) => fill(index, e.target.value)}
            onKeyDown={onKeyDown(index)}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => {
              e.preventDefault();
              fill(index, e.clipboardData.getData('text'));
            }}
            className={clsx(
              'w-[44px] h-[52px] text-center text-[20px] font-[600] bg-newBgColorInner border rounded-[8px] text-textColor outline-none focus:border-btnPrimary',
              error ? 'border-red-400' : 'border-newTableBorder'
            )}
          />
        ))}
      </div>
      <div className="text-red-400 text-[12px]">{error || <>&nbsp;</>}</div>
    </div>
  );
};
