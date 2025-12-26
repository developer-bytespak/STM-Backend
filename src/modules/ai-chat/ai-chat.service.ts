import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { HomepageService } from '../homepage/homepage.service';
import { randomUUID } from 'crypto';
import { SendMessageDto } from './dto/send-message.dto';
import { RecommendProvidersDto } from './dto/recommend-providers.dto';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly homepageService: HomepageService,
  ) {}

  /**
   * Get database context for AI prompt (services, providers, locations)
   * This provides real-time context to the LLM
   */
  private async getDatabaseContext(): Promise<string> {
    try {
      // Fetch all approved services
      const services = await this.prisma.services.findMany({
        where: { status: 'approved' },
        select: { name: true, description: true, category: true },
        take: 50, // Limit to avoid token overflow
      });

      // Fetch active providers with their locations and services
      const providers = await this.prisma.service_providers.findMany({
        where: { 
          is_active: true,
          status: 'active',
        },
        include: {
          user: true,
          provider_services: {
            where: { is_active: true },
            include: {
              service: true,
            },
          },
          service_areas: true,
        },
        take: 100, // Limit to top providers
        orderBy: { rating: 'desc' },
      });

      // All providers are already filtered by is_active and status, no additional filter needed
      const activeProviders = providers;

      // Build top 3 providers per service (sorted by rating)
      const providersByService: Record<string, Array<{ name: string; rating: number | Decimal; serviceCount: number; zipcode?: string }>> = {};
      
      activeProviders.forEach(p => {
        if (p.provider_services && p.provider_services.length > 0) {
          p.provider_services.forEach(ps => {
            const serviceName = ps.service.name;
            if (!providersByService[serviceName]) {
              providersByService[serviceName] = [];
            }
            providersByService[serviceName].push({
              name: ((p.user?.first_name || '') + ' ' + (p.user?.last_name || '')).trim() || 'Unknown Provider',
              rating: p.rating || 0,
              serviceCount: p.provider_services.length,
              zipcode: p.zipcode,
            });
          });
        }
      });

      // Sort each service's providers by rating and get top 3
      const topProvidersPerService: Record<string, string> = {};
      Object.entries(providersByService).forEach(([service, providers]) => {
        const top3 = providers
          .sort((a, b) => {
            const ratingA = typeof a.rating === 'number' ? a.rating : a.rating.toNumber();
            const ratingB = typeof b.rating === 'number' ? b.rating : b.rating.toNumber();
            return ratingB - ratingA;
          })
          .slice(0, 3)
          .map((p, i) => {
            const ratingNum = typeof p.rating === 'number' ? p.rating : p.rating.toNumber();
            return `${i + 1}. ${p.name} (Rating: ${ratingNum.toFixed(1)}/5${p.zipcode ? `, Area: ${p.zipcode}` : ''})`;
          })
          .join('\n   ');
        topProvidersPerService[service] = top3;
      });

      // Format services list grouped by category
      const servicesByCategory: Record<string, string[]> = {};
      services.forEach(s => {
        if (!servicesByCategory[s.category]) {
          servicesByCategory[s.category] = [];
        }
        servicesByCategory[s.category].push(`${s.name}${s.description ? ': ' + s.description : ''}`);
      });

      const servicesList = Object.entries(servicesByCategory)
        .map(([category, servicesInCat]) => `\n${category}:\n${servicesInCat.map(s => `  - ${s}`).join('\n')}`)
        .join('\n');

      // Extract unique zipcodes from provider service areas
      const zipcodes = new Set<string>();
      activeProviders.forEach(p => {
        if (p.service_areas && p.service_areas.length > 0) {
          p.service_areas.forEach(area => zipcodes.add(area.zipcode));
        } else if (p.zipcode) {
          // Fallback to provider's primary zipcode
          zipcodes.add(p.zipcode);
        }
      });

      // Format service provider availability
      const serviceProviderMap: Record<string, number> = {};
      activeProviders.forEach(p => {
        if (p.provider_services && p.provider_services.length > 0) {
          p.provider_services.forEach(ps => {
            const serviceName = ps.service.name;
            serviceProviderMap[serviceName] = (serviceProviderMap[serviceName] || 0) + 1;
          });
        }
      });

      const providerSummary = Object.entries(serviceProviderMap)
        .sort((a, b) => b[1] - a[1]) // Sort by provider count descending
        .map(([service, count]) => `- ${service}: ${count} provider${count > 1 ? 's' : ''} available`)
        .join('\n');

      // Get top cities/locations
      const locationCounts: Record<string, number> = {};
      activeProviders.forEach(p => {
        const loc = p.city || p.location;
        if (loc) {
          locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
      });

      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([loc, count]) => `${loc} (${count} providers)`)
        .join(', ');

      const contextString = `\n\n--- PLATFORM DATA (Use this to match customers with best providers) ---\n\nAVAILABLE SERVICES:${servicesList}\n\nSERVICE PROVIDER AVAILABILITY:\n${providerSummary}\n\nTOP 3 PROVIDERS BY SERVICE:\n${Object.entries(topProvidersPerService).map(([service, providers]) => `\n${service}:\n   ${providers}`).join('\n')}\n\nSERVICE COVERAGE:\n- Total Zipcodes: ${zipcodes.size} zipcodes covered\n- Top Locations: ${topLocations}\n- Total Active Providers: ${activeProviders.length}\n\n--- END PLATFORM DATA ---\n`;

      return contextString;
    } catch (error) {
      this.logger.error('Failed to fetch database context', error);
      return ''; // Return empty if context fetch fails
    }
  }

  /**
   * Create a new AI chat session for a customer
   * Deactivates any existing active session
   */
  async createSession(userId: number) {
    // Verify user is a customer and get customer ID
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Deactivate any existing active session
      await tx.ai_chat_sessions.updateMany({
        where: {
          user_id: customer.id, // Use customer.id (customers.id), not users.id
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      // Create new session
      const sessionId = randomUUID();
      const session = await tx.ai_chat_sessions.create({
        data: {
          user_id: customer.id, // Use customer.id (customers.id), not users.id
          session_id: sessionId,
          is_active: true,
          last_active: new Date(),
        },
      });

      return {
        id: session.id,
        sessionId: session.session_id,
        isActive: session.is_active,
        createdAt: session.created_at,
      };
    });
  }

  /**
   * Get active session for a customer
   */
  async getActiveSession(userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const session = await this.prisma.ai_chat_sessions.findFirst({
      where: {
        user_id: customer.id, // Use customer.id (customers.id), not users.id
        is_active: true,
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      sessionId: session.session_id,
      summary: session.summary,
      isActive: session.is_active,
      createdAt: session.created_at,
      lastActive: session.last_active,
      messages: session.messages.map((msg) => ({
        id: msg.id,
        senderType: msg.sender_type,
        message: msg.message,
        createdAt: msg.created_at,
      })),
    };
  }

  /**
   * Get session history for a customer
   */
  async getSessionHistory(userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const sessions = await this.prisma.ai_chat_sessions.findMany({
      where: {
        user_id: customer.id, // Use customer.id (customers.id), not users.id
      },
      orderBy: { created_at: 'desc' },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          take: 1, // Just get first message for preview
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionId: session.session_id,
      summary: session.summary,
      isActive: session.is_active,
      createdAt: session.created_at,
      lastActive: session.last_active,
      messageCount: session.messages.length,
    }));
  }

  /**
   * Send a message to AI and get response
   */
  async sendMessage(sessionId: string, userId: number, dto: SendMessageDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Find session
    const session = await this.prisma.ai_chat_sessions.findFirst({
      where: {
        session_id: sessionId,
        user_id: customer.id, // Use customer.id (customers.id), not users.id
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    if (!session.is_active) {
      throw new BadRequestException('Session is not active');
    }

    // Build conversation history for AI
    const conversationHistory = session.messages.map((msg) => ({
      role: msg.sender_type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.message,
    }));

    // Get real-time database context for AI
    const dbContext = await this.getDatabaseContext();

    // Save user message
    await this.prisma.ai_chat_messages.create({
      data: {
        session_id: session.id,
        sender_type: 'user',
        message: dto.message,
      },
    });

    // Get AI response with database context
    let aiResponse: string;
    try {
      aiResponse = await this.aiService.askSalesAssistant(
        dto.message,
        conversationHistory,
        dbContext,
      );
    } catch (error) {
      this.logger.error('AI response failed', error);
      aiResponse = 'Sorry, I encountered an error. Please try again.';
    }

    // Save AI response
    const aiMessage = await this.prisma.ai_chat_messages.create({
      data: {
        session_id: session.id,
        sender_type: 'assistant',
        message: aiResponse,
      },
    });

    // Update last_active
    await this.prisma.ai_chat_sessions.update({
      where: { id: session.id },
      data: { last_active: new Date() },
    });

    return {
      userMessage: {
        id: session.messages.length > 0 ? session.messages[session.messages.length - 1].id : null,
        senderType: 'user',
        message: dto.message,
        createdAt: new Date(),
      },
      aiMessage: {
        id: aiMessage.id,
        senderType: 'assistant',
        message: aiResponse,
        createdAt: aiMessage.created_at,
      },
    };
  }

  /**
   * Generate summary from conversation
   */
  async generateSummary(sessionId: string, userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const session = await this.prisma.ai_chat_sessions.findFirst({
      where: {
        session_id: sessionId,
        user_id: customer.id, // Use customer.id (customers.id), not users.id
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    if (session.summary) {
      return { summary: session.summary };
    }

    // Build conversation history
    const conversationHistory = session.messages.map((msg) => ({
      role: msg.sender_type === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.message,
    }));

    // Get database context for accurate summary
    const dbContext = await this.getDatabaseContext();

    // Ask AI to generate summary with proper formatting
    const summaryPrompt = `Based on our conversation, please generate a structured summary with the following information on separate lines:

Service: [extracted service type]
Location: [extracted zipcode or location]
Budget: [extracted budget if mentioned]
Requirements: [extracted requirements or special requests]

Be concise and extract only information that was explicitly mentioned in the conversation.`;
    
    let summary: string;
    try {
      summary = await this.aiService.askSalesAssistant(
        summaryPrompt,
        conversationHistory,
        dbContext,
      );
    } catch (error) {
      this.logger.error('Summary generation failed', error);
      throw new BadRequestException('Failed to generate summary');
    }

    // Save summary
    await this.prisma.ai_chat_sessions.update({
      where: { id: session.id },
      data: { summary },
    });

    return { summary };
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const session = await this.prisma.ai_chat_sessions.findFirst({
      where: {
        session_id: sessionId,
        user_id: customer.id, // Use customer.id (customers.id), not users.id
      },
    });

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    await this.prisma.ai_chat_sessions.update({
      where: { id: session.id },
      data: { is_active: false },
    });

    return { message: 'Session ended successfully' };
  }

  /**
   * Get recommended providers (top 3) based on service and location
   */
  async getRecommendedProviders(dto: RecommendProvidersDto) {
    this.logger.log(`[Provider Search] Service: "${dto.service}", Zipcode: "${dto.zipcode}"`);
    
    try {
      // Find service by name (case insensitive)
      const service = await this.prisma.services.findFirst({
        where: {
          name: { contains: dto.service, mode: 'insensitive' },
          status: 'approved',
        },
      });

      if (!service) {
        this.logger.warn(`Service "${dto.service}" not found`);
        return { providers: [], count: 0, service: dto.service, location: dto.zipcode };
      }

      // Find providers offering this service in the area, sorted by rating
      const providers = await this.prisma.service_providers.findMany({
        where: {
          is_active: true,
          is_deleted: false,
          status: 'active',
          provider_services: {
            some: { service_id: service.id },
          },
          OR: [
            { zipcode: dto.zipcode },
            { city: { contains: dto.zipcode, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          business_name: true,
          user: { select: { first_name: true, last_name: true } },
          location: true,
          city: true,
          zipcode: true,
          rating: true,
          total_jobs: true,
          experience: true,
          min_price: true,
          max_price: true,
        },
        orderBy: { rating: 'desc' },
        take: 10,
      });

      // If no exact match, try broader search
      let finalProviders = providers;
      if (providers.length === 0) {
        this.logger.log(`No providers in ${dto.zipcode}, trying broader search...`);
        finalProviders = await this.prisma.service_providers.findMany({
          where: {
            is_active: true,
            is_deleted: false,
            status: 'active',
            provider_services: { some: { service_id: service.id } },
          },
          select: {
            id: true,
            business_name: true,
            user: { select: { first_name: true, last_name: true } },
            location: true,
            city: true,
            zipcode: true,
            rating: true,
            total_jobs: true,
            experience: true,
            min_price: true,
            max_price: true,
          },
          orderBy: { rating: 'desc' },
          take: 10,
        });
      }

      // Format top 3 providers
      const top3 = finalProviders.slice(0, 3).map((p) => ({
        id: p.id,
        businessName: p.business_name,
        ownerName: `${p.user?.first_name} ${p.user?.last_name}`,
        location: p.location || p.city,
        rating: Number(p.rating),
        totalJobs: p.total_jobs,
        experience: p.experience,
        minPrice: p.min_price ? Number(p.min_price) : null,
        maxPrice: p.max_price ? Number(p.max_price) : null,
      }));

      this.logger.log(`[Provider Search] Found ${top3.length} providers for ${dto.service}`);
      top3.forEach((p, i) => {
        this.logger.log(`  ${i + 1}. ${p.businessName || p.ownerName} - ${p.rating}/5`);
      });

      return {
        providers: top3,
        count: top3.length,
        service: dto.service,
        location: dto.zipcode,
      };
    } catch (error) {
      this.logger.error(`[Provider Search] Error: ${(error as Error).message}`);
      return { providers: [], count: 0, service: dto.service, location: dto.zipcode };
    }
  }

  /**
   * Get session by ID (for internal use)
   */
  async getSessionById(sessionId: string, userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const session = await this.prisma.ai_chat_sessions.findFirst({
      where: {
        session_id: sessionId,
        user_id: customer.id, // Use customer.id (customers.id), not users.id
      },
    });

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    return session;
  }
}

