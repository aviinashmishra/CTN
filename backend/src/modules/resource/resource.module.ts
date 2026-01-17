import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { Resource } from '../../entities/resource.entity';
import { ResourceAccess } from '../../entities/resource-access.entity';
import { User } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';
import { PaymentSession } from '../../entities/payment-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource, ResourceAccess, User, College, PaymentSession]),
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}