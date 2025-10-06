import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private mapUserRoleToPrisma(role: UserRole | string): 'customer' | 'service_provider' | 'local_service_manager' | 'admin' {
    // Normalize role to uppercase for consistent comparison
    const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;
    
    switch (normalizedRole) {
      case UserRole.CUSTOMER:
      case 'CUSTOMER':
        return 'customer';
      case UserRole.PROVIDER:
      case 'PROVIDER':
        return 'service_provider';
      case UserRole.LSM:
      case 'LSM':
        return 'local_service_manager';
      case UserRole.ADMIN:
      case 'ADMIN':
        return 'admin';
      default:
        throw new BadRequestException(`Invalid role: ${role}. Valid roles are: CUSTOMER, PROVIDER, LSM, ADMIN`);
    }
  }

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
    const { email, password, firstName, lastName, phoneNumber, role, region, zipcode, address, location, experience } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user in transaction with role-specific profile
    const user = await this.prisma.$transaction(async (prisma) => {
      // Create base user
      const newUser = await prisma.users.create({
        data: {
          email,
          password: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role: this.mapUserRoleToPrisma(role),
        },
      });

      // Create role-specific profile
      switch (role) {
        case UserRole.CUSTOMER:
          if (!region) {
            throw new BadRequestException(
              'Region is required for customer registration. Please specify the region.',
            );
          }
          
          await prisma.customers.create({
            data: {
              user_id: newUser.id,
              address: address || 'Not provided', // Use provided address or default
              zipcode: zipcode || null, // Optional field
            },
          });
          break;

        case UserRole.PROVIDER:
          // For providers, we need an LSM assignment by region
          if (!region) {
            throw new BadRequestException(
              'Region is required for provider registration. Please specify the region.',
            );
          }

          // Find LSM in the specified region
          const availableLSM = await prisma.local_service_managers.findFirst({
            where: { 
              status: 'active',
              region: region
            },
            orderBy: { created_at: 'asc' }
          });
          
          if (!availableLSM) {
            throw new BadRequestException(
              `No active LSM available in region "${region}". Please contact admin to create an LSM for this region.`,
            );
          }
          
          await prisma.service_providers.create({
            data: {
              user_id: newUser.id,
              experience: experience || 0, // Use provided experience or default
              location: location || 'Not provided', // Use provided location or default
              zipcode: zipcode || null, // Optional field
              lsm_id: availableLSM.id, // Required field - region-specific LSM
              status: 'pending', // Requires LSM approval
            },
          });
          break;

        case UserRole.LSM:
          if (!region) {
            throw new BadRequestException(
              'Region is required for LSM registration. Please specify the region.',
            );
          }
          
          await prisma.local_service_managers.create({
            data: {
              user_id: newUser.id,
              region: region, // Use provided region
            },
          });
          break;

        case UserRole.ADMIN:
          await prisma.admin.create({
            data: {
              user_id: newUser.id,
            },
          });
          break;
      }

      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token in database
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
            _count: {
              select: {
                jobs: true,
                feedbacks: true,
                chats: true,
                service_requests: true,
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
            _count: {
              select: {
                jobs: true,
                feedbacks: true,
                provider_services: true,
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
                chats: true,
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

  /**
   * Update current user's profile
   * @param userId - User ID from JWT
   * @param dto - Partial profile fields
   */
  async updateProfile(
    userId: number,
    dto: { firstName?: string; lastName?: string; phoneNumber?: string; profilePicture?: string },
  ) {
    const updateData: any = {};

    if (dto.firstName !== undefined) updateData.first_name = dto.firstName;
    if (dto.lastName !== undefined) updateData.last_name = dto.lastName;
    if (dto.phoneNumber !== undefined) updateData.phone_number = dto.phoneNumber;
    if (dto.profilePicture !== undefined) updateData.profile_picture = dto.profilePicture;

    if (Object.keys(updateData).length === 0) {
      return this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          role: true,
          profile_picture: true,
          updated_at: true,
        },
      });
    }

    const updated = await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        role: true,
        profile_picture: true,
        updated_at: true,
      },
    });

    return updated;
  }
}