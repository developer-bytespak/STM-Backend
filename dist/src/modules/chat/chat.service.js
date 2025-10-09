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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ChatService = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCustomerChats(customerId) {
        const customer = await this.prisma.customers.findUnique({
            where: { user_id: customerId },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        const chats = await this.prisma.chat.findMany({
            where: {
                customer_id: customer.id,
                is_active: true,
                is_deleted: false,
            },
            include: {
                job: {
                    include: {
                        service: {
                            select: {
                                name: true,
                                category: true,
                            },
                        },
                    },
                },
                service_provider: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                profile_picture: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return chats.map((chat) => ({
            id: chat.id,
            job: {
                id: chat.job?.id,
                service: chat.job?.service,
                status: chat.job?.status,
            },
            provider: {
                id: chat.service_provider.id,
                businessName: chat.service_provider.business_name,
                user: chat.service_provider.user,
            },
            lastMessage: chat.messages[0] || null,
            created_at: chat.created_at,
        }));
    }
    async getProviderChats(userId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const chats = await this.prisma.chat.findMany({
            where: {
                provider_id: provider.id,
                is_active: true,
                is_deleted: false,
            },
            include: {
                job: {
                    include: {
                        service: {
                            select: {
                                name: true,
                                category: true,
                            },
                        },
                    },
                },
                customer: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                profile_picture: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return chats.map((chat) => ({
            id: chat.id,
            job: {
                id: chat.job?.id,
                service: chat.job?.service,
                status: chat.job?.status,
            },
            customer: {
                name: `${chat.customer.user.first_name} ${chat.customer.user.last_name}`,
                profilePicture: chat.customer.user.profile_picture,
            },
            lastMessage: chat.messages[0] || null,
            created_at: chat.created_at,
        }));
    }
    async getChatMessages(userId, chatId, userRole) {
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                customer: {
                    include: {
                        user: { select: { id: true } },
                    },
                },
                service_provider: {
                    include: {
                        user: { select: { id: true } },
                    },
                },
            },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        const isCustomer = chat.customer.user.id === userId;
        const isProvider = chat.service_provider.user.id === userId;
        if (!isCustomer && !isProvider) {
            throw new common_1.ForbiddenException('You do not have access to this chat');
        }
        const messages = await this.prisma.messages.findMany({
            where: { chat_id: chatId },
            orderBy: { created_at: 'asc' },
        });
        return {
            chatId: chat.id,
            messages: messages.map((msg) => ({
                id: msg.id,
                sender_type: msg.sender_type,
                sender_id: msg.sender_id,
                message: msg.message,
                message_type: msg.message_type,
                created_at: msg.created_at,
            })),
        };
    }
    async sendMessage(userId, chatId, dto, userRole) {
        const chat = await this.prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                customer: {
                    include: {
                        user: { select: { id: true } },
                    },
                },
                service_provider: {
                    include: {
                        user: { select: { id: true } },
                    },
                },
            },
        });
        if (!chat) {
            throw new common_1.NotFoundException('Chat not found');
        }
        if (!chat.is_active) {
            throw new common_1.ForbiddenException('This chat is no longer active');
        }
        const isCustomer = chat.customer.user.id === userId;
        const isProvider = chat.service_provider.user.id === userId;
        if (!isCustomer && !isProvider) {
            throw new common_1.ForbiddenException('You do not have access to this chat');
        }
        let senderType;
        if (userRole === 'customer') {
            senderType = 'customer';
        }
        else if (userRole === 'service_provider') {
            senderType = 'service_provider';
        }
        else {
            throw new common_1.ForbiddenException('Invalid user role for chat');
        }
        const message = await this.prisma.messages.create({
            data: {
                chat_id: chatId,
                sender_type: senderType,
                sender_id: userId,
                message: dto.message,
                message_type: dto.message_type || 'text',
            },
        });
        const recipientId = senderType === 'customer'
            ? chat.service_provider.user.id
            : chat.customer.user.id;
        const recipientType = senderType === 'customer' ? 'service_provider' : 'customer';
        await this.prisma.notifications.create({
            data: {
                recipient_type: recipientType,
                recipient_id: recipientId,
                type: 'message',
                title: 'New Message',
                message: dto.message.substring(0, 100),
            },
        });
        return {
            id: message.id,
            sender_type: message.sender_type,
            message: message.message,
            message_type: message.message_type,
            created_at: message.created_at,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map