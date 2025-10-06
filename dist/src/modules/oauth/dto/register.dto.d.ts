import { UserRole } from '../../users/enums/user-role.enum';
export declare class RegisterDto {
    email: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    region: string;
    zipcode?: string;
    address?: string;
    location?: string;
    experience?: number;
}
