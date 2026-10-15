'use client';

import {
  DetailedHTMLProps,
  FC,
  InputHTMLAttributes,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { TranslatedLabel } from '../translation/translated-label';
import { useT } from '../translation/get.transation.service.client';

export const Input: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    removeError?: boolean;
    error?: any;
    disableForm?: boolean;
    customUpdate?: () => void;
    label: string;
    name: string;
    icon?: ReactNode;
    translationKey?: string;
    translationParams?: Record<string, string | number>;
  }
> = (props) => {
  const {
    label,
    icon,
    removeError,
    customUpdate,
    className,
    disableForm,
    error,
    translationKey,
    translationParams,
    ...rest
  } = props;
  const t = useT();
  const form = useFormContext();
  const isPassword = rest.type === 'password';
  const [revealed, setRevealed] = useState(false);
  const err = useMemo(() => {
    if (error) return error;
    if (!form || !form.formState.errors[props?.name!]) return;
    return form?.formState?.errors?.[props?.name!]?.message! as string;
  }, [form?.formState?.errors?.[props?.name!]?.message, error]);
  const watch = customUpdate ? form?.watch(props.name) : null;
  useEffect(() => {
    if (customUpdate) {
      customUpdate();
    }
  }, [watch]);
  return (
    <div className="flex flex-col gap-[6px]">
      {!!label && (
        <div className={`text-[14px]`}>
          <TranslatedLabel
            label={label}
            translationKey={translationKey}
            translationParams={translationParams}
          />
        </div>
      )}
      <div
        className={clsx(
          'bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor flex items-center justify-center',
          className
        )}
      >
        {icon && <div className="ps-[16px]">{icon}</div>}
        <input
          className={clsx(
            'h-full bg-transparent outline-none flex-1 text-[14px] text-textColor',
            icon ? 'pl-[8px] pe-[16px]' : 'px-[16px]',
            isPassword && 'pe-[4px]'
          )}
          {...(disableForm ? {} : form.register(props.name))}
          {...rest}
          {...(isPassword ? { type: revealed ? 'text' : 'password' } : {})}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={
              revealed
                ? t('hide_password', 'Hide password')
                : t('show_password', 'Show password')
            }
            aria-pressed={revealed}
            className="h-full px-[12px] flex items-center text-textItemBlur hover:text-textColor"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
              {revealed && <line x1="3" y1="3" x2="21" y2="21" />}
            </svg>
          </button>
        )}
      </div>
      {!removeError && (
        <div className="text-red-400 text-[12px]">{err || <>&nbsp;</>}</div>
      )}
    </div>
  );
};
