import { ProviderTier, ProviderStatus } from '@prisma/client';
export declare class ProviderManagementDto {
    status?: ProviderStatus;
    tier?: ProviderTier;
    lsm_id?: number;
}
