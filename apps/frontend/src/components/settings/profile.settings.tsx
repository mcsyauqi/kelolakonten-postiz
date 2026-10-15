'use client';

import React, {
  FC,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useSWR from 'swr';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { OtpInput } from '@gitroom/frontend/components/auth/otp.input';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/users/change.password.dto';

const COOLDOWN_SECONDS = 60;

interface Account {
  email: string;
  hasPassword: boolean;
}

export const useAccount = () => {
  const fetch = useFetch();

  const load = useCallback(async () => {
    return (await fetch('/user/account')).json();
  }, []);

  return useSWR<Account>('user-account', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

const useErrorText = () => {
  const t = useT();
  return useCallback(
    (code: string) => {
      switch (code) {
        case 'wrong_password':
          return t('error_wrong_password', 'The password is wrong');
        case 'email_taken':
          return t(
            'error_email_taken',
            'This email is already used by another account'
          );
        case 'email_plus_not_allowed':
          return t(
            'error_email_plus_not_allowed',
            'Email addresses with a plus sign are not allowed'
          );
        case 'same_email':
          return t('error_same_email', 'This is already your email');
        case 'otp_cooldown':
          return t(
            'error_otp_cooldown',
            'Wait a minute before requesting a new code'
          );
        case 'otp_limit':
          return t(
            'error_otp_limit',
            'Too many codes requested. Try again in an hour'
          );
        case 'no_pending_change':
          return t(
            'error_no_pending_change',
            'The request expired. Start the email change again'
          );
        case 'invalid_old_code':
          return t(
            'error_invalid_old_code',
            'The code from your current email is wrong or expired'
          );
        case 'invalid_new_code':
          return t(
            'error_invalid_new_code',
            'The code from your new email is wrong or expired'
          );
        case 'invalid_codes':
          return t('error_invalid_codes', 'Both codes are wrong or expired');
        default:
          return t('error_occurred', 'An error occurred. Please try again.');
      }
    },
    [t]
  );
};

const readError = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  const message = Array.isArray(body?.message)
    ? body.message[0]
    : body?.message;
  return String(message || '');
};

// Enter in a field of these sections must not submit the surrounding settings
// form; Enter on a button keeps its own action
const onEnter = (action: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
    e.preventDefault();
    action();
  }
};

const Section: FC<{
  title: string;
  description?: string;
  children: ReactNode;
}> = ({ title, description, children }) => (
  <div className="bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
    <div className="flex flex-col gap-[4px]">
      <div className="text-[16px]">{title}</div>
      {!!description && (
        <div className="text-[12px] text-textItemBlur">{description}</div>
      )}
    </div>
    {children}
  </div>
);

const PersonalSection: FC = () => {
  const t = useT();
  const form = useFormContext();
  const picture = form.watch('picture');

  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      form.setValue('picture', values);
    });
  }, [form]);

  return (
    <Section title={t('profile', 'Profile')}>
      <div className="flex items-center gap-[16px]">
        {picture?.path ? (
          <img
            src={picture.path}
            alt=""
            className="w-[64px] h-[64px] rounded-full object-cover"
          />
        ) : (
          <div className="w-[64px] h-[64px] rounded-full bg-newBgColorInner border border-newTableBorder" />
        )}
        <div className="flex gap-[8px]">
          <Button type="button" onClick={openMedia}>
            {t('change_photo', 'Change photo')}
          </Button>
          {!!picture?.path && (
            <Button
              type="button"
              secondary
              onClick={() => form.setValue('picture', null)}
            >
              {t('remove', 'Remove')}
            </Button>
          )}
        </div>
      </div>
      <Input
        label={t('label_full_name', 'Full name')}
        translationKey="label_full_name"
        name="fullname"
        placeholder={t('label_full_name', 'Full name')}
      />
      <div>
        <Button type="submit">{t('save', 'Save')}</Button>
      </div>
    </Section>
  );
};

type EmailInputs = {
  email: string;
  password: string;
};

