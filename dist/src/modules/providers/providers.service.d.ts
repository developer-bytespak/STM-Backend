import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderManagementDto } from './dto/provider-management.dto';
import { ProviderFiltersDto } from './dto/provider-filters.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';
export declare class ProvidersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createProviderDto: CreateProviderDto): Promise<ProviderResponseDto>;
    findAll(filters: ProviderFiltersDto): Promise<{
        data: ProviderResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<ProviderResponseDto>;
    findByUserId(userId: number): Promise<ProviderResponseDto>;
    update(id: number, updateProviderDto: UpdateProviderDto): Promise<ProviderResponseDto>;
    updateManagement(id: number, managementDto: ProviderManagementDto): Promise<ProviderResponseDto>;
    remove(id: number): Promise<void>;
    createService(providerId: number, createServiceDto: CreateServiceDto): Promise<any>;
    getProviderServices(providerId: number): Promise<any>;
    getProviderStats(): Promise<any>;
    private transformToResponseDto;
}
