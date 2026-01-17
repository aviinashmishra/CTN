import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CollegeService } from './college.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@/entities/user.entity';

@Controller('colleges')
export class CollegeController {
  constructor(private collegeService: CollegeService) {}

  @Get()
  async getAllColleges() {
    return await this.collegeService.getAllColleges();
  }

  @Get(':id')
  async getCollege(@Param('id') id: string) {
    return await this.collegeService.getCollegeById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCollege(
    @Body() body: { name: string; emailDomain: string; logoUrl?: string },
  ) {
    return await this.collegeService.createCollege(
      body.name,
      body.emailDomain,
      body.logoUrl,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteCollege(@Param('id') id: string) {
    await this.collegeService.deleteCollege(id);
    return { message: 'College deleted successfully' };
  }
}
