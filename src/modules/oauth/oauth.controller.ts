import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from './decorators';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
@ApiTags('authentication')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Register a new user
   * Creates user account with role-specific profile
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() registerDto: RegisterDto) {
    return this.oauthService.register(registerDto);
  }

  /**
   * Login with email and password
   * Returns JWT access and refresh tokens
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.oauthService.login(req.user);
  }

  /**
   * Refresh access token using refresh token
   * Returns new access and refresh tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.oauthService.refreshTokens(refreshTokenDto.refreshToken);
  }

  /**
   * Get current user profile
   * Returns user data with role-specific information
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('id') userId: number) {
    return this.oauthService.getProfile(userId);
  }

  /**
   * Get current authenticated user (simple)
   * Returns basic user info from JWT token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
  }

  /**
   * Logout current user
   * Invalidates refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser('id') userId: number) {
    await this.oauthService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Update current user profile (partial)
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(@CurrentUser('id') userId: number, @Body() body: UpdateProfileDto) {
    return this.oauthService.updateProfile(userId, body);
  }

  /**
   * Forgot password - Send OTP to email
   * Step 1 of password reset flow
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset - sends OTP to email' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      example: {
        message: 'OTP sent successfully to your email. Valid for 10 minutes.',
        email: 'user@example.com',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.oauthService.forgotPassword(dto.email);
  }

  /**
   * Verify OTP for password reset
   * Step 2 of password reset flow
   */
  @Post('verify-password-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      example: {
        message: 'OTP verified successfully. You can now reset your password.',
        verified: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyPasswordResetOtp(@Body() dto: VerifyOtpDto) {
    return this.oauthService.verifyPasswordResetOtp(dto.email, dto.otp);
  }

  /**
   * Reset password with OTP
   * Step 3 of password reset flow
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with verified OTP' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successfully',
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.oauthService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  /**
   * Resend OTP for password reset
   * Useful if OTP expires
   */
  @Post('resend-password-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP for password reset' })
  @ApiResponse({
    status: 200,
    description: 'New OTP sent successfully',
    schema: {
      example: {
        message: 'New OTP sent to your email',
        email: 'user@example.com',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendPasswordResetOtp(@Body() dto: ForgotPasswordDto) {
    return this.oauthService.resendPasswordResetOtp(dto.email);
  }
}