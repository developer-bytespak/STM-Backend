import { PrismaService } from '../../../prisma/prisma.service';
export declare class SearchMatchingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchServices(filters: {
        query?: string;
        category?: string;
        zipcode?: string;
        minPrice?: number;
        maxPrice?: number;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            name: string;
            category: string;
            description: string;
            questionsJson: import("@prisma/client/runtime/library").JsonValue;
            isPopular: boolean;
            availableProviders: number;
            priceRange: {
                min: number;
                max: number;
            };
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getProvidersForService(serviceId: number, zipcode?: string, sortBy?: string): Promise<{
        service: {
            id: number;
            name: string;
            category: string;
            description: string;
            questionsJson: import("@prisma/client/runtime/library").JsonValue;
        };
        providers: {
            id: number;
            businessName: string;
            ownerName: string;
            rating: number;
            totalJobs: number;
            minPrice: number;
            maxPrice: number;
            location: string;
            serviceAreas: string[];
            experience: number;
        }[];
    }>;
    private logSearch;
}
