import { ForgotPasswordDto, VerifyResetCodeDto } from './password-reset.dto';

/** { email, code } — the 6-digit code emailed after registration. */
export class VerifyEmailDto extends VerifyResetCodeDto {}

/** { email } — asks for a new verification code. */
export class ResendVerificationDto extends ForgotPasswordDto {}
