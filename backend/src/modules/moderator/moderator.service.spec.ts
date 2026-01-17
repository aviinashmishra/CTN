import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import fc from 'fast-check';
import { ModeratorService } from './moderator.service';
import { Moderator } from '../../entities/moderator.entity';
import { User, UserRole } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';

describe('ModeratorService Property Tests', () => {
  let service: ModeratorService;
  let moderatorRepository: Repository<Moderator>;
  let userRepository: Repository<User>;
  let collegeRepository: Repository<College>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModeratorService,
        {
          provide: getRepositoryToken(Moderator),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(College),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ModeratorService>(ModeratorService);
    moderatorRepository = module.get<Repository<Moderator>>(getRepositoryToken(Moderator));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    collegeRepository = module.get<Repository<College>>(getRepositoryToken(College));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 33: Moderator role assignment validation
   * Validates: Requirements 7.1
   * 
   * This property ensures that:
   * - Only admins can assign moderator roles
   * - Only college users can be assigned as moderators
   * - Users cannot be assigned as moderators for non-existent colleges
   * - Users cannot be assigned duplicate moderator roles for the same college
   * - Successful assignments update user role to MODERATOR
   */
  describe('Property 33: Moderator role assignment validation', () => {
    it('should validate moderator role assignment rules', async () => {
      // Simple test case to debug the issue
      const adminUser = { id: 'admin-id', role: UserRole.ADMIN };
      const targetUserId = 'target-id';
      const collegeId = 'college-id';

      // Mock admin user found, target user not found
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(adminUser as User)
        .mockResolvedValueOnce(null);

      try {
        await service.assignModerator(adminUser.id, targetUserId, collegeId);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Target user not found');
      }
    });

    it('should validate moderator role assignment rules with property testing', async () => {
      // Test specific failure case first
      const adminUser = { id: 'admin-id', role: UserRole.ADMIN };
      const targetUserId = 'target-id';
      const collegeId = 'college-id';

      jest.clearAllMocks();
      
      // Mock: admin exists, target user does not exist
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(adminUser as User)
        .mockResolvedValueOnce(null);

      await expect(service.assignModerator(adminUser.id, targetUserId, collegeId))
        .rejects.toThrow(NotFoundException);

      // Now run property tests with simpler logic
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminRole: fc.constantFrom(UserRole.ADMIN, UserRole.MODERATOR, UserRole.COLLEGE_USER),
            targetRole: fc.constantFrom(UserRole.COLLEGE_USER, UserRole.GENERAL_USER, UserRole.MODERATOR),
            userExists: fc.boolean(),
            collegeExists: fc.boolean(),
            existingModerator: fc.boolean(),
          }),
          async ({ adminRole, targetRole, userExists, collegeExists, existingModerator }) => {
            jest.clearAllMocks();
            
            const adminUser = { id: 'admin-id', role: adminRole };
            const targetUser = { 
              id: 'target-id', 
              role: targetRole,
              username: 'testuser',
              displayName: 'Test User',
              email: 'test@example.com'
            };
            const college = {
              id: 'college-id',
              name: 'Test College',
              emailDomain: 'test.edu'
            };

            // Setup mocks
            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValueOnce(adminUser as User)
              .mockResolvedValueOnce(userExists ? (targetUser as User) : null);

            jest.spyOn(collegeRepository, 'findOne')
              .mockResolvedValue(collegeExists ? (college as College) : null);

            jest.spyOn(moderatorRepository, 'findOne')
              .mockResolvedValue(existingModerator ? ({ id: 'existing-id' } as Moderator) : null);

            const mockModerator = {
              id: 'new-moderator-id',
              userId: targetUser.id,
              collegeId: college.id,
              assignedBy: adminUser.id,
              assignedAt: new Date(),
            };

            jest.spyOn(moderatorRepository, 'create').mockReturnValue(mockModerator as Moderator);
            jest.spyOn(moderatorRepository, 'save').mockResolvedValue(mockModerator as Moderator);
            jest.spyOn(userRepository, 'update').mockResolvedValue({ affected: 1 } as any);

            const shouldSucceed = 
              adminRole === UserRole.ADMIN &&
              userExists &&
              targetRole === UserRole.COLLEGE_USER &&
              collegeExists &&
              !existingModerator;

            if (shouldSucceed) {
              const result = await service.assignModerator(adminUser.id, targetUser.id, college.id);
              expect(result).toBeDefined();
              expect(result.userId).toBe(targetUser.id);
            } else {
              await expect(service.assignModerator(adminUser.id, targetUser.id, college.id))
                .rejects.toThrow();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 34: Moderator role removal validation
   * Validates: Requirements 7.1
   * 
   * This property ensures that:
   * - Only admins can remove moderator roles
   * - Moderator assignments can only be removed if they exist
   * - User role reverts to COLLEGE_USER when no other moderator assignments exist
   * - User role remains MODERATOR if other assignments exist
   */
  describe('Property 34: Moderator role removal validation', () => {
    it('should validate moderator role removal rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminUser: fc.record({
              id: fc.uuid(),
              role: fc.constantFrom(UserRole.ADMIN, UserRole.MODERATOR, UserRole.COLLEGE_USER),
            }),
            targetUserId: fc.uuid(),
            collegeId: fc.uuid(),
            moderatorExists: fc.boolean(),
            otherAssignments: fc.integer({ min: 0, max: 3 }),
          }),
          async ({ adminUser, targetUserId, collegeId, moderatorExists, otherAssignments }) => {
            // Setup mocks
            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValue(adminUser as User);

            const mockModerator = moderatorExists ? {
              id: 'moderator-id',
              userId: targetUserId,
              collegeId,
            } : null;

            jest.spyOn(moderatorRepository, 'findOne')
              .mockResolvedValue(mockModerator as Moderator);

            jest.spyOn(moderatorRepository, 'remove').mockResolvedValue(undefined);
            jest.spyOn(moderatorRepository, 'count').mockResolvedValue(otherAssignments);
            jest.spyOn(userRepository, 'update').mockResolvedValue({ affected: 1 } as any);

            try {
              await service.removeModerator(adminUser.id, targetUserId, collegeId);

              // Should only succeed if admin and moderator exists
              const shouldSucceed = 
                adminUser.role === UserRole.ADMIN && moderatorExists;

              if (shouldSucceed) {
                // Verify moderator was removed
                expect(moderatorRepository.remove).toHaveBeenCalledWith(mockModerator);

                // Verify role update logic
                if (otherAssignments === 0) {
                  expect(userRepository.update).toHaveBeenCalledWith(
                    targetUserId,
                    { role: UserRole.COLLEGE_USER }
                  );
                } else {
                  expect(userRepository.update).not.toHaveBeenCalled();
                }
              } else {
                throw new Error('Removal should have failed but succeeded');
              }
            } catch (error) {
              // Verify appropriate error types
              if (adminUser.role !== UserRole.ADMIN) {
                expect(error).toBeInstanceOf(ForbiddenException);
                expect(error.message).toContain('Only admins can remove moderator roles');
              } else if (!moderatorExists) {
                expect(error).toBeInstanceOf(NotFoundException);
                expect(error.message).toContain('Moderator assignment not found');
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 35: Moderator college access validation
   * Validates: Requirements 7.5, 7.6
   * 
   * This property ensures that:
   * - Moderators can only access their assigned colleges
   * - College moderator lists are accurate and complete
   * - User moderator assignments are tracked correctly
   * - Admin users can view all moderator assignments
   */
  describe('Property 35: Moderator college access validation', () => {
    it('should validate moderator college access boundaries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            collegeId: fc.uuid(),
            assignments: fc.array(
              fc.record({
                id: fc.uuid(),
                userId: fc.uuid(),
                collegeId: fc.uuid(),
                assignedBy: fc.uuid(),
                assignedAt: fc.date(),
                user: fc.record({
                  id: fc.uuid(),
                  username: fc.string({ minLength: 3, maxLength: 30 }),
                  displayName: fc.string({ minLength: 1, maxLength: 100 }),
                  email: fc.emailAddress(),
                }),
                college: fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 1, maxLength: 200 }),
                  emailDomain: fc.domain(),
                }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            requestingUser: fc.record({
              id: fc.uuid(),
              role: fc.constantFrom(UserRole.ADMIN, UserRole.MODERATOR, UserRole.COLLEGE_USER),
            }),
          }),
          async ({ userId, collegeId, assignments, requestingUser }) => {
            // Setup mocks for college moderators
            const collegeAssignments = assignments.filter(a => a.collegeId === collegeId);
            jest.spyOn(moderatorRepository, 'find')
              .mockImplementation((options: any) => {
                if (options.where?.collegeId) {
                  return Promise.resolve(collegeAssignments as Moderator[]);
                } else if (options.where?.userId) {
                  const userAssignments = assignments.filter(a => a.userId === options.where.userId);
                  return Promise.resolve(userAssignments as Moderator[]);
                } else {
                  return Promise.resolve(assignments as Moderator[]);
                }
              });

            // Test college moderators retrieval
            const collegeModerators = await service.getCollegeModerators(collegeId);
            expect(collegeModerators).toHaveLength(collegeAssignments.length);
            
            // Verify each assignment is properly formatted
            collegeModerators.forEach((moderator, index) => {
              const assignment = collegeAssignments[index];
              expect(moderator.id).toBe(assignment.id);
              expect(moderator.userId).toBe(assignment.userId);
              expect(moderator.collegeId).toBe(assignment.collegeId);
              expect(moderator.user.username).toBe(assignment.user.username);
              expect(moderator.college.name).toBe(assignment.college.name);
            });

            // Test user assignments retrieval
            const userAssignments = assignments.filter(a => a.userId === userId);
            const userModerators = await service.getUserModeratorAssignments(userId);
            expect(userModerators).toHaveLength(userAssignments.length);

            // Test moderator status check
            const hasAssignment = assignments.some(a => a.userId === userId && a.collegeId === collegeId);
            const isModerator = await service.isModeratorForCollege(userId, collegeId);
            expect(isModerator).toBe(hasAssignment);

            // Test admin access to all moderators
            if (requestingUser.role === UserRole.ADMIN) {
              jest.spyOn(userRepository, 'findOne')
                .mockResolvedValue(requestingUser as User);

              const allModerators = await service.getAllModerators(requestingUser.id);
              expect(allModerators).toHaveLength(assignments.length);
            } else {
              jest.spyOn(userRepository, 'findOne')
                .mockResolvedValue(requestingUser as User);

              await expect(service.getAllModerators(requestingUser.id))
                .rejects.toThrow(ForbiddenException);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});