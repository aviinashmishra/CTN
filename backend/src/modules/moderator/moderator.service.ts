import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moderator } from '../../entities/moderator.entity';
import { User, UserRole } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';

export interface ModeratorAssignment {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
  };
  collegeId: string;
  college: {
    id: string;
    name: string;
    emailDomain: string;
  };
  assignedBy: string;
  assignedAt: Date;
}

@Injectable()
export class ModeratorService {
  constructor(
    @InjectRepository(Moderator)
    private moderatorRepository: Repository<Moderator>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
  ) {}

  /**
   * Assign moderator role to a user for a specific college
   * Only admins can assign moderator roles
   */
  async assignModerator(
    adminUserId: string,
    targetUserId: string,
    collegeId: string,
  ): Promise<ModeratorAssignment> {
    // Verify admin user
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can assign moderator roles');
    }

    // Verify target user exists and is a college user
    const targetUser = await this.userRepository.findOne({ 
      where: { id: targetUserId },
      relations: ['college']
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role !== UserRole.COLLEGE_USER) {
      throw new ForbiddenException('Only college users can be assigned as moderators');
    }

    // Verify college exists
    const college = await this.collegeRepository.findOne({ where: { id: collegeId } });
    if (!college) {
      throw new NotFoundException('College not found');
    }

    // Check if user is already a moderator for this college
    const existingModerator = await this.moderatorRepository.findOne({
      where: { userId: targetUserId, collegeId }
    });
    if (existingModerator) {
      throw new ConflictException('User is already a moderator for this college');
    }

    // Create moderator assignment
    const moderator = this.moderatorRepository.create({
      userId: targetUserId,
      collegeId,
      assignedBy: adminUserId,
    });

    const savedModerator = await this.moderatorRepository.save(moderator);

    // Update user role to MODERATOR
    await this.userRepository.update(targetUserId, { role: UserRole.MODERATOR });

    // Return formatted assignment
    return {
      id: savedModerator.id,
      userId: targetUser.id,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        email: targetUser.email,
      },
      collegeId: college.id,
      college: {
        id: college.id,
        name: college.name,
        emailDomain: college.emailDomain,
      },
      assignedBy: adminUserId,
      assignedAt: savedModerator.assignedAt,
    };
  }

  /**
   * Remove moderator role from a user
   * Only admins can remove moderator roles
   */
  async removeModerator(
    adminUserId: string,
    targetUserId: string,
    collegeId: string,
  ): Promise<void> {
    // Verify admin user
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can remove moderator roles');
    }

    // Find moderator assignment
    const moderator = await this.moderatorRepository.findOne({
      where: { userId: targetUserId, collegeId }
    });
    if (!moderator) {
      throw new NotFoundException('Moderator assignment not found');
    }

    // Remove moderator assignment
    await this.moderatorRepository.remove(moderator);

    // Check if user has other moderator assignments
    const otherAssignments = await this.moderatorRepository.count({
      where: { userId: targetUserId }
    });

    // If no other assignments, revert user role to COLLEGE_USER
    if (otherAssignments === 0) {
      await this.userRepository.update(targetUserId, { role: UserRole.COLLEGE_USER });
    }
  }

  /**
   * Get all moderators for a specific college
   */
  async getCollegeModerators(collegeId: string): Promise<ModeratorAssignment[]> {
    const moderators = await this.moderatorRepository.find({
      where: { collegeId },
      relations: ['user', 'college'],
      order: { assignedAt: 'DESC' }
    });

    return moderators.map(moderator => ({
      id: moderator.id,
      userId: moderator.user.id,
      user: {
        id: moderator.user.id,
        username: moderator.user.username,
        displayName: moderator.user.displayName,
        email: moderator.user.email,
      },
      collegeId: moderator.college.id,
      college: {
        id: moderator.college.id,
        name: moderator.college.name,
        emailDomain: moderator.college.emailDomain,
      },
      assignedBy: moderator.assignedBy,
      assignedAt: moderator.assignedAt,
    }));
  }

  /**
   * Get all colleges a user is a moderator for
   */
  async getUserModeratorAssignments(userId: string): Promise<ModeratorAssignment[]> {
    const moderators = await this.moderatorRepository.find({
      where: { userId },
      relations: ['user', 'college'],
      order: { assignedAt: 'DESC' }
    });

    return moderators.map(moderator => ({
      id: moderator.id,
      userId: moderator.user.id,
      user: {
        id: moderator.user.id,
        username: moderator.user.username,
        displayName: moderator.user.displayName,
        email: moderator.user.email,
      },
      collegeId: moderator.college.id,
      college: {
        id: moderator.college.id,
        name: moderator.college.name,
        emailDomain: moderator.college.emailDomain,
      },
      assignedBy: moderator.assignedBy,
      assignedAt: moderator.assignedAt,
    }));
  }

  /**
   * Check if a user is a moderator for a specific college
   */
  async isModeratorForCollege(userId: string, collegeId: string): Promise<boolean> {
    const moderator = await this.moderatorRepository.findOne({
      where: { userId, collegeId }
    });
    return !!moderator;
  }

  /**
   * Get all moderator assignments (admin only)
   */
  async getAllModerators(adminUserId: string): Promise<ModeratorAssignment[]> {
    // Verify admin user
    const adminUser = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view all moderators');
    }

    const moderators = await this.moderatorRepository.find({
      relations: ['user', 'college'],
      order: { assignedAt: 'DESC' }
    });

    return moderators.map(moderator => ({
      id: moderator.id,
      userId: moderator.user.id,
      user: {
        id: moderator.user.id,
        username: moderator.user.username,
        displayName: moderator.user.displayName,
        email: moderator.user.email,
      },
      collegeId: moderator.college.id,
      college: {
        id: moderator.college.id,
        name: moderator.college.name,
        emailDomain: moderator.college.emailDomain,
      },
      assignedBy: moderator.assignedBy,
      assignedAt: moderator.assignedAt,
    }));
  }
}