"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const customer_response_dto_1 = require("./dto/customer-response.dto");
const class_transformer_1 = require("class-transformer");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createCustomerDto) {
        try {
            const existingUser = await this.prisma.users.findUnique({
                where: { email: createCustomerDto.email }
            });
            if (existingUser) {
                throw new common_1.ConflictException('User with this email already exists');
            }
            const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);
            const result = await this.prisma.$transaction(async (prisma) => {
                const user = await prisma.users.create({
                    data: {
                        first_name: createCustomerDto.first_name,
                        last_name: createCustomerDto.last_name,
                        email: createCustomerDto.email,
                        phone_number: createCustomerDto.phone_number,
                        role: client_1.Role.customer,
                        password: hashedPassword,
                        profile_picture: createCustomerDto.profile_picture,
                    }
                });
                const customer = await prisma.customers.create({
                    data: {
                        user: {
                            connect: { id: user.id }
                        },
                        address: createCustomerDto.address,
                        region: createCustomerDto.region,
                    },
                    include: {
                        user: true,
                    }
                });
                return customer;
            });
            return this.transformToResponseDto(result);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to create customer');
        }
    }
    async findAll(filters) {
        const { search, email, phone_number, is_email_verified, created_from, created_to, page = 1, limit = 10, sort_by = 'created_at', sort_order = 'desc' } = filters;
        const skip = (page - 1) * limit;
        const where = {
            user: {
                role: client_1.Role.customer,
            }
        };
        if (search) {
            where.user.OR = [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (email) {
            where.user.email = email;
        }
        if (phone_number) {
            where.user.phone_number = phone_number;
        }
        if (is_email_verified !== undefined) {
            where.user.is_email_verified = is_email_verified;
        }
        if (created_from || created_to) {
            where.user.created_at = {};
            if (created_from) {
                where.user.created_at.gte = new Date(created_from);
            }
            if (created_to) {
                where.user.created_at.lte = new Date(created_to);
            }
        }
        let orderBy = {};
        if (sort_by === 'first_name' || sort_by === 'last_name' || sort_by === 'email') {
            orderBy = { user: { [sort_by]: sort_order } };
        }
        else if (sort_by === 'total_jobs' || sort_by === 'total_spent') {
            orderBy = { user: { created_at: sort_order } };
        }
        else {
            orderBy = { user: { [sort_by]: sort_order } };
        }
        try {
            const [customers, total] = await Promise.all([
                this.prisma.customers.findMany({
                    where,
                    include: {
                        user: true,
                        jobs: {
                            include: {
                                feedbacks: true,
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy,
                }),
                this.prisma.customers.count({ where })
            ]);
            const transformedCustomers = customers.map(customer => this.transformToResponseDto(customer));
            return {
                data: transformedCustomers,
                total,
                page,
                limit
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch customers');
        }
    }
    async findOne(id) {
        try {
            const customer = await this.prisma.customers.findUnique({
                where: { id },
                include: {
                    user: true,
                    jobs: {
                        include: {
                            feedbacks: true,
                        }
                    }
                }
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            return this.transformToResponseDto(customer);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to fetch customer');
        }
    }
    async findByUserId(userId) {
        try {
            const customer = await this.prisma.customers.findUnique({
                where: { user_id: userId },
                include: {
                    user: true,
                    jobs: {
                        include: {
                            feedbacks: true,
                        }
                    }
                }
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with user ID ${userId} not found`);
            }
            return this.transformToResponseDto(customer);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to fetch customer');
        }
    }
    async update(id, updateCustomerDto) {
        try {
            const existingCustomer = await this.prisma.customers.findUnique({
                where: { id },
                include: { user: true }
            });
            if (!existingCustomer) {
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.user.email) {
                const emailExists = await this.prisma.users.findUnique({
                    where: { email: updateCustomerDto.email }
                });
                if (emailExists) {
                    throw new common_1.ConflictException('User with this email already exists');
                }
            }
            const userUpdateData = {};
            const customerUpdateData = {};
            if (updateCustomerDto.first_name)
                userUpdateData.first_name = updateCustomerDto.first_name;
            if (updateCustomerDto.last_name)
                userUpdateData.last_name = updateCustomerDto.last_name;
            if (updateCustomerDto.email)
                userUpdateData.email = updateCustomerDto.email;
            if (updateCustomerDto.phone_number)
                userUpdateData.phone_number = updateCustomerDto.phone_number;
            if (updateCustomerDto.profile_picture)
                userUpdateData.profile_picture = updateCustomerDto.profile_picture;
            if (updateCustomerDto.password) {
                userUpdateData.password = await bcrypt.hash(updateCustomerDto.password, 10);
            }
            if (updateCustomerDto.address)
                customerUpdateData.address = updateCustomerDto.address;
            const result = await this.prisma.$transaction(async (prisma) => {
                if (Object.keys(userUpdateData).length > 0) {
                    await prisma.users.update({
                        where: { id: existingCustomer.user_id },
                        data: userUpdateData
                    });
                }
                if (Object.keys(customerUpdateData).length > 0) {
                    await prisma.customers.update({
                        where: { id },
                        data: customerUpdateData
                    });
                }
                return prisma.customers.findUnique({
                    where: { id },
                    include: {
                        user: true,
                        jobs: {
                            include: {
                                feedbacks: true,
                            }
                        }
                    }
                });
            });
            return this.transformToResponseDto(result);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ConflictException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to update customer');
        }
    }
    async remove(id) {
        try {
            const customer = await this.prisma.customers.findUnique({
                where: { id },
                include: { user: true }
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
            }
            await this.prisma.$transaction(async (prisma) => {
                await prisma.customers.delete({
                    where: { id }
                });
                await prisma.users.delete({
                    where: { id: customer.user_id }
                });
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to delete customer');
        }
    }
    async getCustomerStats() {
        try {
            const [totalCustomers, verifiedCustomers, recentCustomers, totalJobsCount] = await Promise.all([
                this.prisma.customers.count(),
                this.prisma.customers.count({
                    where: {
                        user: {
                            is_email_verified: true
                        }
                    }
                }),
                this.prisma.customers.count({
                    where: {
                        user: {
                            created_at: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                            }
                        }
                    }
                }),
                this.prisma.jobs.count()
            ]);
            return {
                total_customers: totalCustomers,
                verified_customers: verifiedCustomers,
                verification_rate: totalCustomers > 0 ? (verifiedCustomers / totalCustomers) * 100 : 0,
                retention_breakdown: {},
                recent_customers: recentCustomers,
                average_jobs_per_customer: totalCustomers > 0 ? totalJobsCount / totalCustomers : 0
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to fetch customer statistics');
        }
    }
    transformToResponseDto(customer) {
        const response = (0, class_transformer_1.plainToClass)(customer_response_dto_1.CustomerResponseDto, {
            id: customer.id,
            address: customer.address,
            user: customer.user,
            total_jobs: customer.jobs?.length || 0,
            total_spent: 0,
            average_rating: this.calculateAverageRating(customer.jobs)
        }, { excludeExtraneousValues: true });
        return response;
    }
    calculateAverageRating(jobs) {
        if (!jobs || jobs.length === 0)
            return 0;
        const ratingsWithFeedback = jobs
            .flatMap(job => job.feedbacks)
            .filter(rating => rating.rating && rating.rating > 0);
        if (ratingsWithFeedback.length === 0)
            return 0;
        const totalRating = ratingsWithFeedback.reduce((sum, rating) => sum + rating.rating, 0);
        return totalRating / ratingsWithFeedback.length;
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map