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
const prisma_service_1 = require("../prisma/prisma.service");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const oauth_module_1 = require("./modules/oauth/oauth.module");
const user_management_module_1 = require("./modules/user-management/user-management.module");
const provider_onboarding_module_1 = require("./modules/provider-onboarding/provider-onboarding.module");
const job_management_module_1 = require("./modules/job-management/job-management.module");
const communication_module_1 = require("./modules/communication/communication.module");
const search_matching_module_1 = require("./modules/search-matching/search-matching.module");
const payment_module_1 = require("./modules/payment/payment.module");
const ratings_feedback_module_1 = require("./modules/ratings-feedback/ratings-feedback.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const office_real_estate_module_1 = require("./modules/office-real-estate/office-real-estate.module");
const admin_dashboard_module_1 = require("./modules/admin-dashboard/admin-dashboard.module");
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
            oauth_module_1.OAuthModule,
            user_management_module_1.UserManagementModule,
            provider_onboarding_module_1.ProviderOnboardingModule,
            job_management_module_1.JobManagementModule,
            communication_module_1.CommunicationModule,
            search_matching_module_1.SearchMatchingModule,
            payment_module_1.PaymentModule,
            ratings_feedback_module_1.RatingsFeedbackModule,
            analytics_module_1.AnalyticsModule,
            office_real_estate_module_1.OfficeRealEstateModule,
            admin_dashboard_module_1.AdminDashboardModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map