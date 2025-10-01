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
export declare class CustomerRetentionMetricsDto {
    id: string;
    first_job_date: Date;
    last_job_date: Date;
    total_jobs: number;
    total_spent: number;
    retention_status: string;
    days_since_last_job: number;
    created_at: Date;
}
export declare class CustomerResponseDto {
    id: number;
    address: string;
    user: UserResponseDto;
    customer_retention_metrics?: CustomerRetentionMetricsDto[];
    total_jobs?: number;
    total_spent?: number;
    average_rating?: number;
}
