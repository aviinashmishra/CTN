import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModeratorController } from './moderator.controller';
import { ModeratorService } from './moderator.service';
import { Moderator } from '../../entities/moderator.entity';
import { User } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Moderator, User, College])],
  controllers: [ModeratorController],
  providers: [ModeratorService],
  exports: [ModeratorService],
})
export class ModeratorModule {}