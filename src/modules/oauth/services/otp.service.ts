import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  // In-memory storage for OTP (in production, use Redis)
  private otpStore = new Map<string, OtpData>();

  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via SendGrid email
   */
  async sendOtpEmail(
    email: string,
    userName: string,
    purpose: 'forgot_password' | 'email_verification' = 'forgot_password',
  ): Promise<string> {
    try {
      const otp = this.generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in memory
      this.otpStore.set(email, {
        otp,
        purpose,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
      });

      // Prepare email content
      const subject =
        purpose === 'forgot_password'
          ? '🔐 Reset Your Password - OTP Verification'
          : '✅ Verify Your Email - OTP';

      const htmlContent = this.getEmailTemplate(otp, userName, purpose);

      const message = {
        to: email,
        from: this.configService.get<string>('EMAIL_FROM') || 'noreply@stmapp.com',
        subject,
        html: htmlContent,
        text: `Your OTP is: ${otp}. Valid for 10 minutes.`,
      };

      await sgMail.send(message);

      this.logger.log(`✅ OTP sent to ${email} for ${purpose}`);
      return otp; // Return for testing purposes (remove in production)
    } catch (error) {
      this.logger.error(`❌ Failed to send OTP email to ${email}`, error);
      throw new BadRequestException('Failed to send OTP email');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const otpData = this.otpStore.get(email);

    if (!otpData) {
      throw new BadRequestException('No OTP found for this email. Please request a new one.');
    }

    // Check if OTP expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(email);
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please request a new OTP.',
      );
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts++;
      throw new BadRequestException(
        `Invalid OTP. ${otpData.maxAttempts - otpData.attempts} attempts remaining.`,
      );
    }

    return true;
  }

  /**
   * Clear OTP after successful reset
   */
  clearOtp(email: string): void {
    this.otpStore.delete(email);
  }

  /**
   * Get OTP data (for validation)
   */
  getOtpData(email: string): OtpData | null {
    return this.otpStore.get(email) || null;
  }

  /**
   * Email template for OTP
   */
  private getEmailTemplate(otp: string, userName: string, purpose: string): string {
    const isPasswordReset = purpose === 'forgot_password';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2D8CFF; margin: 0;">
              ${isPasswordReset ? '🔐 Password Reset' : '✅ Email Verification'}
            </h2>
          </div>

          <!-- Body -->
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            Hi <strong>${userName}</strong>,
          </p>

          <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
            ${
              isPasswordReset
                ? 'You requested to reset your password. Use the OTP below to verify your identity and set a new password.'
                : 'Please verify your email address to complete your registration.'
            }
          </p>

          <!-- OTP Code -->
          <div style="background-color: #f0f7ff; border: 2px solid #2D8CFF; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code:</p>
            <p style="color: #2D8CFF; font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 10px 0;">
              ${otp}
            </p>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 13px;">
              ⏱️ Valid for 10 minutes
            </p>
          </div>

          <!-- Instructions -->
          <div style="background-color: #fffbf0; border-left: 4px solid #ff9800; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="color: #333; margin: 0; font-size: 14px;">
              <strong>⚠️ Important:</strong> Never share this code with anyone. STM support will never ask for your OTP.
            </p>
          </div>

          <!-- Footer -->
          <p style="color: #999; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            If you didn't request this, please ignore this email or contact support.
          </p>

          <p style="color: #999; font-size: 12px; text-align: center; margin: 10px 0 0 0;">
            © 2025 STM. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }
}

interface OtpData {
  otp: string;
  purpose: 'forgot_password' | 'email_verification';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}
