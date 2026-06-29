import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { Setup2FADto } from './dto/setup-2fa.dto';
import { BiometricChallengeDto } from './dto/biometric-challenge.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@my-cura/shared-types';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate 2FA setup — returns QR code' })
  setup2FA(@CurrentUser() user: AuthUser) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm 2FA setup with TOTP code' })
  confirm2FA(@CurrentUser() user: AuthUser, @Body() dto: Setup2FADto) {
    return this.authService.confirm2FA(user.id, dto.code);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code after initial login' })
  verify2FA(@Body() dto: Verify2FADto) {
    return this.authService.verify2FA(dto);
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
  @ApiOperation({ summary: 'Authenticate with biometric signature' })
  verifyBiometric(@Body() dto: BiometricChallengeDto) {
    return this.authService.verifyBiometricChallenge(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(user.id, dto.refreshToken);
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
