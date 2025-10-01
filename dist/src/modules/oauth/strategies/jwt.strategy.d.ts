import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private oauthService;
    constructor(configService: ConfigService, oauthService: OAuthService);
    validate(payload: any): Promise<any>;
}
export {};
