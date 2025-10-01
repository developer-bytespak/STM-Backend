"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let OAuthService = OAuthService_1 = class OAuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(OAuthService_1.name);
    }
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async register(registerDto) {
        const { email, password, firstName, lastName, phoneNumber, role } = registerDto;
        try {
            this.logger.log(`Starting user registration for email: ${email} with role: ${role}`);
            const jwtSecret = this.configService.get('JWT_SECRET');
            if (!jwtSecret) {
                this.logger.error('JWT_SECRET environment variable is not set');
                throw new common_1.InternalServerErrorException('Server configuration error: JWT_SECRET is not configured. Please contact system administrator.');
            }
            this.logger.debug(`Checking if user with email ${email} already exists`);
            const existingUser = await this.prisma.users.findUnique({
                where: { email },
            });
            if (existingUser) {
                this.logger.warn(`Registration failed: User with email ${email} already exists`);
                throw new common_1.ConflictException({
                    message: 'Registration failed',
                    error: 'User with this email already exists',
                    details: {
                        email,
                        suggestion: 'Please use a different email address or try logging in instead',
                    },
                });
            }
            this.logger.debug('Hashing password');
            const hashedPassword = await this.hashPassword(password);
            this.logger.debug(`Creating user with role: ${role}`);
            const user = await this.prisma.$transaction(async (prisma) => {
                try {
                    const newUser = await prisma.users.create({
                        data: {
                            email,
                            password: hashedPassword,
                            first_name: firstName,
                            last_name: lastName,
                            phone_number: phoneNumber,
                            role: role,
                        },
                    });
                    this.logger.debug(`Created user with ID: ${newUser.id}`);
                    switch (role) {
                        case user_role_enum_1.UserRole.CUSTOMER:
                            this.logger.debug('Creating customer profile');
                            await prisma.customers.create({
                                data: {
                                    user_id: newUser.id,
                                    address: '',
                                },
                            });
                            break;
                        case user_role_enum_1.UserRole.PROVIDER:
                            this.logger.warn('Provider registration attempted via general endpoint');
                            throw new common_1.BadRequestException({
                                message: 'Provider registration not allowed',
                                error: 'Provider registration requires LSM assignment',
                                details: {
                                    suggestion: 'Please use the provider onboarding endpoint instead',
                                    reason: 'Providers need to be assigned to a Local Service Manager (LSM)',
                                },
                            });
                        case user_role_enum_1.UserRole.LSM:
                            this.logger.debug('Creating LSM profile');
                            await prisma.local_service_managers.create({
                                data: {
                                    user_id: newUser.id,
                                    region: '',
                                },
                            });
                            break;
                        case user_role_enum_1.UserRole.ADMIN:
                            this.logger.debug('Creating admin profile');
                            await prisma.admin.create({
                                data: {
                                    user_id: newUser.id,
                                },
                            });
                            break;
                        default:
                            this.logger.error(`Invalid role provided: ${role}`);
                            throw new common_1.BadRequestException({
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
                }
                catch (error) {
                    this.logger.error(`Database transaction failed for user ${email}:`, error);
                    throw error;
                }
            });
            this.logger.debug('Generating JWT tokens');
            const tokens = await this.generateTokens(user);
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
        }
        catch (error) {
            this.logger.error(`Registration failed for email ${email}:`, error);
            if (error instanceof common_1.ConflictException ||
                error instanceof common_1.BadRequestException ||
                error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            if (error.code === 'P1001') {
                throw new common_1.InternalServerErrorException({
                    message: 'Database connection failed',
                    error: 'Unable to connect to the database',
                    details: {
                        suggestion: 'Please check if the database is running and accessible',
                        code: 'DB_CONNECTION_ERROR',
                    },
                });
            }
            if (error.code === 'P2002') {
                throw new common_1.ConflictException({
                    message: 'Data conflict',
                    error: 'A unique constraint was violated',
                    details: {
                        suggestion: 'This email might already be registered',
                        code: 'UNIQUE_CONSTRAINT_ERROR',
                    },
                });
            }
            if (error.code && error.code.startsWith('P')) {
                throw new common_1.InternalServerErrorException({
                    message: 'Database operation failed',
                    error: 'An error occurred while saving data',
                    details: {
                        suggestion: 'Please try again or contact support if the issue persists',
                        code: error.code,
                    },
                });
            }
            if (error.message && error.message.includes('JWT')) {
                throw new common_1.InternalServerErrorException({
                    message: 'Token generation failed',
                    error: 'Unable to generate authentication tokens',
                    details: {
                        suggestion: 'Please check server configuration',
                        code: 'JWT_ERROR',
                    },
                });
            }
            throw new common_1.InternalServerErrorException({
                message: 'Registration failed',
                error: 'An unexpected error occurred during registration',
                details: {
                    suggestion: 'Please try again or contact support',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
    async validateUser(email, password) {
        const user = await this.prisma.users.findUnique({
            where: { email },
        });
        if (!user) {
            return null;
        }
        const isPasswordValid = await this.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        await this.prisma.users.update({
            where: { id: user.id },
            data: { last_login: new Date() },
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async login(user) {
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
    async generateTokens(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async updateRefreshToken(userId, refreshToken) {
        const hashedRefreshToken = await this.hashPassword(refreshToken);
        await this.prisma.users.update({
            where: { id: userId },
            data: { refresh_token: hashedRefreshToken },
        });
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const user = await this.prisma.users.findUnique({
                where: { id: payload.sub },
            });
            if (!user || !user.refresh_token) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const isRefreshTokenValid = await this.comparePassword(refreshToken, user.refresh_token);
            if (!isRefreshTokenValid) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const tokens = await this.generateTokens(user);
            await this.updateRefreshToken(user.id, tokens.refreshToken);
            return {
                ...tokens,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async getProfile(userId) {
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
            throw new common_1.NotFoundException('User not found');
        }
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
    async logout(userId) {
        await this.prisma.users.update({
            where: { id: userId },
            data: { refresh_token: null },
        });
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = OAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map