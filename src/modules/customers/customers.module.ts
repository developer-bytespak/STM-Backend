import { Module, forwardRef } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../shared/services/email.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [CustomersController],
  providers: [CustomersService, EmailService],
  exports: [CustomersService],
})
export class CustomersModule {}