const EmailSection: FC<{ account: Account; onChanged: () => void }> = ({
  account,
  onChanged,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const errorText = useErrorText();
  const form = useForm<EmailInputs>();
  const [step, setStep] = useState<'idle' | 'form' | 'codes'>('idle');
  const [pendingEmail, setPendingEmail] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [codesError, setCodesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const reset = useCallback(() => {
    form.reset({ email: '', password: '' });
    setOldCode('');
    setNewCode('');
    setCodesError('');
    setPendingEmail('');
    setStep('idle');
  }, [form]);

  const start = useCallback(async () => {
    const { email, password } = form.getValues();
    if (!/^\S+@\S+\.\S+$/.test(email || '')) {
      form.setError('email', {
        message: t('error_invalid_email', 'Enter a valid email address'),
      });
      return;
    }
    if (account.hasPassword && !password) {
      form.setError('password', {
        message: t('error_password_required', 'Enter your password'),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/user/email/start', {
        method: 'POST',
        body: JSON.stringify(
          account.hasPassword ? { email, password } : { email }
        ),
      });
      if (response.status !== 200 && response.status !== 201) {
        const code = await readError(response);
        form.setError(code === 'wrong_password' ? 'password' : 'email', {
          message: errorText(code),
        });
        return;
      }
      const data = await response.json();
      setPendingEmail(data.email);
      setCooldown(COOLDOWN_SECONDS);
      setStep('codes');
    } finally {
      setLoading(false);
    }
  }, [account, form, errorText, fetch, t]);

  const resend = useCallback(async () => {
    const response = await fetch('/user/email/resend', { method: 'POST' });
    if (response.status !== 200 && response.status !== 201) {
      setCodesError(errorText(await readError(response)));
      return;
    }
    setCodesError('');
    setCooldown(COOLDOWN_SECONDS);
  }, [errorText, fetch]);

  const confirm = useCallback(async () => {
    if (!/^\d{6}$/.test(oldCode) || !/^\d{6}$/.test(newCode)) {
      setCodesError(
        t('error_enter_both_codes', 'Enter both 6-digit codes')
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/user/email/confirm', {
        method: 'POST',
        body: JSON.stringify({ oldCode, newCode }),
      });
      if (response.status !== 200 && response.status !== 201) {
        setCodesError(errorText(await readError(response)));
        return;
      }
      toaster.show(t('email_changed', 'Your email has been changed'), 'success');
      reset();
      onChanged();
    } finally {
      setLoading(false);
    }
  }, [oldCode, newCode, errorText, reset, onChanged, fetch, toaster, t]);

  return (
    <Section
      title={t('email', 'Email')}
      description={t(
        'change_email_description',
        'To change it, confirm the codes sent to your current and your new email.'
      )}
    >
      <div className="flex items-center justify-between gap-[16px]">
        <div className="text-[14px] break-all">{account.email}</div>
        {step === 'idle' && (
          <Button type="button" onClick={() => setStep('form')}>
            {t('change_email', 'Change email')}
          </Button>
        )}
      </div>

      {step === 'form' && (
        <FormProvider {...form}>
          <div className="flex flex-col gap-[4px]" onKeyDown={onEnter(start)}>
            <Input
              label={t('label_new_email', 'New email')}
              translationKey="label_new_email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('email_address', 'Email Address')}
            />
            {account.hasPassword && (
              <Input
                label={t('label_current_password', 'Current password')}
                translationKey="label_current_password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={t('label_password', 'Password')}
              />
            )}
            <div className="flex gap-[8px]">
              <Button type="button" loading={loading} onClick={start}>
                {t('send_codes', 'Send codes')}
              </Button>
              <Button
                type="button"
                secondary
                onClick={reset}
              >
                {t('cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </FormProvider>
      )}

      {step === 'codes' && (
        <div className="flex flex-col gap-[8px]" onKeyDown={onEnter(confirm)}>
          <OtpInput
            label={t('code_from_email', 'Code sent to {{email}}', {
              email: account.email,
            })}
            value={oldCode}
            onChange={(value) => {
              setOldCode(value);
              setCodesError('');
            }}
            autoFocus
          />
          <OtpInput
            label={t('code_from_email', 'Code sent to {{email}}', {
              email: pendingEmail,
            })}
            value={newCode}
            onChange={(value) => {
              setNewCode(value);
              setCodesError('');
            }}
            error={codesError}
          />
          <div className="flex gap-[8px] items-center flex-wrap">
            <Button type="button" loading={loading} onClick={confirm}>
              {t('confirm_email_change', 'Confirm email change')}
            </Button>
            <Button
              type="button"
              secondary
              onClick={reset}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <div className="text-[12px] text-textItemBlur">
              {cooldown > 0 ? (
                <>
                  {t('resend_available_in', 'You can resend in')} {cooldown}s
                </>
              ) : (
                <button type="button" className="underline" onClick={resend}>
                  {t('send_new_codes', 'Send new codes')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};

type PasswordInputs = {
  currentPassword: string;
  password: string;
  repeatPassword: string;
};

const PasswordSection: FC<{ account: Account; onChanged: () => void }> = ({
  account,
  onChanged,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const errorText = useErrorText();
  const resolver = useMemo(() => classValidatorResolver(ChangePasswordDto), []);
  const form = useForm<PasswordInputs>({ resolver });
  const [loading, setLoading] = useState(false);

  const save = useCallback(
    () =>
      form.handleSubmit(async (values) => {
        if (account.hasPassword && !values.currentPassword) {
          form.setError('currentPassword', {
            message: t('error_password_required', 'Enter your password'),
          });
          return;
        }

        setLoading(true);
        try {
          const response = await fetch('/user/password', {
            method: 'POST',
            body: JSON.stringify(values),
          });
          if (response.status !== 200 && response.status !== 201) {
            const code = await readError(response);
            form.setError(
              code === 'wrong_password' ? 'currentPassword' : 'password',
              { message: errorText(code) }
            );
            return;
          }
          toaster.show(
            t('password_changed', 'Your password has been changed'),
            'success'
          );
          form.reset({ currentPassword: '', password: '', repeatPassword: '' });
          onChanged();
        } finally {
          setLoading(false);
        }
      })(),
    [account, form, errorText, onChanged, fetch, toaster, t]
  );

  return (
    <Section
      title={
        account.hasPassword
          ? t('change_password', 'Change Password')
          : t('create_password', 'Create password')
      }
      description={
        account.hasPassword
          ? undefined
          : t(
              'create_password_description',
              'Your account signs in with a social login. Add a password to also sign in with your email.'
            )
      }
    >
      <FormProvider {...form}>
        <div className="flex flex-col gap-[4px]" onKeyDown={onEnter(save)}>
          {account.hasPassword && (
            <Input
              label={t('label_current_password', 'Current password')}
              translationKey="label_current_password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder={t('label_password', 'Password')}
            />
          )}
          <Input
            label="New Password"
            translationKey="label_new_password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('label_password', 'Password')}
          />
          <Input
            label="Repeat Password"
            translationKey="label_repeat_password"
            name="repeatPassword"
            type="password"
            autoComplete="new-password"
            placeholder={t('label_repeat_password', 'Repeat Password')}
          />
          <div>
            <Button type="button" loading={loading} onClick={save}>
              {account.hasPassword
                ? t('change_password', 'Change Password')
                : t('create_password', 'Create password')}
            </Button>
          </div>
        </div>
      </FormProvider>
    </Section>
  );
};

export const ProfileSettings: FC = () => {
  const t = useT();
  const { data: account, mutate } = useAccount();

  return (
    <div className="flex flex-col gap-[16px]">
      <h3 className="text-[20px]">{t('profile', 'Profile')}</h3>
      <PersonalSection />
      {!!account && (
        <>
          <EmailSection account={account} onChanged={() => mutate()} />
          <PasswordSection account={account} onChanged={() => mutate()} />
        </>
      )}
    </div>
  );
};
