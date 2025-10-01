export declare class OAuthService {
    validateUser(email: string, password: string): Promise<any>;
    getProfile(userId: string): Promise<any>;
}
