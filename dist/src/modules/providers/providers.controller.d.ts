import { ProvidersService } from './providers.service';
import { RequestServiceDto } from './dto/request-service.dto';
import { AddServiceDto } from './dto/add-service.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
export declare class ProvidersController {
    private readonly providersService;
    constructor(providersService: ProvidersService);
    requestNewService(userId: number, dto: RequestServiceDto): Promise<{
        id: number;
        serviceName: string;
        category: string;
        status: import(".prisma/client").$Enums.ApprovalStatus;
        lsm_approved: boolean;
        admin_approved: boolean;
        created_at: Date;
    }>;
    getMyServiceRequests(userId: number): Promise<{
        id: number;
        serviceName: string;
        category: string;
        description: string;
        status: import(".prisma/client").$Enums.ApprovalStatus;
        lsm_approved: boolean;
        admin_approved: boolean;
        lsm_rejection_reason: string;
        admin_rejection_reason: string;
        created_at: Date;
    }[]>;
    addService(userId: number, dto: AddServiceDto): Promise<{
        message: string;
        serviceId: number;
        serviceName: string;
        category: string;
    }>;
    getDashboard(userId: number): Promise<{
        summary: {
            totalJobs: number;
            totalEarnings: number;
            averageRating: number;
            warnings: number;
        };
        jobs: {
            new: number;
            in_progress: number;
            completed: number;
            paid: number;
            cancelled: number;
            rejected_by_sp: number;
        };
        pendingActions: {
            newJobRequests: number;
            jobsToComplete: number;
            paymentsToMark: number;
        };
        recentJobs: {
            id: number;
            service: string;
            customer: string;
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
            createdAt: Date;
        }[];
        recentFeedback: {
            id: number;
            rating: number;
            feedback: string;
            customer: string;
            createdAt: Date;
        }[];
    }>;
    getProfile(userId: number): Promise<{
        user: {
            name: string;
            email: string;
            phone: string;
        };
        business: {
            businessName: string;
            description: string;
            location: string;
            zipcode: string;
            minPrice: number;
            maxPrice: number;
            experience: number;
            experienceLevel: string;
        };
        status: {
            current: import(".prisma/client").$Enums.ProviderStatus;
            canDeactivate: boolean;
            activeJobsCount: number;
            warnings: number;
        };
        services: {
            id: number;
            name: string;
            category: string;
        }[];
        serviceAreas: {
            zipcode: string;
            isPrimary: boolean;
        }[];
        documents: {
            total: number;
            verified: number;
            pending: number;
            list: {
                id: number;
                fileName: string;
                status: import(".prisma/client").$Enums.DocumentStatus;
                verifiedAt: Date;
                uploadedAt: Date;
            }[];
        };
        statistics: {
            totalJobs: number;
            earnings: number;
            rating: number;
        };
    }>;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<{
        message: string;
    }>;
    setAvailability(userId: number, dto: SetAvailabilityDto): Promise<{
        status: "active" | "inactive";
        message: string;
    }>;
    getJobDetails(userId: number, jobId: number): Promise<{
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
            paidAt: Date;
            responseDeadline: Date;
            createdAt: Date;
        };
        customer: {
            name: string;
            phone: string;
            address: string;
        };
        payment: {
            amount: number;
            method: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            markedAt: Date;
            notes: string;
        };
        chatId: string;
        actions: {
            canMarkComplete: boolean;
            canMarkPayment: boolean;
        };
    }>;
    updateJobStatus(userId: number, jobId: number, dto: UpdateJobStatusDto): Promise<{
        jobId: number;
        status: import(".prisma/client").$Enums.JobStatus;
        completedAt: Date;
        message: string;
    } | {
        jobId: number;
        status: string;
        paymentAmount: number;
        paymentMethod: string;
        markedAt: Date;
        message: string;
    }>;
    getJobs(userId: number, status?: string, fromDate?: string, toDate?: string, page?: string, limit?: string): Promise<{
        data: {
            id: number;
            service: string;
            category: string;
            customer: {
                name: string;
                phone: string;
            };
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            scheduledAt: Date;
            completedAt: Date;
            createdAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
