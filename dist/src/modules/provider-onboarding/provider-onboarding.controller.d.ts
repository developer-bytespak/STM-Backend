import { ProviderOnboardingService } from './provider-onboarding.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
export declare class ProviderOnboardingController {
    private readonly providerOnboardingService;
    constructor(providerOnboardingService: ProviderOnboardingService);
    uploadDocument(userId: number, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }, dto: UploadDocumentDto): Promise<{
        id: number;
        file_name: string;
        description: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        file_size: number;
        created_at: Date;
    }>;
    getMyDocuments(userId: number): Promise<{
        id: number;
        created_at: Date;
        status: import(".prisma/client").$Enums.DocumentStatus;
        description: string;
        file_name: string;
        file_type: string;
        file_size: number;
        verified_at: Date;
    }[]>;
    deleteDocument(userId: number, documentId: number): Promise<{
        message: string;
    }>;
}
