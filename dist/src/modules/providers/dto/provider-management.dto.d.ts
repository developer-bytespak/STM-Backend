import { ProviderStatus } from '@prisma/client';
export declare class ProviderManagementDto {
    status?: ProviderStatus;
    tier?: string;
    lsm_id?: number;
}
