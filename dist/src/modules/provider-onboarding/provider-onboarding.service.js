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
exports.ProviderOnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ProviderOnboardingService = class ProviderOnboardingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadDocument(userId, file, description) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: { service_provider: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== 'service_provider') {
            throw new common_1.ForbiddenException('Only service providers can upload documents');
        }
        if (!user.service_provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new common_1.BadRequestException('File size must be less than 10MB');
        }
        const allowedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only PDF, PNG, JPG, and DOCX files are allowed');
        }
        const base64File = file.buffer.toString('base64');
        const filePath = `data:${file.mimetype};base64,${base64File}`;
        const document = await this.prisma.provider_documents.create({
            data: {
                provider_id: user.service_provider.id,
                file_name: file.originalname,
                file_path: filePath,
                file_type: file.mimetype,
                file_size: file.size,
                description: description,
                status: 'pending',
            },
        });
        return {
            id: document.id,
            file_name: document.file_name,
            description: document.description,
            status: document.status,
            file_size: document.file_size,
            created_at: document.created_at,
        };
    }
    async getMyDocuments(userId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: { service_provider: true },
        });
        if (!user || !user.service_provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const documents = await this.prisma.provider_documents.findMany({
            where: { provider_id: user.service_provider.id },
            select: {
                id: true,
                file_name: true,
                file_type: true,
                file_size: true,
                description: true,
                status: true,
                verified_at: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' },
        });
        return documents;
    }
    async deleteDocument(userId, documentId) {
        const user = await this.prisma.users.findUnique({
            where: { id: userId },
            include: { service_provider: true },
        });
        if (!user || !user.service_provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const document = await this.prisma.provider_documents.findUnique({
            where: { id: documentId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        if (document.provider_id !== user.service_provider.id) {
            throw new common_1.ForbiddenException('You can only delete your own documents');
        }
        await this.prisma.provider_documents.delete({
            where: { id: documentId },
        });
        return { message: 'Document deleted successfully' };
    }
};
exports.ProviderOnboardingService = ProviderOnboardingService;
exports.ProviderOnboardingService = ProviderOnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProviderOnboardingService);
//# sourceMappingURL=provider-onboarding.service.js.map