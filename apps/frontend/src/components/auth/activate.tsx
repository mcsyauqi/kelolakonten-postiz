'use client';

import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useCookie from 'react-use-cookie';
import { OtpInput } from '@gitroom/frontend/components/auth/otp.input';

type Inputs = {
  email: string;
};

const COOLDOWN_SECONDS = 60;

export function Activate() {
  const t = useT();
  const fetch = useFetch();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [datafast_visitor_id] = useCookie('datafast_visitor_id');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  // arriving from registration means a code was just sent
  const justSent = searchParams.get('sent') === '1';
  const [cooldown, setCooldown] = useState(justSent ? COOLDOWN_SECONDS : 0);
  const form = useForm<Inputs>({ defaultValues: { email: initialEmail } });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = useCallback(async () => {
    const valid = await form.trigger('email');
    if (!valid) return;
    await fetch('/auth/resend-activation', {
      method: 'POST',
      body: JSON.stringify({ email: form.getValues('email') }),
    });
    setResent(true);
    setCooldown(COOLDOWN_SECONDS);
  }, [form, fetch]);

  const submit = useCallback(async () => {
    const valid = await form.trigger('email');
    if (!valid) return;
    if (!/^\d{6}$/.test(code)) {
      setCodeError(t('enter_6_digit_code', 'Enter the 6-digit code'));
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      const response = await fetch('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          email: form.getValues('email'),
          code,
          datafast_visitor_id,
        }),
      });
      // on success the onboarding header redirects into the app
      if (response.headers.get('onboarding')) {
        return;
      }
      if (response.status === 429) {
        setCodeError(
          t('too_many_attempts', 'Too many attempts. Try again later.')
        );
        return;
      }
      setCode('');
      setCodeError(
        t(
          'invalid_or_expired_code',
          'The code is wrong or expired. Check the latest email or request a new code.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [form, code, datafast_visitor_id, fetch, t]);

  return (
    <div className="flex flex-col flex-1">
      <h1 className="text-3xl font-bold text-start mb-4">
        {t('activate_your_account', 'Activate your account')}
      </h1>
      <div className="text-textColor mb-6">
        {t(
          'activation_code_instructions',
          'We sent a 6-digit code to your email. Enter it below to activate your account.'
        )}
      </div>

      <FormProvider {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label={t('label_email', 'Email')}
            translationKey="label_email"
            {...form.register('email', {
              required: t('email_is_required', 'Email is required'),
            })}
            type="email"
            placeholder={t('email_address', 'Email Address')}
          />
          <OtpInput
            label={t('verification_code', 'Verification code')}
            value={code}
            onChange={(value) => {
              setCode(value);
              setCodeError('');
            }}
            error={codeError}
            autoFocus={!!initialEmail}
          />
          <Button
            type="submit"
            className="rounded-[10px] !h-[52px]"
            loading={loading}
          >
            {t('activate_account', 'Activate account')}
          </Button>
        </form>
      </FormProvider>

      <div className="mt-6 text-sm text-textColor flex flex-col gap-2">
        {resent && (
          <div className="text-green-400">
            {t(
              'new_code_sent',
              'If the address has an account that is not active yet, a new code is on its way.'
            )}
          </div>
        )}
        <div>
          {t('didnt_receive_code', "Didn't receive the code?")}&nbsp;
          {cooldown > 0 ? (
            <span>
              {t('resend_available_in', 'You can resend in')} {cooldown}s
            </span>
          ) : (
            <button type="button" onClick={resend} className="underline">
              {t('send_new_code', 'Send a new code')}
            </button>
          )}
        </div>
        <div>
          {t('already_activated', 'Already activated?')}&nbsp;
          <Link href="/auth/login" className="underline">
            {t('sign_in', 'Sign In')}
          </Link>
        </div>
      </div>
    </div>
  );
}
