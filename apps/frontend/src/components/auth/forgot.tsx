'use client';

import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import Link from 'next/link';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ForgotPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot.password.dto';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { OtpInput } from '@gitroom/frontend/components/auth/otp.input';

type EmailInputs = {
  email: string;
};

type ResetInputs = {
  email: string;
  code: string;
  password: string;
  repeatPassword: string;
};

const COOLDOWN_SECONDS = 60;

export function Forgot() {
  const t = useT();
  const fetchData = useFetch();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailResolver = useMemo(
    () => classValidatorResolver(ForgotPasswordDto),
    []
  );
  const resetResolver = useMemo(
    () => classValidatorResolver(ForgotReturnPasswordDto),
    []
  );
  const emailForm = useForm<EmailInputs>({ resolver: emailResolver });
  const resetForm = useForm<ResetInputs>({
    resolver: resetResolver,
    defaultValues: { code: '' },
  });
  const code = resetForm.watch('code');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendCode = useCallback(
    async (email: string) => {
      await fetchData('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      resetForm.setValue('email', email);
      setCooldown(COOLDOWN_SECONDS);
    },
    [resetForm, fetchData]
  );

  const onEmail: SubmitHandler<EmailInputs> = async (data) => {
    setLoading(true);
    try {
      await sendCode(data.email);
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const onReset: SubmitHandler<ResetInputs> = async (data) => {
    setLoading(true);
    try {
      const { reset } = await (
        await fetchData('/auth/forgot-return', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      ).json();
      if (!reset) {
        resetForm.setValue('code', '');
        resetForm.setError('code', {
          type: 'manual',
          message: t(
            'invalid_or_expired_code',
            'The code is wrong or expired. Check the latest email or request a new code.'
          ),
        });
        return;
      }
      setStep('done');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-3xl font-bold text-start mb-4">
        {t('forgot_password_1', 'Forgot Password')}
      </h1>

      {step === 'email' && (
        <FormProvider {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmail)}>
            <div className="text-textColor mb-4">
              {t(
                'forgot_password_instructions',
                "Enter your account email. We'll send a 6-digit code to reset your password."
              )}
            </div>
            <Input
              label="Email"
              translationKey="label_email"
              {...emailForm.register('email')}
              type="email"
              placeholder={t('email_address', 'Email Address')}
            />
            <div className="w-full flex mt-6">
              <Button
                type="submit"
                className="flex-1 !h-[52px] !rounded-[10px]"
                loading={loading}
              >
                {t('send_code', 'Send code')}
              </Button>
            </div>
          </form>
        </FormProvider>
      )}

      {step === 'code' && (
        <FormProvider {...resetForm}>
          <form
            onSubmit={resetForm.handleSubmit(onReset)}
            className="flex flex-col gap-4"
          >
            <div className="text-textColor">
              {t(
                'reset_code_sent_to',
                'If {{email}} has an account, a 6-digit code was sent to it. Enter it with your new password.',
                { email: resetForm.getValues('email') }
              )}
            </div>
            <OtpInput
              label={t('verification_code', 'Verification code')}
              value={code}
              onChange={(value) => {
                resetForm.setValue('code', value);
                resetForm.clearErrors('code');
              }}
              error={resetForm.formState.errors.code?.message}
              autoFocus
            />
            <Input
              label="New Password"
              translationKey="label_new_password"
              {...resetForm.register('password')}
              type="password"
              autoComplete="new-password"
              placeholder={t('label_password', 'Password')}
            />
            <Input
              label="Repeat Password"
              translationKey="label_repeat_password"
              {...resetForm.register('repeatPassword')}
              type="password"
              autoComplete="new-password"
              placeholder={t('label_repeat_password', 'Repeat Password')}
            />
            <Button
              type="submit"
              className="!h-[52px] !rounded-[10px]"
              loading={loading}
            >
              {t('change_password', 'Change Password')}
            </Button>
            <div className="text-sm text-textColor">
              {t('didnt_receive_code', "Didn't receive the code?")}&nbsp;
              {cooldown > 0 ? (
                <span>
                  {t('resend_available_in', 'You can resend in')} {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  className="underline"
                  onClick={() => sendCode(resetForm.getValues('email'))}
                >
                  {t('send_new_code', 'Send a new code')}
                </button>
              )}
            </div>
          </form>
        </FormProvider>
      )}

      {step === 'done' && (
        <div className="text-start text-green-400">
          {t(
            'password_reset_success',
            'Your password has been changed. You can now sign in with your new password.'
          )}
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link href="/auth/login" className="underline cursor-pointer">
          {t('go_back_to_login', 'Go back to login')}
        </Link>
      </p>
    </div>
  );
}
