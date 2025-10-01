import { ProviderTier, ProviderStatus } from '@prisma/client';
export declare class ProviderFiltersDto {
    search?: string;
    email?: string;
    phone_number?: string;
    location?: string;
    tier?: ProviderTier;
    status?: ProviderStatus;
    is_active?: boolean;
    lsm_id?: number;
    is_email_verified?: boolean;
    min_rating?: number;
    max_rating?: number;
    min_experience?: number;
    max_experience?: number;
    min_total_jobs?: number;
    max_total_jobs?: number;
    min_earnings?: number;
    max_earnings?: number;
    created_from?: string;
    created_to?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
