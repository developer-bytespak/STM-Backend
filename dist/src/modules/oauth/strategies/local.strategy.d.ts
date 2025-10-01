import { Strategy } from 'passport-local';
import { OAuthService } from '../oauth.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private oauthService;
    constructor(oauthService: OAuthService);
    validate(email: string, password: string): Promise<any>;
}
export {};
