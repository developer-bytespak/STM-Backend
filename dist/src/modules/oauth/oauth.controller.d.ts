import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class OAuthController {
    private readonly oauthService;
    constructor(oauthService: OAuthService);
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
    login(req: any, loginDto: LoginDto): Promise<{
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
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: number): Promise<any>;
    getMe(user: any): Promise<{
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        role: any;
    }>;
    logout(userId: number): Promise<{
        message: string;
    }>;
    updateMe(userId: number, body: UpdateProfileDto): Promise<{
        email: string;
        role: import(".prisma/client").$Enums.Role;
        id: number;
        first_name: string;
        last_name: string;
        phone_number: string;
        profile_picture: string;
        updated_at: Date;
    }>;
}
