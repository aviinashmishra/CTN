import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { ModeratorService, ModeratorAssignment } from './moderator.service';
import { AssignModeratorDto } from './dto/assign-moderator.dto';

@Controller('moderators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModeratorController {
  constructor(private readonly moderatorService: ModeratorService) {}

  /**
   * Assign moderator role to a user (Admin only)
   */
  @Post('assign')
  @Roles(UserRole.ADMIN)
  async assignModerator(
    @Body() assignModeratorDto: AssignModeratorDto,
    @Request() req: any,
  ): Promise<ModeratorAssignment> {
    return this.moderatorService.assignModerator(
      req.user.id,
      assignModeratorDto.userId,
      assignModeratorDto.collegeId,
    );
  }

  /**
   * Remove moderator role from a user (Admin only)
   */
  @Delete(':userId/college/:collegeId')
  @Roles(UserRole.ADMIN)
  async removeModerator(
    @Param('userId') userId: string,
    @Param('collegeId') collegeId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.moderatorService.removeModerator(req.user.id, userId, collegeId);
    return { message: 'Moderator role removed successfully' };
  }

  /**
   * Get all moderators for a specific college
   */
  @Get('college/:collegeId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getCollegeModerators(
    @Param('collegeId') collegeId: string,
  ): Promise<ModeratorAssignment[]> {
    return this.moderatorService.getCollegeModerators(collegeId);
  }

  /**
   * Get all colleges a user is a moderator for
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async getUserModeratorAssignments(
    @Param('userId') userId: string,
  ): Promise<ModeratorAssignment[]> {
    return this.moderatorService.getUserModeratorAssignments(userId);
  }

  /**
   * Get all moderator assignments (Admin only)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllModerators(@Request() req: any): Promise<ModeratorAssignment[]> {
    return this.moderatorService.getAllModerators(req.user.id);
  }

  /**
   * Check if current user is a moderator for a specific college
   */
  @Get('check/:collegeId')
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async checkModeratorStatus(
    @Param('collegeId') collegeId: string,
    @Request() req: any,
  ): Promise<{ isModerator: boolean }> {
    const isModerator = await this.moderatorService.isModeratorForCollege(
      req.user.id,
      collegeId,
    );
    return { isModerator };
  }
}