import { LsmService } from './lsm.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto } from './dto/document-action.dto';
export declare class LsmController {
    private readonly lsmService;
    constructor(lsmService: LsmService);
    getPendingServiceRequests(userId: number): Promise<{
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
            email: string;
            first_name: string;
            last_name: string;
            phone_number: string;
        };
        serviceAreas: string[];
        services: {
            category: string;
            name: string;
        }[];
        documentCount: number;
        jobCount: number;
        created_at: Date;
    }[]>;
    handleDocument(userId: number, providerId: number, documentId: number, dto: DocumentActionDto): Promise<{
        id: number;
        status: import(".prisma/client").$Enums.DocumentStatus;
        action: import("./dto/document-action.dto").DocumentAction.VERIFY;
        providerStatus: string;
        message: string;
    } | {
        id: number;
        status: import(".prisma/client").$Enums.DocumentStatus;
        action: import("./dto/document-action.dto").DocumentAction.REJECT;
        providerStatus: import(".prisma/client").$Enums.ProviderStatus;
        message: string;
    }>;
}
