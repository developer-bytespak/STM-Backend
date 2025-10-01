import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // STEP 2.1: Password Hashing Utility Methods
  // ============================================

  /**
   * Hash a plain text password
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain text password with hashed password
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if passwords match
   */
  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }


  // ============================================
  // STEP 2.2: User Registration
  // ============================================

  /**
   * Register a new user with role-specific profile creation
   * @param registerDto - Registration data
   * @returns JWT tokens and user data
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phoneNumber, role } =
      registerDto;

    try {
      this.logger.log(`Starting user registration for email: ${email} with role: ${role}`);

      // Validate required environment variables
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET environment variable is not set');
        throw new InternalServerErrorException(
          'Server configuration error: JWT_SECRET is not configured. Please contact system administrator.',
        );
      }

      // Check if user already exists
      this.logger.debug(`Checking if user with email ${email} already exists`);
      const existingUser = await this.prisma.users.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`Registration failed: User with email ${email} already exists`);
        throw new ConflictException({
          message: 'Registration failed',
          error: 'User with this email already exists',
          details: {
            email,
            suggestion: 'Please use a different email address or try logging in instead',
          },
        });
      }

      // Hash password
      this.logger.debug('Hashing password');
      const hashedPassword = await this.hashPassword(password);

      // Create user in transaction with role-specific profile
      this.logger.debug(`Creating user with role: ${role}`);
      const user = await this.prisma.$transaction(async (prisma) => {
        try {
          // Create base user
          const newUser = await prisma.users.create({
            data: {
              email,
              password: hashedPassword,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              role: role as any,
            },
          });

          this.logger.debug(`Created user with ID: ${newUser.id}`);

          // Create role-specific profile
          switch (role) {
            case UserRole.CUSTOMER:
              this.logger.debug('Creating customer profile');
              await prisma.customers.create({
                data: {
                  user_id: newUser.id,
                  address: '', // Default empty, can be updated later
                },
              });
              break;

            case UserRole.PROVIDER:
              // For providers, we need an LSM assignment
              this.logger.warn('Provider registration attempted via general endpoint');
              throw new BadRequestException({
                message: 'Provider registration not allowed',
                error: 'Provider registration requires LSM assignment',
                details: {
                  suggestion: 'Please use the provider onboarding endpoint instead',
                  reason: 'Providers need to be assigned to a Local Service Manager (LSM)',
                },
              });

            case UserRole.LSM:
              this.logger.debug('Creating LSM profile');
              await prisma.local_service_managers.create({
                data: {
                  user_id: newUser.id,
                  region: '', // Should be provided in registration or onboarding
                },
              });
              break;

            case UserRole.ADMIN:
              this.logger.debug('Creating admin profile');
              await prisma.admin.create({
                data: {
                  user_id: newUser.id,
                },
              });
              break;

            default:
              this.logger.error(`Invalid role provided: ${role}`);
              throw new BadRequestException({
                message: 'Invalid role',
                error: 'The provided role is not valid',
                details: {
                  providedRole: role,
                  validRoles: ['CUSTOMER', 'LSM', 'ADMIN'],
                  note: 'Provider registration requires special onboarding process',
                },
              });
          }

          this.logger.log(`Successfully created user and profile for ${email} with role ${role}`);
          return newUser;
        } catch (error) {
          this.logger.error(`Database transaction failed for user ${email}:`, error);
          throw error;
        }
      });

      // Generate tokens
      this.logger.debug('Generating JWT tokens');
      const tokens = await this.generateTokens(user);

      // Update refresh token in database
      this.logger.debug('Storing refresh token');
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`Registration successful for user ${email} with ID ${user.id}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        ...tokens,
        message: 'Registration successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log the error
      this.logger.error(`Registration failed for email ${email}:`, error);

      // If it's already a NestJS exception, re-throw it
      if (error instanceof ConflictException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle database connection errors
      if (error.code === 'P1001') {
        throw new InternalServerErrorException({
          message: 'Database connection failed',
          error: 'Unable to connect to the database',
          details: {
            suggestion: 'Please check if the database is running and accessible',
            code: 'DB_CONNECTION_ERROR',
          },
        });
      }

      // Handle Prisma validation errors
      if (error.code === 'P2002') {
        throw new ConflictException({
          message: 'Data conflict',
          error: 'A unique constraint was violated',
          details: {
            suggestion: 'This email might already be registered',
            code: 'UNIQUE_CONSTRAINT_ERROR',
          },
        });
      }

      // Handle other Prisma errors
      if (error.code && error.code.startsWith('P')) {
        throw new InternalServerErrorException({
          message: 'Database operation failed',
          error: 'An error occurred while saving data',
          details: {
            suggestion: 'Please try again or contact support if the issue persists',
            code: error.code,
          },
        });
      }

      // Handle JWT errors
      if (error.message && error.message.includes('JWT')) {
        throw new InternalServerErrorException({
          message: 'Token generation failed',
          error: 'Unable to generate authentication tokens',
          details: {
            suggestion: 'Please check server configuration',
            code: 'JWT_ERROR',
          },
        });
      }

      // Generic error fallback
      throw new InternalServerErrorException({
        message: 'Registration failed',
        error: 'An unexpected error occurred during registration',
        details: {
          suggestion: 'Please try again or contact support',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // ============================================
  // STEP 2.3: User Validation for Login
  // ============================================

  /**
   * Validate user credentials for login
   * @param email - User email
   * @param password - User password
   * @returns User object if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
    return null;
  }

    // Compare passwords
    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
    return null;
    }

    // Update last login
    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login user and generate tokens
   * @param user - User object from validateUser
   * @returns JWT tokens
   */
  async login(user: any) {
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      ...tokens,
    };
  }

  // ============================================
  // STEP 2.4: JWT Token Generation
  // ============================================

  /**
   * Generate access and refresh tokens
   * @param user - User object
   * @returns Access and refresh tokens
   */
  private async generateTokens(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Access Token - 24 hours
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      }),
      // Refresh Token - 7 days
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Update refresh token in database
   * @param userId - User ID
   * @param refreshToken - Refresh token
   */
  private async updateRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    // Hash the refresh token before storing
    const hashedRefreshToken = await this.hashPassword(refreshToken);

    await this.prisma.users.update({
      where: { id: userId },
      data: { refresh_token: hashedRefreshToken },
    });
  }

  // ============================================
  // STEP 2.5: Token Refresh Mechanism
  // ============================================

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Refresh token
   * @returns New access and refresh tokens
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Get user from database
      const user = await this.prisma.users.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refresh_token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify refresh token matches the one in database
      const isRefreshTokenValid = await this.comparePassword(
        refreshToken,
        user.refresh_token,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token in database
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ============================================
  // STEP 2.6: Get Profile with Role-Specific Data
  // ============================================

  /**
   * Get user profile with role-specific data
   * @param userId - User ID
   * @returns User profile with role-specific data
   */
  async getProfile(userId: number): Promise<any> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        is_email_verified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch role-specific data
    let roleSpecificData = null;

    switch (user.role) {
      case 'customer':
        roleSpecificData = await this.prisma.customers.findUnique({
          where: { user_id: userId },
          include: {
            customer_retention_metrics: true,
            _count: {
              select: {
                jobs: true,
                ratings_feedback: true,
              },
            },
          },
        });
        break;

      case 'service_provider':
        roleSpecificData = await this.prisma.service_providers.findUnique({
          where: { user_id: userId },
          include: {
            local_service_manager: {
              select: {
                id: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    email: true,
                  },
                },
                region: true,
              },
            },
            performance_metrics: true,
            _count: {
              select: {
                jobs: true,
                created_services: true,
              },
            },
          },
        });
        break;

      case 'local_service_manager':
        roleSpecificData = await this.prisma.local_service_managers.findUnique({
          where: { user_id: userId },
          include: {
            _count: {
              select: {
                service_providers: true,
                lsm_logs: true,
              },
            },
          },
        });
        break;

      case 'admin':
        roleSpecificData = await this.prisma.admin.findUnique({
          where: { user_id: userId },
        });
        break;
    }

    return {
      ...user,
      roleData: roleSpecificData,
    };
  }

  /**
   * Logout user by removing refresh token
   * @param userId - User ID
   */
  async logout(userId: number): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
  }
}