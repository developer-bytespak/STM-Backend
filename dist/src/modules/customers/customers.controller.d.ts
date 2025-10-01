import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(createCustomerDto: CreateCustomerDto, profilePicture?: any): Promise<CustomerResponseDto>;
    findAll(filters: CustomerFiltersDto): Promise<{
        data: CustomerResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCustomerStats(): Promise<any>;
    findByUserId(userId: number): Promise<CustomerResponseDto>;
    findOne(id: number): Promise<CustomerResponseDto>;
    update(id: number, updateCustomerDto: UpdateCustomerDto, profilePicture?: any): Promise<CustomerResponseDto>;
    remove(id: number): Promise<void>;
}
