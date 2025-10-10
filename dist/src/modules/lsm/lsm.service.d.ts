import { PrismaService } from '../../../prisma/prisma.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto, DocumentAction } from './dto/document-action.dto';
import { SetProviderStatusDto } from './dto/set-provider-status.dto';
import { RequestBanDto } from './dto/request-ban.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
export declare class LsmService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPendingServiceRequests(userId: number): Promise<{
        id: number;
        serviceName: string;
        category: string;
        description: string;
        provider: {
            id: number;
            businessName: string;
            user: {
                first_name: string;
                last_name: string;
                email: string;
                phone_number: string;
            };
        };
        created_at: Date;
    }[]>;
    approveServiceRequest(userId: number, requestId: number): Promise<{
        id: number;
        status: string;
        message: string;
    }>;
    rejectServiceRequest(userId: number, requestId: number, dto: RejectServiceRequestDto): Promise<{
        id: number;
        status: string;
        reason: string;
        message: string;
    }>;
    getProvidersInRegion(userId: number): Promise<{
        id: number;
        businessName: string;
        status: import(".prisma/client").$Enums.ProviderStatus;
        rating: number;
        experience: number;
        totalJobs: number;
        user: {
            first_name: string;
            last_name: string;
            email: string;
            phone_number: string;
        };
        serviceAreas: string[];
        services: {
            name: string;
            category: string;
        }[];
        documentCount: number;
        jobCount: number;
        created_at: Date;
    }[]>;
    handleDocument(userId: number, providerId: number, documentId: number, dto: DocumentActionDto): Promise<{
        id: number;
        status: import(".prisma/client").$Enums.DocumentStatus;
        action: DocumentAction.REJECT;
        providerStatus: import(".prisma/client").$Enums.ProviderStatus;
        message: string;
    } | {
        id: number;
        status: import(".prisma/client").$Enums.DocumentStatus;
        action: DocumentAction.VERIFY;
        providerStatus: import(".prisma/client").$Enums.ProviderStatus;
        message: string;
    }>;
    getDashboard(userId: number): Promise<{
        region: string;
        summary: {
            totalProviders: number;
            totalJobs: number;
            pendingServiceRequests: number;
            pendingDisputes: number;
        };
        providers: {
            pending: number;
            active: number;
            inactive: number;
            banned: number;
        };
        jobs: {
            new: number;
            in_progress: number;
            completed: number;
            paid: number;
            cancelled: number;
            rejected_by_sp: number;
        };
        disputes: {
            pending: number;
            resolved: number;
        };
        recentActivity: {
            newProviders24h: number;
            completedJobs24h: number;
            documentsVerified24h: number;
        };
    }>;
    private getJobStatsForRegion;
    private getDisputeStatsForRegion;
    private getRecentActivityForRegion;
    getPendingOnboarding(userId: number): Promise<{
        id: number;
        businessName: string;
        user: {
            name: string;
            email: string;
            phone: string;
        };
        status: import(".prisma/client").$Enums.ProviderStatus;
        experience: number;
        experienceLevel: string;
        location: string;
        serviceAreas: string[];
        requestedServices: string[];
        documents: {
            total: number;
            verified: number;
            rejected: number;
            pending: number;
            list: {
                id: number;
                fileName: string;
                status: import(".prisma/client").$Enums.DocumentStatus;
                uploadedAt: Date;
            }[];
        };
        readyForActivation: boolean;
        createdAt: Date;
    }[]>;
    getProviderDetails(userId: number, providerId: number): Promise<{
        provider: {
            id: number;
            businessName: string;
            user: {
                name: string;
                email: string;
                phone: string;
                joinedAt: Date;
                lastLogin: Date;
            };
            status: import(".prisma/client").$Enums.ProviderStatus;
            rating: number;
            experience: number;
            experienceLevel: string;
            description: string;
            location: string;
            warnings: number;
            totalJobs: number;
            earnings: number;
            approvedAt: Date;
            createdAt: Date;
        };
        statistics: {
            totalJobs: number;
            completedJobs: number;
            cancelledJobs: number;
            activeJobs: number;
            averageRating: number;
            totalReviews: number;
        };
        documents: {
            id: number;
            fileName: string;
            filePath: string;
            status: import(".prisma/client").$Enums.DocumentStatus;
            verifiedBy: number;
            verifiedAt: Date;
            uploadedAt: Date;
        }[];
        serviceAreas: string[];
        services: {
            name: string;
            category: string;
        }[];
        recentJobs: {
            id: number;
            service: string;
            customer: string;
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
            createdAt: Date;
            completedAt: Date;
        }[];
        recentFeedback: {
            id: number;
            rating: number;
            feedback: string;
            customer: string;
            createdAt: Date;
        }[];
    }>;
    approveOnboarding(userId: number, providerId: number): Promise<{
        id: number;
        status: import(".prisma/client").$Enums.ProviderStatus;
        approvedAt: Date;
        message: string;
    }>;
    setProviderStatus(userId: number, providerId: number, dto: SetProviderStatusDto): Promise<{
        id: number;
        status: "inactive";
        reason: string;
        jobsAffected: number;
        message: string;
    } | {
        id: number;
        status: "active" | "inactive";
        reason: string;
        message: string;
        jobsAffected?: undefined;
    }>;
    requestBan(userId: number, providerId: number, dto: RequestBanDto): Promise<{
        banRequestId: number;
        providerId: number;
        status: string;
        immediatelyInactivated: boolean;
        message: string;
    }>;
    getDisputes(userId: number, filters: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            job: {
                id: number;
                service: string;
                price: number;
            };
            customer: {
                id: number;
                name: string;
            };
            provider: {
                id: number;
                businessName: string;
            };
            raisedBy: import(".prisma/client").$Enums.SenderType;
            status: import(".prisma/client").$Enums.DisputeStatus;
            chatStatus: {
                lsmInvited: boolean;
                lsmJoined: boolean;
            };
            createdAt: Date;
            resolvedAt: Date;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getDisputeDetails(userId: number, disputeId: number): Promise<{
        dispute: {
            id: number;
            status: import(".prisma/client").$Enums.DisputeStatus;
            raisedBy: import(".prisma/client").$Enums.SenderType;
            resolvedBy: number;
            createdAt: Date;
            resolvedAt: Date;
        };
        job: {
            id: number;
            service: string;
            category: string;
            price: number;
            status: import(".prisma/client").$Enums.JobStatus;
            scheduledAt: Date;
            completedAt: Date;
            answersJson: import("@prisma/client/runtime/library").JsonValue;
        };
        customer: {
            id: number;
            name: string;
            email: string;
            phone: string;
        };
        provider: {
            id: number;
            businessName: string;
            ownerName: string;
            email: string;
            phone: string;
        };
        chatStatus: {
            chatId: string;
            lsmInvited: boolean;
            lsmJoined: boolean;
            lsmJoinedAt: Date;
        };
        chatHistory: {
            id: string;
            senderType: import(".prisma/client").$Enums.SenderType;
            message: string;
            messageType: import(".prisma/client").$Enums.MessageType;
            createdAt: Date;
        }[];
    }>;
    joinDisputeChat(userId: number, disputeId: number): Promise<{
        chatId: string;
        disputeId: number;
        message: string;
    }>;
    resolveDispute(userId: number, disputeId: number, dto: ResolveDisputeDto): Promise<{
        id: number;
        status: string;
        resolvedBy: number;
        resolvedAt: Date;
        message: string;
    }>;
    getJobsInRegion(userId: number, filters: {
        status?: string;
        providerId?: number;
        fromDate?: string;
        toDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            service: string;
            category: string;
            customer: string;
            provider: string;
            status: import(".prisma/client").$Enums.JobStatus;
            price: number;
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
        summary: {
            totalJobs: number;
            totalValue: number;
        };
    }>;
    getServiceRequestsHistory(userId: number, filters: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            serviceName: string;
            category: string;
            description: string;
            provider: {
                id: number;
                businessName: string;
                user: {
                    email: string;
                    first_name: string;
                    last_name: string;
                };
            };
            lsmApproved: boolean;
            adminApproved: boolean;
            finalStatus: import(".prisma/client").$Enums.ApprovalStatus;
            lsmReviewedAt: Date;
            adminReviewedAt: Date;
            rejectionReason: string;
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
