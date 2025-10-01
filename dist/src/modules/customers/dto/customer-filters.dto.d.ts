import { RetentionStatus } from '@prisma/client';
export declare class CustomerFiltersDto {
    search?: string;
    email?: string;
    phone_number?: string;
    retention_status?: RetentionStatus;
    is_email_verified?: boolean;
    min_total_jobs?: number;
    max_total_jobs?: number;
    min_total_spent?: number;
    max_total_spent?: number;
    created_from?: string;
    created_to?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
