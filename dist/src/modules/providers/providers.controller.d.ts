import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderManagementDto } from './dto/provider-management.dto';
import { ProviderFiltersDto } from './dto/provider-filters.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';
export declare class ProvidersController {
    private readonly providersService;
    constructor(providersService: ProvidersService);
    create(createProviderDto: CreateProviderDto, documents?: any[]): Promise<ProviderResponseDto>;
    findAll(filters: ProviderFiltersDto): Promise<{
        data: ProviderResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getProviderStats(): Promise<any>;
    findByUserId(userId: number): Promise<ProviderResponseDto>;
    findOne(id: number): Promise<ProviderResponseDto>;
    update(id: number, updateProviderDto: UpdateProviderDto, documents?: any[]): Promise<ProviderResponseDto>;
    updateManagement(id: number, managementDto: ProviderManagementDto): Promise<ProviderResponseDto>;
    remove(id: number): Promise<void>;
    getProviderServices(id: number): Promise<any>;
    createService(id: number, createServiceDto: CreateServiceDto, documents?: any[]): Promise<any>;
}
