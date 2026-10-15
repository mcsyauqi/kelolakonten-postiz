import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';

export type OtpPurpose = 'activate' | 'reset' | 'email-old' | 'email-new';

const CODE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

const emailCopy: Record<OtpPurpose, { subject: string; intro: string }> = {
  activate: {
    subject: 'Kode aktivasi Kelola Konten',
    intro:
      'Terima kasih sudah mendaftar di Kelola Konten. Masukkan kode berikut untuk mengaktifkan akun Anda.',
  },
  reset: {
    subject: 'Kode atur ulang kata sandi Kelola Konten',
    intro:
      'Anda meminta pengaturan ulang kata sandi. Masukkan kode berikut untuk membuat kata sandi baru.',
  },
  'email-old': {
    subject: 'Konfirmasi perubahan email Kelola Konten',
    intro:
      'Ada permintaan mengganti email akun Kelola Konten Anda ke alamat lain. Masukkan kode berikut untuk menyetujuinya.',
  },
  'email-new': {
    subject: 'Verifikasi email baru Kelola Konten',
    intro:
      'Alamat ini akan dipakai sebagai email akun Kelola Konten. Masukkan kode berikut untuk memverifikasinya.',
  },
};

interface StoredCode {
  hash: string;
  payload?: string;
}

// Short-lived 6-digit codes kept in Redis: hashed, single use, limited attempts
@Injectable()
export class OtpService {
  private readonly _logger = new Logger(OtpService.name);

  constructor(private _emailService: EmailService) {}

  async send(
    purpose: OtpPurpose,
    subject: string,
    to: string,
    payload?: string
  ) {
    const cooldownKey = `otp-cooldown:${purpose}:${subject}`;
    const countKey = `otp-count:${purpose}:${subject}`;

    // NX makes the cooldown check-and-set atomic
    if (
      !(await ioRedis.set(
        cooldownKey,
        '1',
        'EX',
        RESEND_COOLDOWN_SECONDS,
        'NX'
      ))
    ) {
      throw new Error('otp_cooldown');
    }

    const sent = await ioRedis.incr(countKey);
    if (sent === 1) {
      await ioRedis.expire(countKey, 3600);
    }
    if (sent > MAX_SENDS_PER_HOUR) {
      throw new Error('otp_limit');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const stored: StoredCode = {
      hash: this._hash(purpose, subject, code),
      payload,
    };

    await ioRedis.set(
      this._key(purpose, subject),
      JSON.stringify(stored),
      'EX',
      CODE_TTL_SECONDS
    );
    await ioRedis.set(
      this._attemptsKey(purpose, subject),
      '0',
      'EX',
      CODE_TTL_SECONDS
    );

    if (
      !this._emailService.hasProvider() &&
      process.env.NODE_ENV !== 'production'
    ) {
      // no email provider in local development, so the code is only visible here
      this._logger.warn(`OTP ${purpose} for ${to}: ${code}`);
    }

    const copy = emailCopy[purpose];
    await this._emailService.sendEmailSync(
      to,
      copy.subject,
      `${copy.intro}<br /><br />` +
        `<div style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace;">${code}</div><br />` +
        `Kode berlaku 10 menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari Kelola Konten.<br /><br />` +
        `Kalau Anda tidak meminta kode ini, abaikan email ini.`
    );
  }

  // Returns the payload stored with the code ('' when none), or false. Every
  // check counts as an attempt (atomically, so parallel guesses can't exceed the
  // cap); consume=false keeps a correct code for flows that need two codes to
  // succeed together (call clear() once both passed)
  async verify(
    purpose: OtpPurpose,
    subject: string,
    code: string,
    consume = true
  ): Promise<string | false> {
    const key = this._key(purpose, subject);
    const raw = await ioRedis.get(key);
    if (!raw) {
      return false;
    }

    const stored = JSON.parse(raw) as StoredCode;
    const matches = timingSafeEqual(
      Buffer.from(stored.hash, 'hex'),
      Buffer.from(
        this._hash(purpose, subject, String(code || '').trim()),
        'hex'
      )
    );

    if (!matches) {
      const attempts = await ioRedis.incr(this._attemptsKey(purpose, subject));
      if (attempts >= MAX_ATTEMPTS) {
        await this.clear(purpose, subject);
      }
      return false;
    }

    // a code that already used up its attempts is dead even if this guess is right
    const used = Number(
      (await ioRedis.get(this._attemptsKey(purpose, subject))) || 0
    );
    if (used >= MAX_ATTEMPTS) {
      return false;
    }

    // only one request can consume a code
    if (consume && (await ioRedis.del(key)) !== 1) {
      return false;
    }
    if (consume) {
      await ioRedis.del(this._attemptsKey(purpose, subject));
    }

    return stored.payload || '';
  }

  async payload(purpose: OtpPurpose, subject: string) {
    const raw = await ioRedis.get(this._key(purpose, subject));
    return raw ? (JSON.parse(raw) as StoredCode).payload || '' : false;
  }

  async clear(purpose: OtpPurpose, subject: string) {
    await ioRedis.del(this._key(purpose, subject));
    await ioRedis.del(this._attemptsKey(purpose, subject));
  }

  private _key(purpose: OtpPurpose, subject: string) {
    return `otp:${purpose}:${subject}`;
  }

  private _attemptsKey(purpose: OtpPurpose, subject: string) {
    return `otp-attempts:${purpose}:${subject}`;
  }

  private _hash(purpose: OtpPurpose, subject: string, code: string) {
    return createHash('sha256')
      .update(`${purpose}:${subject}:${code}:${process.env.JWT_SECRET}`)
      .digest('hex');
  }
}
