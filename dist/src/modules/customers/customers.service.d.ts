import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { JobActionDto } from './dto/job-action.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FileDisputeDto } from './dto/file-dispute.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto>;
    findAll(filters: CustomerFiltersDto): Promise<{
        data: CustomerResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<CustomerResponseDto>;
    findByUserId(userId: number): Promise<CustomerResponseDto>;
    update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto>;
    remove(id: number): Promise<void>;
    getCustomerStats(): Promise<any>;
    private transformToResponseDto;
    private calculateAverageRating;
    getCustomerDashboard(userId: number): Promise<{
        summary: {
            totalJobs: number;
            totalSpent: number;
            pendingFeedback: number;
        };
        jobs: {
            new: number;
            in_progress: number;
            completed: number;
            paid: number;
            cancelled: number;
            rejected_by_sp: number;
        };
        recentJobs: {
            id: number;
            service: string;
            provider: string;
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
            createdAt: Date;
        }[];
        recentFeedback: {
            id: number;
            rating: number;
            feedback: string;
            provider: string;
            createdAt: Date;
        }[];
    }>;
    getCustomerJobDetails(userId: number, jobId: number): Promise<{
        job: {
            id: number;
            service: string;
            category: string;
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
            originalAnswers: import("@prisma/client/runtime/library").JsonValue;
            editedAnswers: import("@prisma/client/runtime/library").JsonValue;
            spAccepted: boolean;
            pendingApproval: boolean;
            location: string;
            scheduledAt: Date;
            completedAt: Date;
            createdAt: Date;
        };
        provider: {
            id: number;
            businessName: string;
            ownerName: string;
            phone: string;
            rating: number;
            location: string;
        };
        payment: {
            amount: number;
            status: import(".prisma/client").$Enums.PaymentStatus;
            method: string;
            markedAt: Date;
        };
        chatId: string;
        actions: {
            canApproveEdits: boolean;
            canCloseDeal: boolean;
            canCancel: boolean;
            canGiveFeedback: boolean;
        };
    }>;
    performJobAction(userId: number, jobId: number, dto: JobActionDto): Promise<{
        message: string;
    }>;
    submitFeedback(userId: number, jobId: number, dto: SubmitFeedbackDto): Promise<{
        message: string;
    }>;
    getPendingFeedback(userId: number): Promise<{
        pendingCount: number;
        jobs: {
            jobId: number;
            service: string;
            provider: string;
            completedAt: Date;
            amount: number;
        }[];
    }>;
    fileDispute(userId: number, dto: FileDisputeDto): Promise<{
        disputeId: number;
        message: string;
    }>;
    getCustomerProfile(userId: number): Promise<{
        user: {
            name: string;
            email: string;
            phone: string;
        };
        address: string;
        region: string;
        zipcode: string;
        statistics: {
            totalJobs: number;
            totalSpent: number;
        };
    }>;
    updateCustomerProfile(userId: number, dto: UpdateCustomerProfileDto): Promise<{
        message: string;
    }>;
    requestNewService(userId: number, dto: any): Promise<{
        message: string;
        requestId: number;
    }>;
    private calculateCancellationFee;
}
