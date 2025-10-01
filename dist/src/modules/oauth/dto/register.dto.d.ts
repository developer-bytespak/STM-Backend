import { UserRole } from '../../user-management/enums/user-role.enum';
export declare class RegisterDto {
    email: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}
