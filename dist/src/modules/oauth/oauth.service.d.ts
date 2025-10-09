import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
export declare class OAuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    private mapUserRoleToPrisma;
    private convertExperienceToYears;
    private hashPassword;
    private comparePassword;
    register(registerDto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: number;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.Role;
        };
    }>;
    validateUser(email: string, password: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            role: any;
        };
    }>;
    private generateTokens;
    private updateRefreshToken;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: number): Promise<any>;
    logout(userId: number): Promise<void>;
    updateProfile(userId: number, dto: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        profilePicture?: string;
    }): Promise<{
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        phone_number: string;
        role: import(".prisma/client").$Enums.Role;
        profile_picture: string;
        updated_at: Date;
    }>;
}
