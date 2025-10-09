import { PrismaService } from '../../../prisma/prisma.service';
import { RequestServiceDto } from './dto/request-service.dto';
import { AddServiceDto } from './dto/add-service.dto';
export declare class ProvidersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
}
