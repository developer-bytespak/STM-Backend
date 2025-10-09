"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchMatchingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SearchMatchingService = class SearchMatchingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchServices(filters) {
        const { query, category, zipcode, minPrice, maxPrice, page = 1, limit = 20 } = filters;
        const finalLimit = Math.min(limit, 100);
        const where = {
            status: 'approved',
        };
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } },
            ];
        }
        if (category) {
            where.category = { contains: category, mode: 'insensitive' };
        }
        const total = await this.prisma.services.count({ where });
        if (query && query.length > 0) {
            this.logSearch(query, zipcode).catch((err) => {
                console.error('Search logging failed:', err);
            });
        }
        const services = await this.prisma.services.findMany({
            where,
            include: {
                provider_services: {
                    where: {
                        is_active: true,
                        provider: {
                            status: 'active',
                        },
                    },
                    include: {
                        provider: {
                            select: {
                                min_price: true,
                                max_price: true,
                                service_areas: zipcode
                                    ? {
                                        where: {
                                            zipcode: zipcode,
                                        },
                                    }
                                    : true,
                            },
                        },
                    },
                },
            },
            skip: (page - 1) * finalLimit,
            take: finalLimit,
            orderBy: [{ is_popular: 'desc' }, { name: 'asc' }],
        });
        let filteredServices = services;
        if (zipcode) {
            filteredServices = services.filter((service) => service.provider_services.some((ps) => ps.provider.service_areas && ps.provider.service_areas.length > 0));
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            filteredServices = filteredServices.filter((service) => {
                const providers = service.provider_services;
                return providers.some((ps) => {
                    const providerMinPrice = ps.provider.min_price
                        ? Number(ps.provider.min_price)
                        : 0;
                    const providerMaxPrice = ps.provider.max_price
                        ? Number(ps.provider.max_price)
                        : Infinity;
                    const matchesMin = minPrice === undefined || providerMaxPrice >= minPrice;
                    const matchesMax = maxPrice === undefined || providerMinPrice <= maxPrice;
                    return matchesMin && matchesMax;
                });
            });
        }
        return {
            data: filteredServices.map((service) => {
                const providers = service.provider_services;
                const prices = providers
                    .map((ps) => ({
                    min: ps.provider.min_price ? Number(ps.provider.min_price) : 0,
                    max: ps.provider.max_price ? Number(ps.provider.max_price) : 0,
                }))
                    .filter((p) => p.min > 0 || p.max > 0);
                const minServicePrice = prices.length > 0 ? Math.min(...prices.map((p) => p.min)) : 0;
                const maxServicePrice = prices.length > 0 ? Math.max(...prices.map((p) => p.max)) : 0;
                return {
                    id: service.id,
                    name: service.name,
                    category: service.category,
                    description: service.description,
                    questionsJson: service.questions_json,
                    isPopular: service.is_popular,
                    availableProviders: providers.length,
                    priceRange: {
                        min: minServicePrice,
                        max: maxServicePrice,
                    },
                };
            }),
            pagination: {
                total: filteredServices.length,
                page,
                limit: finalLimit,
                totalPages: Math.ceil(filteredServices.length / finalLimit),
            },
        };
    }
    async getProvidersForService(serviceId, zipcode, sortBy = 'rating') {
        const service = await this.prisma.services.findUnique({
            where: { id: serviceId },
        });
        if (!service || service.status !== 'approved') {
            throw new common_1.NotFoundException('Service not found or not available');
        }
        const where = {
            service_id: serviceId,
            is_active: true,
            provider: {
                status: 'active',
            },
        };
        if (zipcode) {
            where.provider = {
                ...where.provider,
                service_areas: {
                    some: {
                        zipcode: zipcode,
                    },
                },
            };
        }
        const providerServices = await this.prisma.provider_services.findMany({
            where,
            include: {
                provider: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                phone_number: true,
                            },
                        },
                        service_areas: true,
                    },
                },
            },
        });
        const providers = providerServices.map((ps) => ({
            id: ps.provider.id,
            businessName: ps.provider.business_name,
            ownerName: `${ps.provider.user.first_name} ${ps.provider.user.last_name}`,
            rating: Number(ps.provider.rating),
            totalJobs: ps.provider.total_jobs,
            minPrice: ps.provider.min_price ? Number(ps.provider.min_price) : null,
            maxPrice: ps.provider.max_price ? Number(ps.provider.max_price) : null,
            location: ps.provider.location,
            serviceAreas: ps.provider.service_areas.map((area) => area.zipcode),
            experience: ps.provider.experience,
        }));
        if (sortBy === 'rating') {
            providers.sort((a, b) => b.rating - a.rating);
        }
        else if (sortBy === 'price') {
            providers.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
        }
        return {
            service: {
                id: service.id,
                name: service.name,
                category: service.category,
                description: service.description,
                questionsJson: service.questions_json,
            },
            providers,
        };
    }
    async logSearch(query, zipcode) {
        const matchingServices = await this.prisma.services.findMany({
            where: {
                status: 'approved',
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { category: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 1,
        });
        if (matchingServices.length === 0) {
        }
        if (matchingServices.length > 0) {
            for (const service of matchingServices) {
                await this.prisma.service_search_logs.create({
                    data: {
                        service_id: service.id,
                        region: zipcode || 'unknown',
                        zipcode: zipcode,
                        searched_at: new Date(),
                    },
                });
            }
        }
    }
};
exports.SearchMatchingService = SearchMatchingService;
exports.SearchMatchingService = SearchMatchingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchMatchingService);
//# sourceMappingURL=search-matching.service.js.map