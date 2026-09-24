import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
  FirstLoginResendCodeDto,
  FirstLoginVerifyCodeDto,
  FirstLoginCompleteDto,
} from './dto';
import { Public, CurrentUser } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'For admin-created accounts that must set their own password, returns ' +
      '{ passwordChangeRequired, challengeToken, email } instead of tokens and emails a code.',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a 6-digit password-reset code for an email',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check an emailed password-reset code before choosing a new password',
    description: 'Does not use the code up; wrong guesses count toward the attempt limit.',
  })
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using the emailed 6-digit code' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('first-login/resend-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the first-login password-change code' })
  async resendFirstLoginCode(@Body() dto: FirstLoginResendCodeDto) {
    return this.authService.resendFirstLoginCode(dto.challengeToken);
  }

  @Public()
  @Post('first-login/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check the emailed first-login code before choosing a new password',
    description: 'Does not use the code up; wrong guesses count toward the attempt limit.',
  })
  async verifyFirstLoginCode(@Body() dto: FirstLoginVerifyCodeDto) {
    return this.authService.verifyFirstLoginCode(dto);
  }

  @Public()
  @Post('first-login/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password with the emailed code and sign in (first login)',
  })
  async completeFirstLogin(@Body() dto: FirstLoginCompleteDto) {
    return this.authService.completeFirstLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke current session)' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.id, user.sid);
    return { message: 'Logged out successfully' };
  }
}
