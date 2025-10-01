import { ProviderTier, ProviderStatus } from '@prisma/client';
export declare class CreateProviderDto {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
    experience: number;
    description?: string;
    location: string;
    lsm_id: number;
    tier?: ProviderTier;
    status?: ProviderStatus;
    is_active?: boolean;
    profile_picture?: any;
    documents?: any[];
}
