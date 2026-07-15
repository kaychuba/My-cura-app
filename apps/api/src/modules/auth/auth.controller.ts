import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, SignupDto } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { Setup2FADto } from './dto/setup-2fa.dto';
import { BiometricChallengeDto } from './dto/biometric-challenge.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowPreMfa } from '../../common/security/allow-pre-mfa.decorator';
import { AuthUser } from '@my-cura/shared-types';
import { Request, Response } from 'express';

const FIFTEEN_MINUTES = 15 * 60_000;
const REFRESH_COOKIE = 'mycura_rt';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60_000; // matches refresh token TTL

type TokenResult = Record<string, unknown> & { refreshToken?: string };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Browsers never see the refresh token: for web clients it travels in an
   * HttpOnly, Secure, SameSite=Strict cookie scoped to /api/v1/auth, so
   * XSS-injected script can't read it and cross-site requests can't send it.
   * Native apps (no cookie jar worth trusting) keep it in the body and store
   * it in the platform keychain.
   */
  private deliverTokens(req: Request, res: Response, result: TokenResult): TokenResult {
    if (req.headers['x-client-platform'] !== 'web' || !result.refreshToken) return result;
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });
    return { ...result, refreshToken: undefined };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliverTokens(req, res, await this.authService.login(dto));
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Create a new care agency and its owner account' })
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliverTokens(req, res, await this.authService.signup(dto));
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user (agency owner or admin use)' })
  register(@Body() dto: RegisterDto, @Req() req: Request & { user?: AuthUser }) {
    const tenantId = req.user?.tenantId ?? dto.tenantId;
    return this.authService.register(dto, tenantId!);
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard('jwt'))
  @AllowPreMfa()
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate 2FA setup — returns QR code' })
  setup2FA(@CurrentUser() user: AuthUser) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/confirm')
  @UseGuards(AuthGuard('jwt'))
  @AllowPreMfa()
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm 2FA setup with TOTP code' })
  async confirm2FA(
    @CurrentUser() user: AuthUser,
    @Body() dto: Setup2FADto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliverTokens(req, res, await this.authService.confirm2FA(user.id, dto.code));
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Verify 2FA code after initial login' })
  async verify2FA(
    @Body() dto: Verify2FADto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliverTokens(req, res, await this.authService.verify2FA(dto));
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (blocked for administrator roles)' })
  disable2FA(@CurrentUser() user: AuthUser, @Body() dto: Setup2FADto) {
    return this.authService.disable2FA(user.id, dto.code);
  }

  @Post('biometric/register')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register biometric public key for device' })
  registerBiometric(@CurrentUser() user: AuthUser, @Body() dto: RegisterBiometricDto) {
    return this.authService.registerBiometricKey(user.id, dto.publicKeyBase64, dto.deviceId);
  }

  @Post('biometric/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Authenticate with biometric signature' })
  verifyBiometric(@Body() dto: BiometricChallengeDto) {
    return this.authService.verifyBiometricChallenge(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AllowPreMfa()
  @Throttle({ default: { limit: 60, ttl: FIFTEEN_MINUTES } })
  @ApiOperation({ summary: 'Refresh access token (body token or web session cookie)' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!token) throw new UnauthorizedException('No refresh token provided');
    return this.deliverTokens(req, res, await this.authService.refreshTokens(token));
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @AllowPreMfa()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return this.authService.logout(user.id, token ?? '');
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  googleAuth() {
    // Passport handles the redirect
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  googleCallback(@Req() req: Request & { user: Partial<Record<string, unknown>> }) {
    return this.authService.handleOAuthCallback(
      req.user as Parameters<typeof this.authService.handleOAuthCallback>[0],
    );
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @AllowPreMfa()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
