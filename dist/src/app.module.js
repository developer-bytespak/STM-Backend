"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const job_timeout_service_1 = require("./modules/shared/services/job-timeout.service");
const oauth_module_1 = require("./modules/oauth/oauth.module");
const users_module_1 = require("./modules/users/users.module");
const customers_module_1 = require("./modules/customers/customers.module");
const providers_module_1 = require("./modules/providers/providers.module");
const lsm_module_1 = require("./modules/lsm/lsm.module");
const provider_onboarding_module_1 = require("./modules/provider-onboarding/provider-onboarding.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const chat_module_1 = require("./modules/chat/chat.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const search_matching_module_1 = require("./modules/services/search-matching.module");
const payment_module_1 = require("./modules/payments/payment.module");
const ratings_feedback_module_1 = require("./modules/ratings/ratings-feedback.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const office_real_estate_module_1 = require("./modules/office-spaces/office-real-estate.module");
const admin_module_1 = require("./modules/admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            oauth_module_1.OAuthModule,
            users_module_1.UsersModule,
            customers_module_1.CustomersModule,
            providers_module_1.ProvidersModule,
            lsm_module_1.LsmModule,
            provider_onboarding_module_1.ProviderOnboardingModule,
            jobs_module_1.JobsModule,
            chat_module_1.ChatModule,
            notifications_module_1.NotificationsModule,
            search_matching_module_1.ServicesModule,
            payment_module_1.PaymentsModule,
            ratings_feedback_module_1.RatingsModule,
            analytics_module_1.AnalyticsModule,
            office_real_estate_module_1.OfficeSpacesModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, prisma_service_1.PrismaService, common_1.Logger, job_timeout_service_1.JobTimeoutService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map