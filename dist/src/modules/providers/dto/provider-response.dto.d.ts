import { ProviderTier, ProviderStatus } from '@prisma/client';
export declare class UserResponseDto {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role: string;
    created_at: Date;
    updated_at: Date;
    is_email_verified: boolean;
    last_login: Date;
    password: string;
    refresh_token: string;
}
export declare class LSMResponseDto {
    id: number;
    region: string;
    status: string;
    closed_deals_count: number;
    earnings: number;
    created_at: Date;
}
export declare class PerformanceMetricsDto {
    id: number;
    job_count: number;
    avg_rating: number;
    punctuality_score: number;
    avg_response_time: number;
    created_at: Date;
}
export declare class ProviderResponseDto {
    id: number;
    experience: number;
    description: string;
    rating: number;
    tier: ProviderTier;
    location: string;
    is_active: boolean;
    status: ProviderStatus;
    earning: number;
    total_jobs: number;
    user: UserResponseDto;
    local_service_manager: LSMResponseDto;
    performance_metrics?: PerformanceMetricsDto[];
    latest_performance?: PerformanceMetricsDto;
    total_services_created?: number;
    total_available_services?: number;
}
