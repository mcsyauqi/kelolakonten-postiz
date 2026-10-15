import { HttpException, Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import { Provider, Role } from '@prisma/client';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { EmailNotificationsDto } from '@gitroom/nestjs-libraries/dtos/users/email-notifications.dto';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { OtpService } from '@gitroom/nestjs-libraries/services/otp.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/users/change.password.dto';
import {
  ChangeEmailConfirmDto,
  ChangeEmailStartDto,
} from '@gitroom/nestjs-libraries/dtos/users/change.email.dto';

@Injectable()
export class UsersService {
  constructor(
    private _usersRepository: UsersRepository,
    private _organizationRepository: OrganizationRepository,
    private _integrationRepository: IntegrationRepository,
    private _notificationService: NotificationService,
    private _otpService: OtpService,
    private _emailService: EmailService
  ) {}

  // a social login attached to a local account is stored as "<PROVIDER>:<id>"
  static linkedProviderId(provider: Provider | string, providerId: string) {
    return `${provider}:${providerId}`;
  }

  private readonly _logger = new Logger(UsersService.name);

  getUserByEmail(email: string) {
    return this._usersRepository.getUserByEmail(email);
  }

  getUserById(id: string) {
    return this._usersRepository.getUserById(id);
  }

  getUserWithActiveSubscriptionByEmail(email: string, excludeUserId: string) {
    return this._usersRepository.getUserWithActiveSubscriptionByEmail(
      email,
      excludeUserId
    );
  }

  getImpersonateUser(name: string) {
    return this._organizationRepository.getImpersonateUser(name);
  }

  getUserByProvider(providerId: string, provider: Provider) {
    return this._usersRepository.getUserByProvider(providerId, provider);
  }

  async switchUser(
    currentUserId: string,
    targetUserId: string,
    adminId: string
  ) {
    const { kept, switched } =
      await this._usersRepository.switchUserCredentials(
        currentUserId,
        targetUserId
      );

    this._logger.log(
      `User login switch performed by admin ${adminId}: account ${
        kept.id
      } login ${switched.email} -> ${kept.email}; account ${
        switched.id
      } login ${kept.email} -> ${switched.email}`
    );

    // the swap is already committed; a notification failure must not fail it
    if (this._notificationService.hasEmailProvider()) {
      await Promise.all(
        [kept, switched].map((account) =>
          this._notificationService
            .sendEmail(
              account.email,
              'Your Postiz login was changed',
              `An administrator changed the login for your Postiz account. ` +
                `You can now sign in using ${account.email}. ` +
                `Your subscription and plan were not changed by this switch — ` +
                `if you intended to cancel a subscription, please do that ` +
                `separately from your billing settings.`
            )
            .catch((err) =>
              this._logger.error(`Failed to notify ${account.email}`, err)
            )
        )
      );
    }

    return { kept, switched };
  }

  async getOrgsToDeleteForAccount(userId: string) {
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);
    const ownedOrgs = orgs.filter(
      (org) => org.users[0].role === Role.SUPERADMIN
    );

    for (const org of ownedOrgs) {
      const team = await this._organizationRepository.getTeam(org.id);
      if (team?.users?.some((member) => member.user.id !== userId)) {
        throw new HttpException(
          'Please remove your team members before deleting your account',
          400
        );
      }
    }

    return ownedOrgs;
  }

  async deleteAccount(userId: string) {
    const deletedOrgs = await this.getOrgsToDeleteForAccount(userId);
    const orgs = await this._organizationRepository.getOrgsByUserId(userId);

    for (const org of orgs) {
      if (org.users[0].role === Role.SUPERADMIN) {
        await this._integrationRepository.deleteIntegrationsForAccount(org.id);
        await this._organizationRepository.deleteOrganization(org.id);
      } else {
        await this._organizationRepository.deleteTeamMember(org.id, userId);
      }
    }

    await this._usersRepository.deleteAccount(userId);

    this._logger.log(
      `Account ${userId} deleted, organizations removed: ${deletedOrgs
        .map((org) => org.id)
        .join(', ')}`
    );

    return { deletedOrgs };
  }

  activateUser(id: string) {
    return this._usersRepository.activateUser(id);
  }

  updatePassword(id: string, password: string) {
    return this._usersRepository.updatePassword(id, password);
  }

  getPersonal(userId: string) {
    return this._usersRepository.getPersonal(userId);
  }

  changePersonal(userId: string, body: UserDetailDto) {
    return this._usersRepository.changePersonal(userId, body);
  }

  getUserByLinkedProvider(provider: Provider | string, providerId: string) {
    return this._usersRepository.getUserByLinkedProvider(
      UsersService.linkedProviderId(provider, providerId)
    );
  }

  linkProvider(userId: string, provider: Provider | string, providerId: string) {
    return this._usersRepository.linkProvider(
      userId,
      UsersService.linkedProviderId(provider, providerId)
    );
  }

  async getAccount(userId: string) {
    const account = await this._usersRepository.getAccount(userId);
    return {
      email: account?.email || '',
      hasPassword: !!account?.password,
    };
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('user_not_found', 404);
    }

    if (user.password) {
      if (
        !body.currentPassword ||
        !AuthService.comparePassword(body.currentPassword, user.password)
      ) {
        throw new HttpException('wrong_password', 400);
      }
      await this._usersRepository.changePassword(userId, body.password);
      return { changed: true };
    }

    // social-only account: becomes local so the email + password login works
    if (user.providerName !== Provider.LOCAL) {
      if (await this._usersRepository.isEmailTaken(user.email, userId)) {
        throw new HttpException('email_taken', 400);
      }
      await this._uniqueEmail(() =>
        this._usersRepository.convertToLocal(
          userId,
          body.password,
          UsersService.linkedProviderId(user.providerName, user.providerId!)
        )
      );
      return { changed: true };
    }

    await this._usersRepository.changePassword(userId, body.password);
    return { changed: true };
  }

  async startEmailChange(userId: string, body: ChangeEmailStartDto) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('user_not_found', 404);
    }

    if (
      user.password &&
      (!body.password ||
        !AuthService.comparePassword(body.password, user.password))
    ) {
      throw new HttpException('wrong_password', 400);
    }

    const email = body.email.trim().toLowerCase();
    if (process.env.DISALLOW_PLUS && email.includes('+')) {
      throw new HttpException('email_plus_not_allowed', 400);
    }
    if (email === user.email.toLowerCase()) {
      throw new HttpException('same_email', 400);
    }

    if (await this._usersRepository.isEmailTaken(email, userId)) {
      throw new HttpException('email_taken', 400);
    }

    await this._sendEmailChangeCodes(userId, user.email, email);
    return { email };
  }

  async resendEmailChange(userId: string) {
    const user = await this._usersRepository.getUserById(userId);
    const email = await this._otpService.payload('email-new', userId);
    if (!user || !email) {
      throw new HttpException('no_pending_change', 400);
    }

    await this._sendEmailChangeCodes(userId, user.email, email);
    return { email };
  }

  async confirmEmailChange(userId: string, body: ChangeEmailConfirmDto) {
    const user = await this._usersRepository.getUserById(userId);
    if (!user) {
      throw new HttpException('user_not_found', 404);
    }

    // both are checked (and wrong guesses counted) before either is consumed
    const oldOk = await this._otpService.verify(
      'email-old',
      userId,
      body.oldCode,
      false
    );
    const email = await this._otpService.verify(
      'email-new',
      userId,
      body.newCode,
      false
    );

    if (oldOk === false || !email) {
      throw new HttpException(
        oldOk === false && !email
          ? 'invalid_codes'
          : oldOk === false
          ? 'invalid_old_code'
          : 'invalid_new_code',
        400
      );
    }

    await this._otpService.clear('email-old', userId);
    await this._otpService.clear('email-new', userId);

    if (await this._usersRepository.isEmailTaken(email, userId)) {
      throw new HttpException('email_taken', 400);
    }

    await this._uniqueEmail(() =>
      this._usersRepository.changeEmail(userId, email)
    );

    const notice =
      `Email akun Kelola Konten Anda telah diganti dari ${user.email} menjadi ${email}. ` +
      `Mulai sekarang, masuk dengan alamat ${email}.<br /><br />` +
      `Kalau Anda tidak melakukan perubahan ini, segera hubungi kami dengan membalas email ini.`;

    await Promise.all(
      [user.email, email].map((to) =>
        this._emailService
          .sendEmailSync(to, 'Email akun Kelola Konten telah diganti', notice)
          .catch((err) =>
            this._logger.error(`Failed to notify ${to} about email change`, err)
          )
      )
    );

    return { email };
  }

  // a concurrent signup can take the address between the check and the write
  private async _uniqueEmail<T>(write: () => Promise<T>) {
    try {
      return await write();
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new HttpException('email_taken', 400);
      }
      throw err;
    }
  }

  private async _sendEmailChangeCodes(
    userId: string,
    currentEmail: string,
    newEmail: string
  ) {
    try {
      await this._otpService.send('email-old', userId, currentEmail);
      await this._otpService.send('email-new', userId, newEmail, newEmail);
    } catch (err: any) {
      if (err?.message === 'otp_cooldown' || err?.message === 'otp_limit') {
        throw new HttpException(err.message, 429);
      }
      throw err;
    }
  }

  getEmailNotifications(userId: string) {
    return this._usersRepository.getEmailNotifications(userId);
  }

  updateEmailNotifications(userId: string, body: EmailNotificationsDto) {
    return this._usersRepository.updateEmailNotifications(userId, body);
  }
}
