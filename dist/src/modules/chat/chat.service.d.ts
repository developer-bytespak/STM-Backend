import { PrismaService } from '../../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCustomerChats(customerId: number): Promise<{
        id: string;
        job: {
            id: number;
            service: {
                name: string;
                category: string;
            };
            status: import(".prisma/client").$Enums.JobStatus;
        };
        provider: {
            id: number;
            businessName: string;
            user: {
                first_name: string;
                last_name: string;
                profile_picture: string;
            };
        };
        lastMessage: {
            id: string;
            created_at: Date;
            message: string | null;
            sender_type: import(".prisma/client").$Enums.SenderType;
            sender_id: number;
            message_type: import(".prisma/client").$Enums.MessageType;
            chat_id: string;
        };
        created_at: Date;
    }[]>;
    getProviderChats(userId: number): Promise<{
        id: string;
        job: {
            id: number;
            service: {
                name: string;
                category: string;
            };
            status: import(".prisma/client").$Enums.JobStatus;
        };
        customer: {
            name: string;
            profilePicture: string;
        };
        lastMessage: {
            id: string;
            created_at: Date;
            message: string | null;
            sender_type: import(".prisma/client").$Enums.SenderType;
            sender_id: number;
            message_type: import(".prisma/client").$Enums.MessageType;
            chat_id: string;
        };
        created_at: Date;
    }[]>;
    getChatMessages(userId: number, chatId: string, userRole: string): Promise<{
        chatId: string;
        messages: {
            id: string;
            sender_type: import(".prisma/client").$Enums.SenderType;
            sender_id: number;
            message: string;
            message_type: import(".prisma/client").$Enums.MessageType;
            created_at: Date;
        }[];
    }>;
    sendMessage(userId: number, chatId: string, dto: SendMessageDto, userRole: string): Promise<{
        id: string;
        sender_type: import(".prisma/client").$Enums.SenderType;
        message: string;
        message_type: import(".prisma/client").$Enums.MessageType;
        created_at: Date;
    }>;
}
