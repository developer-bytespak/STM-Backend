import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
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
}
