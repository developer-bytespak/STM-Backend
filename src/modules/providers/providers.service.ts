import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestServiceDto } from './dto/request-service.dto';
import { AddServiceDto } from './dto/add-service.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Request a new service
   */
  async requestNewService(userId: number, dto: RequestServiceDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
      include: {
        local_service_manager: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Check if service already exists
    const existingService = await this.prisma.services.findFirst({
      where: {
        name: { equals: dto.serviceName, mode: 'insensitive' },
        category: { equals: dto.category, mode: 'insensitive' },
      },
    });

    if (existingService) {
      throw new ConflictException(
        'This service already exists. You can add it to your profile instead.',
      );
    }

    // Check if provider already has a pending request for this service
    const existingRequest = await this.prisma.service_requests.findFirst({
      where: {
        provider_id: provider.id,
        service_name: { equals: dto.serviceName, mode: 'insensitive' },
        final_status: 'pending',
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'You already have a pending request for this service',
      );
    }

    // Create service request
    const serviceRequest = await this.prisma.service_requests.create({
      data: {
        provider_id: provider.id,
        service_name: dto.serviceName,
        category: dto.category,
        description: dto.description,
        questions_json: dto.suggestedQuestions,
        region: provider.local_service_manager.region,
        final_status: 'pending',
      },
    });

    // Notify LSM
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'local_service_manager',
        recipient_id: provider.local_service_manager.user_id,
        type: 'system',
        title: 'New Service Request',
        message: `${provider.business_name || 'A service provider'} has requested to add "${dto.serviceName}" service`,
      },
    });

    return {
      id: serviceRequest.id,
      serviceName: serviceRequest.service_name,
      category: serviceRequest.category,
      status: serviceRequest.final_status,
      lsm_approved: serviceRequest.lsm_approved,
      admin_approved: serviceRequest.admin_approved,
      created_at: serviceRequest.created_at,
    };
  }

  /**
   * Get all service requests for current provider
   */
  async getMyServiceRequests(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const requests = await this.prisma.service_requests.findMany({
      where: { provider_id: provider.id },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((req) => ({
      id: req.id,
      serviceName: req.service_name,
      category: req.category,
      description: req.description,
      status: req.final_status,
      lsm_approved: req.lsm_approved,
      admin_approved: req.admin_approved,
      lsm_rejection_reason: req.lsm_rejection_reason,
      admin_rejection_reason: req.admin_rejection_reason,
      created_at: req.created_at,
    }));
  }

  /**
   * Add an existing approved service to provider profile
   */
  async addService(userId: number, dto: AddServiceDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Verify service exists and is approved
    const service = await this.prisma.services.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.status !== 'approved') {
      throw new BadRequestException('Service is not approved');
    }

    // Check if provider already offers this service
    const existingLink = await this.prisma.provider_services.findFirst({
      where: {
        provider_id: provider.id,
        service_id: dto.serviceId,
      },
    });

    if (existingLink) {
      throw new ConflictException('You already offer this service');
    }

    // Link provider to service
    const providerService = await this.prisma.provider_services.create({
      data: {
        provider_id: provider.id,
        service_id: dto.serviceId,
        is_active: true,
      },
    });

    return {
      message: 'Service added to your profile successfully',
      serviceId: providerService.service_id,
      serviceName: service.name,
      category: service.category,
    };
  }
}