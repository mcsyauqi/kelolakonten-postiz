import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import dayjs from 'dayjs';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { NewsletterService } from '@gitroom/nestjs-libraries/newsletter/newsletter.service';
import { OtpService } from '@gitroom/nestjs-libraries/services/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _providerManager: AuthProviderManager,
    private _otpService: OtpService
  ) {}
  async canRegister(provider: string) {
    if (
      process.env.DISABLE_REGISTRATION !== 'true' ||
      provider === Provider.GENERIC
    ) {
      return true;
    }

    return (await this._organizationService.getCount()) === 0;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    ip: string,
    userAgent: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string }
  ) {
    if (provider === Provider.LOCAL) {
      if (process.env.DISALLOW_PLUS && body.email.includes('+')) {
        throw new Error('Email with plus sign is not allowed');
      }
      if (body instanceof CreateOrgUserDto) {
        body.email = body.email.toLowerCase();
      }
      const user = await this._userService.getUserByEmail(body.email);
      if (body instanceof CreateOrgUserDto) {
        if (user) {
          throw new Error('Email already exists');
        }

        if (!(await this.canRegister(provider))) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(
          body,
          ip,
          userAgent
        );

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role
              )
            : false;

        const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
        if (!create.users[0].user.activated) {
          await this._otpService.send('activate', body.email, body.email);
        }
        return obj;
      }

      if (!user || !AuthChecker.comparePassword(body.password, user.password)) {
        throw new Error('Invalid user name or password');
      }

      if (!user.activated) {
        throw new Error('User is not activated');
      }

      return { addedOrg: false, jwt: await this.jwt(user) };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      ip,
      userAgent
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user) };
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = AuthChecker.verifyJWT(cookie);
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    ip: string,
    userAgent: string
  ) {
    const providerInstance = this._providerManager.getProvider(provider);
    const providerUser = await providerInstance.getUser(body.providerToken);

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await this.findProviderUser(provider, providerUser);
    if (user) {
      return user;
    }

    if (!(await this.canRegister(provider))) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser(
      {
        company: body.company,
        email: providerUser.email,
        password: '',
        provider,
        providerId: providerUser.id,
        datafast_visitor_id: body.datafast_visitor_id,
      },
      ip,
      userAgent
    );

    this._track('register', providerUser.email, body.datafast_visitor_id).catch(
      (err) => {}
    );

    await NewsletterService.register(providerUser.email);

    try {
      if (providerInstance?.postRegistration) {
        await providerInstance.postRegistration(body.providerToken, create.id);
      }
    } catch (err) {
      // Don't fail registration if postRegistration fails
    }

    return create.users[0].user;
  }

  private async _track(
    name: string,
    email: string,
    datafast_visitor_id: string
  ) {
    if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {
      try {
        await fetch('https://datafa.st/api/v1/goals', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datafast_visitor_id: datafast_visitor_id,
            name: name,
            metadata: {
              email,
            },
          }),
        });
      } catch (err) {}
    }
  }

  async forgot(email: string) {
    const user = await this._userService.getUserByEmail(email);
    if (!user || user.providerName !== Provider.LOCAL) {
      return false;
    }

    await this._otpService.send('reset', user.email.toLowerCase(), user.email);
    return true;
  }

  async forgotReturn(body: ForgotReturnPasswordDto) {
    const user = await this._userService.getUserByEmail(body.email);
    if (
      !user ||
      (await this._otpService.verify(
        'reset',
        user.email.toLowerCase(),
        body.code
      )) === false
    ) {
      return false;
    }

    return this._userService.updatePassword(user.id, body.password);
  }

  async activate(email: string, code: string, tracking: string) {
    const user = await this._userService.getUserByEmail(email);
    if (!user || user.activated) {
      return false;
    }

    if (
      (await this._otpService.verify(
        'activate',
        user.email.toLowerCase(),
        code
      )) === false
    ) {
      return false;
    }

    await this._userService.activateUser(user.id);
    user.activated = true;
    this._track('register', user.email, tracking).catch((err) => {});
    await NewsletterService.register(user.email);
    return this.jwt(user);
  }

  async resendActivationEmail(email: string) {
    const user = await this._userService.getUserByEmail(email);

    // no hint whether the address has an account
    if (!user || user.activated) {
      return true;
    }

    await this._otpService.send('activate', user.email.toLowerCase(), user.email);
    return true;
  }

  // Social login: the provider account itself, a local account it was linked
  // to, or (when the provider vouches for the address) the activated local
  // account with the same email, which gets linked on the way
  private async findProviderUser(
    provider: Provider,
    providerUser: { id: string; email: string; emailVerified?: boolean }
  ) {
    const direct = await this._userService.getUserByProvider(
      providerUser.id,
      provider
    );
    if (direct) {
      return direct;
    }

    const linked = await this._userService.getUserByLinkedProvider(
      provider,
      providerUser.id
    );
    if (linked) {
      return linked;
    }

    if (!providerUser.emailVerified || !providerUser.email) {
      return null;
    }

    const local = await this._userService.getUserByEmail(providerUser.email);
    if (!local || !local.activated || local.providerId) {
      return null;
    }

    await this._userService.linkProvider(local.id, provider, providerUser.id);
    return local;
  }

  oauthLink(provider: string, query?: any) {
    const providerInstance = this._providerManager.getProvider(provider);
    return providerInstance.generateLink(query);
  }

  async checkExists(
    provider: string,
    code: string,
    redirectUri?: string,
    state?: string,
    stateCookie?: string
  ) {
    // the mobile app passes redirect_uri and keeps no cookies, the web flow
    // never passes it, so the state nonce is only enforced for the web flow
    if (
      !process.env.NOT_SECURED &&
      !redirectUri &&
      (!state || state !== stateCookie)
    ) {
      throw new Error('Invalid state');
    }

    const providerInstance = this._providerManager.getProvider(provider);
    const token = await providerInstance.getToken(code, redirectUri);
    const user = await providerInstance.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }
    const checkExists = await this.findProviderUser(
      provider as Provider,
      user
    );
    if (checkExists) {
      return { jwt: await this.jwt(checkExists) };
    }

    return { token };
  }

  private async jwt(user: User) {
    if (user.password) {
      delete user.password;
    }
    return AuthChecker.signJWT(user);
  }
}
