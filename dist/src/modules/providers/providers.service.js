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
exports.ProvidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const update_job_status_dto_1 = require("./dto/update-job-status.dto");
let ProvidersService = class ProvidersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requestNewService(userId, dto) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
            include: {
                local_service_manager: true,
            },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const existingService = await this.prisma.services.findFirst({
            where: {
                name: { equals: dto.serviceName, mode: 'insensitive' },
                category: { equals: dto.category, mode: 'insensitive' },
            },
        });
        if (existingService) {
            throw new common_1.ConflictException('This service already exists. You can add it to your profile instead.');
        }
        const existingRequest = await this.prisma.service_requests.findFirst({
            where: {
                provider_id: provider.id,
                service_name: { equals: dto.serviceName, mode: 'insensitive' },
                final_status: 'pending',
            },
        });
        if (existingRequest) {
            throw new common_1.ConflictException('You already have a pending request for this service');
        }
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
    async getMyServiceRequests(userId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
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
    async addService(userId, dto) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const service = await this.prisma.services.findUnique({
            where: { id: dto.serviceId },
        });
        if (!service) {
            throw new common_1.NotFoundException('Service not found');
        }
        if (service.status !== 'approved') {
            throw new common_1.BadRequestException('Service is not approved');
        }
        const existingLink = await this.prisma.provider_services.findFirst({
            where: {
                provider_id: provider.id,
                service_id: dto.serviceId,
            },
        });
        if (existingLink) {
            throw new common_1.ConflictException('You already offer this service');
        }
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
    async getDashboard(userId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const [jobStats, earnings, recentFeedback, recentJobs] = await Promise.all([
            this.prisma.jobs.groupBy({
                by: ['status'],
                where: { provider_id: provider.id },
                _count: true,
            }),
            this.prisma.payments.aggregate({
                where: {
                    job: { provider_id: provider.id },
                    status: 'received',
                },
                _sum: { amount: true },
            }),
            this.prisma.ratings_feedback.findMany({
                where: { provider_id: provider.id },
                include: {
                    customer: {
                        select: {
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 5,
            }),
            this.prisma.jobs.findMany({
                where: { provider_id: provider.id },
                include: {
                    service: {
                        select: {
                            name: true,
                        },
                    },
                    customer: {
                        select: {
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 5,
            }),
        ]);
        const jobCounts = {
            new: 0,
            in_progress: 0,
            completed: 0,
            paid: 0,
            cancelled: 0,
            rejected_by_sp: 0,
        };
        jobStats.forEach((stat) => {
            jobCounts[stat.status] = stat._count;
        });
        const totalJobs = Object.values(jobCounts).reduce((sum, count) => sum + count, 0);
        const totalEarnings = earnings._sum.amount ? Number(earnings._sum.amount) : 0;
        const averageRating = recentFeedback.length > 0
            ? recentFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) /
                recentFeedback.length
            : Number(provider.rating);
        return {
            summary: {
                totalJobs,
                totalEarnings,
                averageRating: Number(averageRating.toFixed(2)),
                warnings: provider.warnings,
            },
            jobs: jobCounts,
            pendingActions: {
                newJobRequests: jobCounts.new,
                jobsToComplete: jobCounts.in_progress,
                paymentsToMark: jobCounts.completed,
            },
            recentJobs: recentJobs.map((job) => ({
                id: job.id,
                service: job.service.name,
                customer: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
                status: job.status,
                price: Number(job.price),
                createdAt: job.created_at,
            })),
            recentFeedback: recentFeedback.map((feedback) => ({
                id: feedback.id,
                rating: feedback.rating,
                feedback: feedback.feedback,
                customer: `${feedback.customer.user.first_name} ${feedback.customer.user.last_name}`,
                createdAt: feedback.created_at,
            })),
        };
    }
    async getProfile(userId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true,
                    },
                },
                provider_services: {
                    where: { is_active: true },
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                            },
                        },
                    },
                },
                service_areas: {
                    orderBy: { is_primary: 'desc' },
                },
                documents: {
                    select: {
                        id: true,
                        file_name: true,
                        status: true,
                        verified_at: true,
                        created_at: true,
                    },
                },
                jobs: {
                    where: {
                        status: { in: ['new', 'in_progress'] },
                    },
                    select: {
                        id: true,
                        service: {
                            select: {
                                name: true,
                            },
                        },
                        status: true,
                    },
                },
            },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const totalDocs = provider.documents.length;
        const verifiedDocs = provider.documents.filter((d) => d.status === 'verified').length;
        const pendingDocs = provider.documents.filter((d) => d.status === 'pending').length;
        const canDeactivate = provider.jobs.length === 0;
        return {
            user: {
                name: `${provider.user.first_name} ${provider.user.last_name}`,
                email: provider.user.email,
                phone: provider.user.phone_number,
            },
            business: {
                businessName: provider.business_name,
                description: provider.description,
                location: provider.location,
                zipcode: provider.zipcode,
                minPrice: provider.min_price ? Number(provider.min_price) : null,
                maxPrice: provider.max_price ? Number(provider.max_price) : null,
                experience: provider.experience,
                experienceLevel: provider.experience_level,
            },
            status: {
                current: provider.status,
                canDeactivate,
                activeJobsCount: provider.jobs.length,
                warnings: provider.warnings,
            },
            services: provider.provider_services.map((ps) => ({
                id: ps.service.id,
                name: ps.service.name,
                category: ps.service.category,
            })),
            serviceAreas: provider.service_areas.map((area) => ({
                zipcode: area.zipcode,
                isPrimary: area.is_primary,
            })),
            documents: {
                total: totalDocs,
                verified: verifiedDocs,
                pending: pendingDocs,
                list: provider.documents.map((doc) => ({
                    id: doc.id,
                    fileName: doc.file_name,
                    status: doc.status,
                    verifiedAt: doc.verified_at,
                    uploadedAt: doc.created_at,
                })),
            },
            statistics: {
                totalJobs: provider.total_jobs,
                earnings: Number(provider.earning),
                rating: Number(provider.rating),
            },
        };
    }
    async updateProfile(userId, dto) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        return await this.prisma.$transaction(async (tx) => {
            const updateData = {};
            if (dto.businessName !== undefined)
                updateData.business_name = dto.businessName;
            if (dto.description !== undefined)
                updateData.description = dto.description;
            if (dto.location !== undefined)
                updateData.location = dto.location;
            if (dto.minPrice !== undefined)
                updateData.min_price = dto.minPrice;
            if (dto.maxPrice !== undefined)
                updateData.maxPrice = dto.maxPrice;
            if (dto.experience !== undefined)
                updateData.experience = dto.experience;
            if (Object.keys(updateData).length > 0) {
                await tx.service_providers.update({
                    where: { id: provider.id },
                    data: updateData,
                });
            }
            if (dto.serviceAreas && dto.serviceAreas.length > 0) {
                await tx.provider_service_areas.deleteMany({
                    where: { provider_id: provider.id },
                });
                await tx.provider_service_areas.createMany({
                    data: dto.serviceAreas.map((zipcode, index) => ({
                        provider_id: provider.id,
                        zipcode,
                        is_primary: index === 0,
                    })),
                });
            }
            return {
                message: 'Profile updated successfully',
            };
        });
    }
    async setAvailability(userId, dto) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
            include: {
                jobs: {
                    where: {
                        status: { in: ['new', 'in_progress'] },
                    },
                    select: {
                        id: true,
                        service: {
                            select: {
                                name: true,
                            },
                        },
                        status: true,
                    },
                },
            },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        if (dto.status === provider.status) {
            throw new common_1.BadRequestException(`You are already ${dto.status}`);
        }
        if (dto.status === 'inactive' && provider.jobs.length > 0) {
            const jobList = provider.jobs
                .map((j) => `#${j.id} (${j.service.name} - ${j.status})`)
                .join(', ');
            throw new common_1.BadRequestException(`You have ${provider.jobs.length} active job(s): ${jobList}. Please complete them before deactivating your account.`);
        }
        await this.prisma.service_providers.update({
            where: { id: provider.id },
            data: { status: dto.status },
        });
        return {
            status: dto.status,
            message: `Account set to ${dto.status} successfully`,
        };
    }
    async getJobDetails(userId, jobId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const job = await this.prisma.jobs.findUnique({
            where: { id: jobId },
            include: {
                service: {
                    select: {
                        name: true,
                        category: true,
                        questions_json: true,
                    },
                },
                customer: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                phone_number: true,
                            },
                        },
                    },
                },
                chats: {
                    select: {
                        id: true,
                    },
                },
                payment: true,
            },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        if (job.provider_id !== provider.id) {
            throw new common_1.ForbiddenException('You can only view your own jobs');
        }
        const canMarkComplete = job.status === 'in_progress';
        const canMarkPayment = job.status === 'completed';
        return {
            job: {
                id: job.id,
                service: job.service.name,
                category: job.service.category,
                status: job.status,
                price: Number(job.price),
                originalAnswers: job.answers_json,
                editedAnswers: job.edited_answers,
                spAccepted: job.sp_accepted,
                pendingApproval: job.pending_approval,
                location: job.location,
                scheduledAt: job.scheduled_at,
                completedAt: job.completed_at,
                paidAt: job.paid_at,
                responseDeadline: job.response_deadline,
                createdAt: job.created_at,
            },
            customer: {
                name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
                phone: job.customer.user.phone_number,
                address: job.customer.address,
            },
            payment: job.payment
                ? {
                    amount: Number(job.payment.amount),
                    method: job.payment.method,
                    status: job.payment.status,
                    markedAt: job.payment.marked_at,
                    notes: job.payment.notes,
                }
                : null,
            chatId: job.chats.length > 0 ? job.chats[0].id : null,
            actions: {
                canMarkComplete,
                canMarkPayment,
            },
        };
    }
    async updateJobStatus(userId, jobId, dto) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const job = await this.prisma.jobs.findUnique({
            where: { id: jobId },
            include: {
                service: true,
                customer: {
                    include: { user: true },
                },
                payment: true,
            },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        if (job.provider_id !== provider.id) {
            throw new common_1.ForbiddenException('You can only update your own jobs');
        }
        if (dto.action === update_job_status_dto_1.JobStatusAction.MARK_COMPLETE) {
            if (job.status !== 'in_progress') {
                throw new common_1.BadRequestException('Only in-progress jobs can be marked as complete');
            }
            return await this.prisma.$transaction(async (tx) => {
                const updatedJob = await tx.jobs.update({
                    where: { id: jobId },
                    data: {
                        status: 'completed',
                        completed_at: new Date(),
                    },
                });
                if (job.payment) {
                    await tx.payments.update({
                        where: { job_id: jobId },
                        data: {
                            amount: job.price,
                            status: 'pending',
                        },
                    });
                }
                await tx.notifications.create({
                    data: {
                        recipient_type: 'customer',
                        recipient_id: job.customer.user_id,
                        type: 'job',
                        title: 'Job Completed',
                        message: `Your ${job.service.name} job has been marked complete. Please make payment.`,
                    },
                });
                return {
                    jobId: updatedJob.id,
                    status: updatedJob.status,
                    completedAt: updatedJob.completed_at,
                    message: 'Job marked as complete successfully',
                };
            });
        }
        else if (dto.action === update_job_status_dto_1.JobStatusAction.MARK_PAYMENT) {
            if (job.status !== 'completed') {
                throw new common_1.BadRequestException('Only completed jobs can have payment marked');
            }
            if (!dto.paymentDetails) {
                throw new common_1.BadRequestException('Payment details are required');
            }
            if (!job.payment) {
                throw new common_1.NotFoundException('Payment record not found for this job');
            }
            return await this.prisma.$transaction(async (tx) => {
                const updatedPayment = await tx.payments.update({
                    where: { job_id: jobId },
                    data: {
                        status: 'received',
                        method: dto.paymentDetails.method,
                        notes: dto.paymentDetails.notes,
                        marked_by: userId,
                        marked_at: new Date(),
                    },
                });
                await tx.jobs.update({
                    where: { id: jobId },
                    data: {
                        status: 'paid',
                        paid_at: new Date(),
                    },
                });
                await tx.service_providers.update({
                    where: { id: provider.id },
                    data: {
                        earning: { increment: job.price },
                        total_jobs: { increment: 1 },
                    },
                });
                await tx.notifications.create({
                    data: {
                        recipient_type: 'customer',
                        recipient_id: job.customer.user_id,
                        type: 'payment',
                        title: 'Payment Confirmed',
                        message: `Payment of $${Number(job.price).toFixed(2)} confirmed for job #${job.id} (${job.service.name}).`,
                    },
                });
                await tx.notifications.create({
                    data: {
                        recipient_type: 'service_provider',
                        recipient_id: provider.user_id,
                        type: 'payment',
                        title: 'Payment Recorded',
                        message: `Payment of $${Number(job.price).toFixed(2)} recorded for job #${job.id}.`,
                    },
                });
                return {
                    jobId: job.id,
                    status: 'paid',
                    paymentAmount: Number(updatedPayment.amount),
                    paymentMethod: updatedPayment.method,
                    markedAt: updatedPayment.marked_at,
                    message: 'Payment marked as received successfully',
                };
            });
        }
        throw new common_1.BadRequestException('Invalid action');
    }
    async getJobs(userId, filters) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Service provider profile not found');
        }
        const { status, fromDate, toDate, page = 1, limit = 20 } = filters;
        const finalLimit = Math.min(limit, 100);
        const where = {
            provider_id: provider.id,
        };
        if (status) {
            const statuses = status.split(',');
            where.status = { in: statuses };
        }
        if (fromDate || toDate) {
            where.created_at = {};
            if (fromDate) {
                where.created_at.gte = new Date(fromDate);
            }
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.created_at.lte = endDate;
            }
        }
        const total = await this.prisma.jobs.count({ where });
        const jobs = await this.prisma.jobs.findMany({
            where,
            include: {
                service: {
                    select: {
                        name: true,
                        category: true,
                    },
                },
                customer: {
                    select: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                phone_number: true,
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        status: true,
                        amount: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * finalLimit,
            take: finalLimit,
        });
        return {
            data: jobs.map((job) => ({
                id: job.id,
                service: job.service.name,
                category: job.service.category,
                customer: {
                    name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
                    phone: job.customer.user.phone_number,
                },
                status: job.status,
                price: Number(job.price),
                paymentStatus: job.payment?.status || 'pending',
                scheduledAt: job.scheduled_at,
                completedAt: job.completed_at,
                createdAt: job.created_at,
            })),
            pagination: {
                total,
                page,
                limit: finalLimit,
                totalPages: Math.ceil(total / finalLimit),
            },
        };
    }
    async getReviews(userId, filters) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Provider profile not found');
        }
        const { minRating, maxRating, page = 1, limit = 20 } = filters;
        const finalLimit = Math.min(limit, 100);
        const where = {
            provider_id: provider.id,
        };
        if (minRating !== undefined || maxRating !== undefined) {
            where.rating = {};
            if (minRating !== undefined) {
                where.rating.gte = minRating;
            }
            if (maxRating !== undefined) {
                where.rating.lte = maxRating;
            }
        }
        const [total, reviews] = await Promise.all([
            this.prisma.ratings_feedback.count({ where }),
            this.prisma.ratings_feedback.findMany({
                where,
                include: {
                    customer: {
                        include: {
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                },
                            },
                        },
                    },
                    job: {
                        select: {
                            id: true,
                            service: {
                                select: {
                                    name: true,
                                    category: true,
                                },
                            },
                            completed_at: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * finalLimit,
                take: finalLimit,
            }),
        ]);
        return {
            data: reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                feedback: review.feedback,
                punctualityRating: review.punctuality_rating,
                responseTime: review.response_time,
                customer: {
                    name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
                },
                job: {
                    id: review.job.id,
                    service: review.job.service.name,
                    category: review.job.service.category,
                    completedAt: review.job.completed_at,
                },
                createdAt: review.created_at,
            })),
            pagination: {
                total,
                page,
                limit: finalLimit,
                totalPages: Math.ceil(total / finalLimit),
            },
        };
    }
    async getReviewStats(userId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
            include: {
                feedbacks: {
                    select: {
                        rating: true,
                        punctuality_rating: true,
                        response_time: true,
                    },
                },
            },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Provider profile not found');
        }
        const totalReviews = provider.feedbacks.length;
        if (totalReviews === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                averagePunctuality: 0,
                averageResponseTime: 0,
                ratingBreakdown: {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0,
                },
                percentages: {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0,
                },
            };
        }
        const totalRating = provider.feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
        const totalPunctuality = provider.feedbacks.reduce((sum, f) => sum + (f.punctuality_rating || 0), 0);
        const totalResponseTime = provider.feedbacks.reduce((sum, f) => sum + (f.response_time || 0), 0);
        const averageRating = totalRating / totalReviews;
        const averagePunctuality = totalPunctuality / totalReviews;
        const averageResponseTime = totalResponseTime / totalReviews;
        const ratingBreakdown = {
            5: provider.feedbacks.filter((f) => f.rating === 5).length,
            4: provider.feedbacks.filter((f) => f.rating === 4).length,
            3: provider.feedbacks.filter((f) => f.rating === 3).length,
            2: provider.feedbacks.filter((f) => f.rating === 2).length,
            1: provider.feedbacks.filter((f) => f.rating === 1).length,
        };
        return {
            totalReviews,
            averageRating: Number(averageRating.toFixed(2)),
            averagePunctuality: Number(averagePunctuality.toFixed(2)),
            averageResponseTime: Math.round(averageResponseTime),
            ratingBreakdown,
            percentages: {
                5: Math.round((ratingBreakdown[5] / totalReviews) * 100),
                4: Math.round((ratingBreakdown[4] / totalReviews) * 100),
                3: Math.round((ratingBreakdown[3] / totalReviews) * 100),
                2: Math.round((ratingBreakdown[2] / totalReviews) * 100),
                1: Math.round((ratingBreakdown[1] / totalReviews) * 100),
            },
        };
    }
    async getReviewById(userId, reviewId) {
        const provider = await this.prisma.service_providers.findUnique({
            where: { user_id: userId },
        });
        if (!provider) {
            throw new common_1.NotFoundException('Provider profile not found');
        }
        const review = await this.prisma.ratings_feedback.findUnique({
            where: { id: reviewId },
            include: {
                customer: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                            },
                        },
                    },
                },
                job: {
                    select: {
                        id: true,
                        service: {
                            select: {
                                name: true,
                                category: true,
                            },
                        },
                        completed_at: true,
                        price: true,
                    },
                },
            },
        });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        if (review.provider_id !== provider.id) {
            throw new common_1.ForbiddenException('You can only view your own reviews');
        }
        return {
            id: review.id,
            rating: review.rating,
            feedback: review.feedback,
            punctualityRating: review.punctuality_rating,
            responseTime: review.response_time,
            customer: {
                name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
            },
            job: {
                id: review.job.id,
                service: review.job.service.name,
                category: review.job.service.category,
                completedAt: review.job.completed_at,
                price: Number(review.job.price),
            },
            createdAt: review.created_at,
        };
    }
};
exports.ProvidersService = ProvidersService;
exports.ProvidersService = ProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProvidersService);
//# sourceMappingURL=providers.service.js.map