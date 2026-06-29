import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLineItemEntity } from './entities/invoice-line-item.entity';
import { SubscriptionEntity } from './entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity, InvoiceLineItemEntity, SubscriptionEntity]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
