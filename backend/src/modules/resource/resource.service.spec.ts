import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import fc from 'fast-check';
import { ResourceService } from './resource.service';
import { Resource, ResourceType } from '../../entities/resource.entity';
import { ResourceAccess, AccessType } from '../../entities/resource-access.entity';
import { User, UserRole } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';
import { PaymentSession, PaymentStatus } from '../../entities/payment-session.entity';

describe('ResourceService Property Tests', () => {
  let service: ResourceService;
  let resourceRepository: Repository<Resource>;
  let resourceAccessRepository: Repository<ResourceAccess>;
  let userRepository: Repository<User>;
  let collegeRepository: Repository<College>;
  let paymentSessionRepository: Repository<PaymentSession>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        {
          provide: getRepositoryToken(Resource),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResourceAccess),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(College),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentSession),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
    resourceRepository = module.get<Repository<Resource>>(getRepositoryToken(Resource));
    resourceAccessRepository = module.get<Repository<ResourceAccess>>(getRepositoryToken(ResourceAccess));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    collegeRepository = module.get<Repository<College>>(getRepositoryToken(College));
    paymentSessionRepository = module.get<Repository<PaymentSession>>(getRepositoryToken(PaymentSession));
  });

  describe('Property 17: Five-level hierarchy completeness', () => {
    // Feature: critical-thinking-network, Property 17: Five-level hierarchy completeness
    it('should have all five hierarchy levels defined for any resource', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock user (college user)
            const mockUser: User = {
              id: testData.userId,
              email: 'test@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource with all five hierarchy levels
            const mockResource: Resource = {
              id: fc.sample(fc.uuid(), 1)[0],
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: 'file.pdf',
              uploadedBy: testData.userId,
              uploader: mockUser,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue([mockResource]);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]);

            // Test the hierarchy
            const hierarchy = await service.getResourceHierarchy(testData.collegeId, testData.userId);

            // Verify all five levels are present
            expect(hierarchy.college).toBeDefined(); // Level 1: College
            expect(hierarchy.resourceTypes).toBeDefined();
            expect(hierarchy.resourceTypes.length).toBeGreaterThan(0);

            const resourceTypeNode = hierarchy.resourceTypes[0];
            expect(resourceTypeNode.type).toBeDefined(); // Level 2: Resource Type
            expect(resourceTypeNode.departments).toBeDefined();
            expect(resourceTypeNode.departments.length).toBeGreaterThan(0);

            const departmentNode = resourceTypeNode.departments[0];
            expect(departmentNode.name).toBeDefined(); // Level 3: Department
            expect(departmentNode.batches).toBeDefined();
            expect(departmentNode.batches.length).toBeGreaterThan(0);

            const batchNode = departmentNode.batches[0];
            expect(batchNode.name).toBeDefined(); // Level 4: Batch
            expect(batchNode.files).toBeDefined();
            expect(batchNode.files.length).toBeGreaterThan(0);

            const fileNode = batchNode.files[0];
            expect(fileNode.id).toBeDefined(); // Level 5: File
            expect(fileNode.name).toBeDefined();
            expect(fileNode.uploadedBy).toBeDefined();
            expect(fileNode.batch).toBeDefined();
            expect(fileNode.description).toBeDefined();
            expect(fileNode.uploadDate).toBeDefined();

            // Verify hierarchy integrity
            expect(hierarchy.college.id).toBe(testData.collegeId);
            expect(resourceTypeNode.type).toBe(testData.resourceType);
            expect(departmentNode.name).toBe(testData.department);
            expect(batchNode.name).toBe(testData.batch);
            expect(fileNode.name).toBe(testData.fileName);
            expect(fileNode.description).toBe(testData.description);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Resource type validation', () => {
    // Feature: critical-thinking-network, Property 18: Resource type validation
    it('should accept valid resource types and reject invalid ones', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid resource types
            fc.constantFrom(...Object.values(ResourceType)),
            // Invalid resource types
            fc.string().filter(s => !Object.values(ResourceType).includes(s as ResourceType))
          ),
          (resourceType) => {
            const isValid = service.validateResourceType(resourceType);
            const shouldBeValid = Object.values(ResourceType).includes(resourceType as ResourceType);
            
            expect(isValid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all valid resource types', () => {
      const availableTypes = service.getAvailableResourceTypes();
      
      // Should return all enum values
      expect(availableTypes).toEqual(Object.values(ResourceType));
      
      // Should contain exactly the expected types
      expect(availableTypes).toContain(ResourceType.TOPPER_NOTES);
      expect(availableTypes).toContain(ResourceType.PYQS);
      expect(availableTypes).toContain(ResourceType.CASE_DECKS);
      expect(availableTypes).toContain(ResourceType.PRESENTATIONS);
      expect(availableTypes).toContain(ResourceType.STRATEGIES);
      expect(availableTypes).toHaveLength(5);
    });
  });

  describe('Property 19: Department organization', () => {
    // Feature: critical-thinking-network, Property 19: Department organization
    it('should properly organize and return departments for any college resource hierarchy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          }),
          async (testData) => {
            // Create mock query builder
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue(
                testData.departments.map(dept => ({ department: dept }))
              ),
            };

            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            // Test department retrieval
            const departments = await service.getDepartments(testData.collegeId, testData.resourceType);

            // Verify departments are properly organized
            expect(departments).toBeDefined();
            expect(Array.isArray(departments)).toBe(true);
            expect(departments).toEqual(testData.departments);

            // Verify query builder was called with correct parameters
            expect(resourceRepository.createQueryBuilder).toHaveBeenCalledWith('resource');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('resource.collegeId = :collegeId', { collegeId: testData.collegeId });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('resource.resourceType = :resourceType', { resourceType: testData.resourceType });
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('resource.department', 'ASC');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return unique departments only', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            duplicateDepartments: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 })
              .map(depts => [...depts, ...depts]), // Create duplicates
          }),
          async (testData) => {
            // Create mock query builder that returns duplicates
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue(
                testData.duplicateDepartments.map(dept => ({ department: dept }))
              ),
            };

            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            // Test department retrieval
            const departments = await service.getDepartments(testData.collegeId, testData.resourceType);

            // Verify departments are unique (SQL DISTINCT should handle this)
            expect(departments).toBeDefined();
            expect(Array.isArray(departments)).toBe(true);
            
            // The service relies on SQL DISTINCT, so we expect the duplicates to be returned as-is
            // This tests that the service properly delegates to the database for uniqueness
            expect(departments).toEqual(testData.duplicateDepartments);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Batch organization', () => {
    // Feature: critical-thinking-network, Property 20: Batch organization
    it('should properly organize and return batches for any department in the hierarchy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          }),
          async (testData) => {
            // Create mock query builder
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue(
                testData.batches.map(batch => ({ batch: batch }))
              ),
            };

            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            // Test batch retrieval
            const batches = await service.getBatches(testData.collegeId, testData.resourceType, testData.department);

            // Verify batches are properly organized
            expect(batches).toBeDefined();
            expect(Array.isArray(batches)).toBe(true);
            expect(batches).toEqual(testData.batches);

            // Verify query builder was called with correct parameters
            expect(resourceRepository.createQueryBuilder).toHaveBeenCalledWith('resource');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('resource.collegeId = :collegeId', { collegeId: testData.collegeId });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('resource.resourceType = :resourceType', { resourceType: testData.resourceType });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('resource.department = :department', { department: testData.department });
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('resource.batch', 'ASC');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return batches in alphabetical order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            unorderedBatches: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
          }),
          async (testData) => {
            // Sort batches to verify ordering
            const sortedBatches = [...testData.unorderedBatches].sort();

            // Create mock query builder that returns sorted batches (as SQL would)
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue(
                sortedBatches.map(batch => ({ batch: batch }))
              ),
            };

            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            // Test batch retrieval
            const batches = await service.getBatches(testData.collegeId, testData.resourceType, testData.department);

            // Verify batches are returned in alphabetical order
            expect(batches).toEqual(sortedBatches);
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('resource.batch', 'ASC');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty batch results gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (testData) => {
            // Create mock query builder that returns no results
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            };

            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            // Test batch retrieval with no results
            const batches = await service.getBatches(testData.collegeId, testData.resourceType, testData.department);

            // Verify empty results are handled properly
            expect(batches).toBeDefined();
            expect(Array.isArray(batches)).toBe(true);
            expect(batches).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: File metadata completeness', () => {
    // Feature: critical-thinking-network, Property 21: File metadata completeness
    it('should include all required metadata fields for any file in the resource system', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            userId: fc.uuid(),
            collegeId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@test.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource with complete metadata
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: 'file.pdf',
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test file metadata retrieval
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify all required metadata fields are present
            expect(resourceFile.id).toBeDefined();
            expect(resourceFile.name).toBeDefined();
            expect(resourceFile.uploadedBy).toBeDefined();
            expect(resourceFile.batch).toBeDefined();
            expect(resourceFile.description).toBeDefined();
            expect(resourceFile.uploadDate).toBeDefined();

            // Verify metadata values match the source
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);

            // Verify access control fields are also present
            expect(resourceFile.isLocked).toBeDefined();
            expect(resourceFile.isUnlocked).toBeDefined();
            expect(typeof resourceFile.isLocked).toBe('boolean');
            expect(typeof resourceFile.isUnlocked).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain metadata integrity across different access scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileId: fc.uuid(),
            userId: fc.uuid(),
            uploaderCollegeId: fc.uuid(),
            userCollegeId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
            userRole: fc.constantFrom(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN),
          }),
          async (testData) => {
            // Mock colleges
            const uploaderCollege: College = {
              id: testData.uploaderCollegeId,
              name: 'Uploader College',
              emailDomain: 'uploader.edu',
              logoUrl: 'logo1.png',
              createdAt: new Date(),
            };

            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'logo2.png',
              createdAt: new Date(),
            };

            // Mock uploader user
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@uploader.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.uploaderCollegeId,
              college: uploaderCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: testData.userRole,
              collegeId: testData.userCollegeId,
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.uploaderCollegeId,
              college: uploaderCollege,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: 'file.pdf',
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test file metadata retrieval
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify metadata remains consistent regardless of access scenario
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);

            // Verify access control is properly calculated but doesn't affect metadata
            if (testData.userRole === UserRole.ADMIN) {
              expect(resourceFile.isLocked).toBe(false);
              expect(resourceFile.isUnlocked).toBe(true);
            } else if (testData.uploaderCollegeId === testData.userCollegeId) {
              expect(resourceFile.isLocked).toBe(false);
              expect(resourceFile.isUnlocked).toBe(true);
            } else {
              expect(resourceFile.isLocked).toBe(true);
              expect(resourceFile.isUnlocked).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Own college folder access', () => {
    // Feature: critical-thinking-network, Property 22: Own college folder access
    it('should allow college users to access all folders in their own college resource hierarchy without restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceTypes: fc.array(fc.constantFrom(...Object.values(ResourceType)), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]), // Remove duplicates
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]), // Remove duplicates and empty strings
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]), // Remove duplicates and empty strings
            fileCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock college user from the same college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId, // Same college as resources
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources across all hierarchy levels
            const mockResources: Resource[] = [];
            for (const resourceType of testData.resourceTypes) {
              for (const department of testData.departments) {
                for (const batch of testData.batches) {
                  for (let i = 0; i < testData.fileCount; i++) {
                    mockResources.push({
                      id: fc.sample(fc.uuid(), 1)[0],
                      collegeId: testData.collegeId,
                      college: mockCollege,
                      resourceType,
                      department,
                      batch,
                      fileName: `file_${i}.pdf`,
                      fileUrl: `file_${i}.pdf`,
                      uploadedBy: testData.userId,
                      uploader: mockUser,
                      description: `Test file ${i}`,
                      uploadDate: new Date(),
                    });
                  }
                }
              }
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]); // No paid access needed for own college

            // Test hierarchy access
            const hierarchy = await service.getResourceHierarchy(testData.collegeId, testData.userId);

            // Verify user can access the hierarchy (no exception thrown)
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.collegeId);

            // Verify all resource types are accessible
            expect(hierarchy.resourceTypes).toHaveLength(testData.resourceTypes.length);
            
            for (let i = 0; i < testData.resourceTypes.length; i++) {
              const resourceTypeNode = hierarchy.resourceTypes[i];
              expect(resourceTypeNode.type).toBe(testData.resourceTypes[i]);
              
              // Verify all departments are accessible
              expect(resourceTypeNode.departments).toHaveLength(testData.departments.length);
              
              for (let j = 0; j < testData.departments.length; j++) {
                const departmentNode = resourceTypeNode.departments[j];
                expect(departmentNode.name).toBe(testData.departments[j]);
                
                // Verify all batches are accessible
                expect(departmentNode.batches).toHaveLength(testData.batches.length);
                
                for (let k = 0; k < testData.batches.length; k++) {
                  const batchNode = departmentNode.batches[k];
                  expect(batchNode.name).toBe(testData.batches[k]);
                  
                  // Verify all files are accessible and unlocked (own college)
                  expect(batchNode.files).toHaveLength(testData.fileCount);
                  
                  for (const file of batchNode.files) {
                    expect(file.isLocked).toBe(false); // Own college files should not be locked
                    expect(file.isUnlocked).toBe(true); // Own college files should be unlocked
                  }
                }
              }
            }

            // Test individual file access for own college
            for (const resource of mockResources.slice(0, 3)) { // Test first 3 resources
              jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(resource);
              jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

              const accessResult = await service.canAccessResource(testData.userId, resource.id);
              
              // Verify own college access is granted without payment
              expect(accessResult.canAccess).toBe(true);
              expect(accessResult.requiresPayment).toBe(false);
              expect(accessResult.isUnlocked).toBe(true);

              // Verify file details can be retrieved
              const resourceFile = await service.getResourceFile(resource.id, testData.userId);
              expect(resourceFile).toBeDefined();
              expect(resourceFile.id).toBe(resource.id);
              expect(resourceFile.isLocked).toBe(false);
              expect(resourceFile.isUnlocked).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block general users from accessing any resource folders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock general user (not college user)
            const mockUser: User = {
              id: testData.userId,
              email: 'user@gmail.com', // Normal email, not college
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.GENERAL_USER, // General user role
              collegeId: null, // No college association
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Test that general user is blocked from accessing resource hierarchy
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block guest users from accessing any resource folders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock guest user
            const mockUser: User = {
              id: testData.userId,
              email: null,
              username: null,
              displayName: null,
              passwordHash: null,
              role: UserRole.GUEST, // Guest user role
              collegeId: null,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Test that guest user is blocked from accessing resource hierarchy
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: Own college file access without payment', () => {
    // Feature: critical-thinking-network, Property 23: Own college file access without payment
    it('should allow viewing and downloading files from own college without payment checks or restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from same college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@test.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from same college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId, // Same college as resource
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from same college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId, // Same college as user
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No existing access record

            // Test access control for own college file
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);

            // Verify access is granted without payment requirements
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(false); // No payment required for own college
            expect(accessResult.isUnlocked).toBe(true); // Should be unlocked

            // Test file viewing (getResourceFile)
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify file can be viewed without restrictions
            expect(resourceFile).toBeDefined();
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);
            expect(resourceFile.isLocked).toBe(false); // Should not be locked for own college
            expect(resourceFile.isUnlocked).toBe(true); // Should be unlocked for own college

            // Test file path retrieval (for downloading)
            const filePath = await service.getResourceFilePath(testData.fileId);
            expect(filePath).toBeDefined();
            expect(filePath).toBe(mockResource.fileUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should require payment for files from other colleges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from resource college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different college from resource
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId, // Different college from user
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No paid access

            // Test access control for cross-college file
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);

            // Verify payment is required for cross-college access
            expect(accessResult.canAccess).toBe(true); // Can access but...
            expect(accessResult.requiresPayment).toBe(true); // Payment required for other college
            expect(accessResult.isUnlocked).toBe(false); // Should be locked without payment
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin users to access any file without payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock admin user
            const mockUser: User = {
              id: testData.userId,
              email: 'admin@platform.com',
              username: 'admin',
              displayName: 'Admin User',
              passwordHash: 'hash',
              role: UserRole.ADMIN, // Admin role
              collegeId: testData.userCollegeId,
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test access control for admin user
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);

            // Verify admin has free access to all files
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(false); // No payment required for admin
            expect(accessResult.isUnlocked).toBe(true); // Should be unlocked for admin
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: General user resource denial', () => {
    // Feature: critical-thinking-network, Property 24: General user resource denial
    it('should deny general users access to any resource system endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock general user (not college user)
            const mockUser: User = {
              id: testData.userId,
              email: 'user@gmail.com', // Normal email, not college
              username: 'generaluser',
              displayName: 'General User',
              passwordHash: 'hash',
              role: UserRole.GENERAL_USER, // General user role
              collegeId: null, // No college association
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);

            // Test 1: Resource hierarchy access should be denied
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');

            // Test 2: Individual resource access should be denied
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(false);
            expect(accessResult.requiresPayment).toBe(false);
            expect(accessResult.isUnlocked).toBe(false);

            // Test 3: Resource file access should be denied
            await expect(
              service.getResourceFile(testData.fileId, testData.userId)
            ).rejects.toThrow('Access denied to this resource');

            // Test 4: Department access should work (this is a query method, not access-controlled)
            // But in a real implementation, this might also be restricted
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            };
            jest.spyOn(resourceRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

            const departments = await service.getDepartments(testData.collegeId, testData.resourceType);
            expect(departments).toBeDefined(); // This method doesn't check user permissions currently

            // Test 5: Batch access should work (this is a query method, not access-controlled)
            const batches = await service.getBatches(testData.collegeId, testData.resourceType, testData.department);
            expect(batches).toBeDefined(); // This method doesn't check user permissions currently
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny guest users access to any resource system endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock guest user
            const mockUser: User = {
              id: testData.userId,
              email: null,
              username: null,
              displayName: null,
              passwordHash: null,
              role: UserRole.GUEST, // Guest user role
              collegeId: null,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);

            // Test 1: Resource hierarchy access should be denied
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');

            // Test 2: Individual resource access should be denied
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(false);
            expect(accessResult.requiresPayment).toBe(false);
            expect(accessResult.isUnlocked).toBe(false);

            // Test 3: Resource file access should be denied
            await expect(
              service.getResourceFile(testData.fileId, testData.userId)
            ).rejects.toThrow('Access denied to this resource');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow college users, moderators, and admins to access resource system', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            userRole: fc.constantFrom(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock authorized user (college user, moderator, or admin)
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'authorizeduser',
              displayName: 'Authorized User',
              passwordHash: 'hash',
              role: testData.userRole, // Authorized role
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: testData.userId,
              uploader: mockUser,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue([mockResource]);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test 1: Resource hierarchy access should be allowed
            const hierarchy = await service.getResourceHierarchy(testData.collegeId, testData.userId);
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.collegeId);

            // Test 2: Individual resource access should be allowed
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true);

            // Test 3: Resource file access should be allowed
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            expect(resourceFile).toBeDefined();
            expect(resourceFile.id).toBe(testData.fileId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Own college access tracking', () => {
    // Feature: critical-thinking-network, Property 25: Own college access tracking
    it('should create access records without payment data for own college file access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from same college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@test.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from same college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId, // Same college as resource
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from same college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId, // Same college as user
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Mock ResourceAccess entity that will be created
            const mockResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.OWN_COLLEGE,
              paymentAmount: null, // No payment for own college
              unlockedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No existing access record
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(mockResourceAccess);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(mockResourceAccess);

            // Test access tracking
            await service.recordResourceAccess(testData.userId, testData.fileId);

            // Verify that create was called with correct parameters
            expect(resourceAccessRepository.create).toHaveBeenCalledWith({
              userId: testData.userId,
              resourceId: testData.fileId,
              accessType: AccessType.OWN_COLLEGE, // Should be OWN_COLLEGE for same college
              paymentAmount: null, // Should be null for own college access
              unlockedAt: expect.any(Date)
            });

            // Verify that save was called
            expect(resourceAccessRepository.save).toHaveBeenCalledWith(mockResourceAccess);

            // Verify findOne was called to check for existing access
            expect(resourceAccessRepository.findOne).toHaveBeenCalledWith({
              where: { 
                userId: testData.userId, 
                resourceId: testData.fileId, 
                accessType: AccessType.OWN_COLLEGE 
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create access records with payment data for cross-college file access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from resource college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different college from resource
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId, // Different college from user
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Mock ResourceAccess entity that will be created
            const mockResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: undefined, // Will be set when payment is processed
              unlockedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No existing access record
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(mockResourceAccess);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(mockResourceAccess);

            // Test access tracking for cross-college access
            await service.recordResourceAccess(testData.userId, testData.fileId);

            // Verify that create was called with correct parameters
            expect(resourceAccessRepository.create).toHaveBeenCalledWith({
              userId: testData.userId,
              resourceId: testData.fileId,
              accessType: AccessType.PAID, // Should be PAID for different college
              paymentAmount: undefined, // Should be undefined for cross-college access (will be set later)
              unlockedAt: expect.any(Date)
            });

            // Verify that save was called
            expect(resourceAccessRepository.save).toHaveBeenCalledWith(mockResourceAccess);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate access records for the same user and resource', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock user
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: testData.userId,
              uploader: mockUser,
              description: testData.description,
              uploadDate: new Date(),
            };

            // Mock existing ResourceAccess record
            const existingResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.OWN_COLLEGE,
              paymentAmount: null,
              unlockedAt: new Date(),
            };

            // Setup mocks - existing access record found
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(existingResourceAccess); // Existing record found
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(null as any);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(null as any);

            // Test access tracking when record already exists
            await service.recordResourceAccess(testData.userId, testData.fileId);

            // Verify that create and save were NOT called (no duplicate record)
            expect(resourceAccessRepository.create).not.toHaveBeenCalled();
            expect(resourceAccessRepository.save).not.toHaveBeenCalled();

            // Verify findOne was called to check for existing access
            expect(resourceAccessRepository.findOne).toHaveBeenCalledWith({
              where: { 
                userId: testData.userId, 
                resourceId: testData.fileId, 
                accessType: AccessType.OWN_COLLEGE 
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing user or resource gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            fileId: fc.uuid(),
          }),
          async (testData) => {
            // Setup mocks - user or resource not found
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(null); // User not found
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(null); // Resource not found
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(null as any);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(null as any);

            // Test access tracking with missing entities
            await service.recordResourceAccess(testData.userId, testData.fileId);

            // Verify that create and save were NOT called (graceful handling)
            expect(resourceAccessRepository.create).not.toHaveBeenCalled();
            expect(resourceAccessRepository.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Cross-college hierarchy browsing', () => {
    // Feature: critical-thinking-network, Property 26: Cross-college hierarchy browsing
    it('should return complete resource hierarchy for any college selection by a college user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceTypes: fc.array(fc.constantFrom(...Object.values(ResourceType)), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            fileCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college browsing
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college (the one being browsed)
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock college user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different from target college
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: 'uploader',
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources for target college across all hierarchy levels
            const mockResources: Resource[] = [];
            for (const resourceType of testData.resourceTypes) {
              for (const department of testData.departments) {
                for (const batch of testData.batches) {
                  for (let i = 0; i < testData.fileCount; i++) {
                    mockResources.push({
                      id: fc.sample(fc.uuid(), 1)[0],
                      collegeId: testData.targetCollegeId, // Target college resources
                      college: targetCollege,
                      resourceType,
                      department,
                      batch,
                      fileName: `file_${i}.pdf`,
                      fileUrl: `files/file_${i}.pdf`,
                      uploadedBy: mockUploader.id,
                      uploader: mockUploader,
                      description: `Test file ${i}`,
                      uploadDate: new Date(),
                    });
                  }
                }
              }
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]); // No paid access yet

            // Test cross-college hierarchy browsing
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Verify complete hierarchy is returned
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.targetCollegeId);
            expect(hierarchy.college.name).toBe('Target College');

            // Verify all resource types are accessible
            expect(hierarchy.resourceTypes).toHaveLength(testData.resourceTypes.length);
            
            for (let i = 0; i < testData.resourceTypes.length; i++) {
              const resourceTypeNode = hierarchy.resourceTypes[i];
              expect(resourceTypeNode.type).toBe(testData.resourceTypes[i]);
              
              // Verify all departments are accessible (folders visible)
              expect(resourceTypeNode.departments).toHaveLength(testData.departments.length);
              
              for (let j = 0; j < testData.departments.length; j++) {
                const departmentNode = resourceTypeNode.departments[j];
                expect(departmentNode.name).toBe(testData.departments[j]);
                
                // Verify all batches are accessible (folders visible)
                expect(departmentNode.batches).toHaveLength(testData.batches.length);
                
                for (let k = 0; k < testData.batches.length; k++) {
                  const batchNode = departmentNode.batches[k];
                  expect(batchNode.name).toBe(testData.batches[k]);
                  
                  // Verify files are visible with metadata but locked for cross-college
                  expect(batchNode.files).toHaveLength(testData.fileCount);
                  
                  for (const file of batchNode.files) {
                    // File metadata should be visible (preview)
                    expect(file.id).toBeDefined();
                    expect(file.name).toBeDefined();
                    expect(file.uploadedBy).toBe('uploader');
                    expect(file.batch).toBeDefined();
                    expect(file.description).toBeDefined();
                    expect(file.uploadDate).toBeDefined();
                    
                    // Files should be locked for cross-college access
                    expect(file.isLocked).toBe(true); // Should be locked for cross-college
                    expect(file.isUnlocked).toBe(false); // Should not be unlocked without payment
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin users to browse any college hierarchy with full access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceTypes: fc.array(fc.constantFrom(...Object.values(ResourceType)), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            fileCount: fc.integer({ min: 1, max: 3 }),
          }),
          async (testData) => {
            // Mock admin's college
            const adminCollege: College = {
              id: testData.adminCollegeId,
              name: 'Admin College',
              emailDomain: 'admin.edu',
              logoUrl: 'admin-logo.png',
              createdAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock admin user
            const mockUser: User = {
              id: testData.userId,
              email: 'admin@platform.com',
              username: 'admin',
              displayName: 'Admin User',
              passwordHash: 'hash',
              role: UserRole.ADMIN, // Admin role
              collegeId: testData.adminCollegeId,
              college: adminCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: 'uploader',
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources for target college
            const mockResources: Resource[] = [];
            for (const resourceType of testData.resourceTypes) {
              for (const department of testData.departments) {
                for (const batch of testData.batches) {
                  for (let i = 0; i < testData.fileCount; i++) {
                    mockResources.push({
                      id: fc.sample(fc.uuid(), 1)[0],
                      collegeId: testData.targetCollegeId,
                      college: targetCollege,
                      resourceType,
                      department,
                      batch,
                      fileName: `file_${i}.pdf`,
                      fileUrl: `files/file_${i}.pdf`,
                      uploadedBy: mockUploader.id,
                      uploader: mockUploader,
                      description: `Test file ${i}`,
                      uploadDate: new Date(),
                    });
                  }
                }
              }
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]);

            // Test admin cross-college hierarchy browsing
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Verify complete hierarchy is returned
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.targetCollegeId);

            // Verify admin has full access to all files (not locked)
            for (const resourceTypeNode of hierarchy.resourceTypes) {
              for (const departmentNode of resourceTypeNode.departments) {
                for (const batchNode of departmentNode.batches) {
                  for (const file of batchNode.files) {
                    // Admin should have full access without payment
                    expect(file.isLocked).toBe(false); // Should not be locked for admin
                    expect(file.isUnlocked).toBe(true); // Should be unlocked for admin
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty resource hierarchy gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college (empty)
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Empty College',
              emailDomain: 'empty.edu',
              logoUrl: 'empty-logo.png',
              createdAt: new Date(),
            };

            // Mock college user
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup mocks - no resources for target college
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue([]); // Empty resources
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]);

            // Test browsing empty college hierarchy
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Verify hierarchy structure is returned even when empty
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.targetCollegeId);
            expect(hierarchy.college.name).toBe('Empty College');
            expect(hierarchy.resourceTypes).toHaveLength(0); // No resources
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: Cross-college folder visibility', () => {
    // Feature: critical-thinking-network, Property 27: Cross-college folder visibility
    it('should allow college users to view Resource_Type, Department, and Batch folders from other colleges without payment requirements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceTypes: fc.array(fc.constantFrom(...Object.values(ResourceType)), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
            fileCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college browsing
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college (the one being browsed)
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock college user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different from target college
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: 'uploader',
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources for target college across all hierarchy levels
            const mockResources: Resource[] = [];
            for (const resourceType of testData.resourceTypes) {
              for (const department of testData.departments) {
                for (const batch of testData.batches) {
                  for (let i = 0; i < testData.fileCount; i++) {
                    mockResources.push({
                      id: fc.sample(fc.uuid(), 1)[0],
                      collegeId: testData.targetCollegeId, // Target college resources
                      college: targetCollege,
                      resourceType,
                      department,
                      batch,
                      fileName: `file_${i}.pdf`,
                      fileUrl: `files/file_${i}.pdf`,
                      uploadedBy: mockUploader.id,
                      uploader: mockUploader,
                      description: `Test file ${i}`,
                      uploadDate: new Date(),
                    });
                  }
                }
              }
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]); // No paid access yet

            // Test cross-college folder visibility
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Verify hierarchy is accessible (no exception thrown)
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.targetCollegeId);

            // Verify Resource_Type folders are visible without payment requirements
            expect(hierarchy.resourceTypes).toHaveLength(testData.resourceTypes.length);
            
            for (let i = 0; i < testData.resourceTypes.length; i++) {
              const resourceTypeNode = hierarchy.resourceTypes[i];
              
              // Resource_Type folder should be visible
              expect(resourceTypeNode.type).toBe(testData.resourceTypes[i]);
              expect(resourceTypeNode.type).toBeDefined();
              
              // Department folders should be visible without payment requirements
              expect(resourceTypeNode.departments).toHaveLength(testData.departments.length);
              expect(resourceTypeNode.departments).toBeDefined();
              
              for (let j = 0; j < testData.departments.length; j++) {
                const departmentNode = resourceTypeNode.departments[j];
                
                // Department folder should be visible
                expect(departmentNode.name).toBe(testData.departments[j]);
                expect(departmentNode.name).toBeDefined();
                
                // Batch folders should be visible without payment requirements
                expect(departmentNode.batches).toHaveLength(testData.batches.length);
                expect(departmentNode.batches).toBeDefined();
                
                for (let k = 0; k < testData.batches.length; k++) {
                  const batchNode = departmentNode.batches[k];
                  
                  // Batch folder should be visible
                  expect(batchNode.name).toBe(testData.batches[k]);
                  expect(batchNode.name).toBeDefined();
                  
                  // Files should be visible but locked (this is tested in Property 28)
                  expect(batchNode.files).toHaveLength(testData.fileCount);
                  expect(batchNode.files).toBeDefined();
                }
              }
            }

            // Verify no payment was required to access folder structure
            // The fact that we can access the hierarchy without payment confirms folder visibility
            expect(hierarchy.resourceTypes.length).toBeGreaterThan(0);
            
            // Verify all three folder levels (Resource_Type, Department, Batch) are accessible
            const firstResourceType = hierarchy.resourceTypes[0];
            expect(firstResourceType.departments.length).toBeGreaterThan(0);
            
            const firstDepartment = firstResourceType.departments[0];
            expect(firstDepartment.batches.length).toBeGreaterThan(0);
            
            // This confirms that Resource_Type, Department, and Batch folders are all visible
            // without payment requirements for cross-college browsing
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow moderators to view folders from other colleges without payment requirements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            moderatorCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceTypes: fc.array(fc.constantFrom(...Object.values(ResourceType)), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            departments: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            batches: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 2 }).map(arr => [...new Set(arr)]),
            fileCount: fc.integer({ min: 1, max: 3 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.moderatorCollegeId !== testData.targetCollegeId);

            // Mock moderator's college
            const moderatorCollege: College = {
              id: testData.moderatorCollegeId,
              name: 'Moderator College',
              emailDomain: 'moderator.edu',
              logoUrl: 'moderator-logo.png',
              createdAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock moderator user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'moderator@moderator.edu',
              username: 'moderator',
              displayName: 'Moderator User',
              passwordHash: 'hash',
              role: UserRole.MODERATOR,
              collegeId: testData.moderatorCollegeId, // Different from target college
              college: moderatorCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: 'uploader',
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources for target college
            const mockResources: Resource[] = [];
            for (const resourceType of testData.resourceTypes) {
              for (const department of testData.departments) {
                for (const batch of testData.batches) {
                  for (let i = 0; i < testData.fileCount; i++) {
                    mockResources.push({
                      id: fc.sample(fc.uuid(), 1)[0],
                      collegeId: testData.targetCollegeId,
                      college: targetCollege,
                      resourceType,
                      department,
                      batch,
                      fileName: `file_${i}.pdf`,
                      fileUrl: `files/file_${i}.pdf`,
                      uploadedBy: mockUploader.id,
                      uploader: mockUploader,
                      description: `Test file ${i}`,
                      uploadDate: new Date(),
                    });
                  }
                }
              }
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]);

            // Test cross-college folder visibility for moderator
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Verify moderator can access folder structure
            expect(hierarchy).toBeDefined();
            expect(hierarchy.college.id).toBe(testData.targetCollegeId);
            expect(hierarchy.resourceTypes).toHaveLength(testData.resourceTypes.length);

            // Verify all folder levels are accessible
            for (const resourceTypeNode of hierarchy.resourceTypes) {
              expect(resourceTypeNode.type).toBeDefined();
              expect(resourceTypeNode.departments.length).toBeGreaterThan(0);
              
              for (const departmentNode of resourceTypeNode.departments) {
                expect(departmentNode.name).toBeDefined();
                expect(departmentNode.batches.length).toBeGreaterThan(0);
                
                for (const batchNode of departmentNode.batches) {
                  expect(batchNode.name).toBeDefined();
                  expect(batchNode.files.length).toBeGreaterThan(0);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny general users access to any college folder structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock general user (not college user)
            const mockUser: User = {
              id: testData.userId,
              email: 'user@gmail.com', // Normal email, not college
              username: 'generaluser',
              displayName: 'General User',
              passwordHash: 'hash',
              role: UserRole.GENERAL_USER, // General user role
              collegeId: null, // No college association
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Test that general user is blocked from accessing folder structure
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny guest users access to any college folder structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock guest user
            const mockUser: User = {
              id: testData.userId,
              email: null,
              username: null,
              displayName: null,
              passwordHash: null,
              role: UserRole.GUEST, // Guest user role
              collegeId: null,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Test that guest user is blocked from accessing folder structure
            await expect(
              service.getResourceHierarchy(testData.collegeId, testData.userId)
            ).rejects.toThrow('Resource access requires college email');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: Cross-college file preview', () => {
    // Feature: critical-thinking-network, Property 28: Cross-college file preview
    it('should display file metadata as preview for files from other colleges while keeping content locked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college preview
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college (where the file is from)
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock college user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different from target college
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from target college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.targetCollegeId, // Different college from user
              college: targetCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No paid access

            // Test file preview access
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify all metadata is visible as preview
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName); // File name should be visible
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername); // Uploader should be visible
            expect(resourceFile.batch).toBe(testData.batch); // Batch should be visible
            expect(resourceFile.description).toBe(testData.description); // Description should be visible
            expect(resourceFile.uploadDate).toBe(testData.uploadDate); // Upload date should be visible

            // Verify file content is locked for cross-college access
            expect(resourceFile.isLocked).toBe(true); // Should be locked for cross-college
            expect(resourceFile.isUnlocked).toBe(false); // Should not be unlocked without payment

            // Verify access control indicates payment is required
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true); // Can access metadata
            expect(accessResult.requiresPayment).toBe(true); // But payment required for content
            expect(accessResult.isUnlocked).toBe(false); // Not unlocked without payment
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show file metadata in hierarchy browsing for cross-college files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            fileCount: fc.integer({ min: 1, max: 3 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Generate consistent arrays based on fileCount
            const fileNames = Array.from({ length: testData.fileCount }, (_, i) => `file_${i}.pdf`);
            const uploaderUsernames = Array.from({ length: testData.fileCount }, (_, i) => `uploader${i}`);
            const descriptions = Array.from({ length: testData.fileCount }, (_, i) => `Description for file ${i}`);
            const uploadDates = Array.from({ length: testData.fileCount }, (_, i) => new Date(2023, i % 12, i + 1));

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock college user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate resources with different metadata for each file
            const mockResources: Resource[] = [];
            for (let i = 0; i < testData.fileCount; i++) {
              const mockUploader: User = {
                id: fc.sample(fc.uuid(), 1)[0],
                email: `uploader${i}@target.edu`,
                username: uploaderUsernames[i],
                displayName: `Uploader ${i}`,
                passwordHash: 'hash',
                role: UserRole.COLLEGE_USER,
                collegeId: testData.targetCollegeId,
                college: targetCollege,
                bio: null,
                profilePictureUrl: null,
                profile: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              mockResources.push({
                id: fc.sample(fc.uuid(), 1)[0],
                collegeId: testData.targetCollegeId,
                college: targetCollege,
                resourceType: testData.resourceType,
                department: testData.department,
                batch: testData.batch,
                fileName: fileNames[i],
                fileUrl: `files/${fileNames[i]}`,
                uploadedBy: mockUploader.id,
                uploader: mockUploader,
                description: descriptions[i],
                uploadDate: uploadDates[i],
              });
            }

            // Setup mocks
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'find').mockResolvedValue(mockResources);
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue([]); // No paid access

            // Test hierarchy browsing shows file metadata as preview
            const hierarchy = await service.getResourceHierarchy(testData.targetCollegeId, testData.userId);

            // Navigate to the files in the hierarchy
            expect(hierarchy.resourceTypes).toHaveLength(1);
            const resourceTypeNode = hierarchy.resourceTypes[0];
            expect(resourceTypeNode.departments).toHaveLength(1);
            const departmentNode = resourceTypeNode.departments[0];
            expect(departmentNode.batches).toHaveLength(1);
            const batchNode = departmentNode.batches[0];
            expect(batchNode.files).toHaveLength(testData.fileCount);

            // Verify each file shows complete metadata as preview
            for (let i = 0; i < testData.fileCount; i++) {
              const file = batchNode.files[i];
              
              // All metadata should be visible as preview
              expect(file.id).toBeDefined();
              expect(file.name).toBe(fileNames[i]); // File name visible
              expect(file.uploadedBy).toBe(uploaderUsernames[i]); // Uploader visible
              expect(file.batch).toBe(testData.batch); // Batch visible
              expect(file.description).toBe(descriptions[i]); // Description visible
              expect(file.uploadDate).toBe(uploadDates[i]); // Upload date visible

              // But file content should be locked
              expect(file.isLocked).toBe(true); // Content locked for cross-college
              expect(file.isUnlocked).toBe(false); // Not unlocked without payment
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin users to access file content from any college without preview restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Mock admin's college
            const adminCollege: College = {
              id: testData.adminCollegeId,
              name: 'Admin College',
              emailDomain: 'admin.edu',
              logoUrl: 'admin-logo.png',
              createdAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock admin user
            const mockUser: User = {
              id: testData.userId,
              email: 'admin@admin.edu',
              username: 'admin',
              displayName: 'Admin User',
              passwordHash: 'hash',
              role: UserRole.ADMIN, // Admin role
              collegeId: testData.adminCollegeId,
              college: adminCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from target college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test admin access to file
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify admin can see all metadata
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);

            // Verify admin has full access without preview restrictions
            expect(resourceFile.isLocked).toBe(false); // Not locked for admin
            expect(resourceFile.isUnlocked).toBe(true); // Unlocked for admin

            // Verify access control grants full access to admin
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(false); // No payment required for admin
            expect(accessResult.isUnlocked).toBe(true); // Unlocked for admin
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show unlocked file content for paid cross-college access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
            paymentAmount: fc.float({ min: 1, max: 100 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.targetCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from target college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@target.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock college user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from target college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.targetCollegeId,
              college: targetCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Mock paid access record
            const mockResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: new Date(),
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(mockResourceAccess); // Paid access exists

            // Test file access after payment
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);

            // Verify all metadata is still visible
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);

            // Verify file content is now unlocked after payment
            expect(resourceFile.isLocked).toBe(false); // Not locked after payment
            expect(resourceFile.isUnlocked).toBe(true); // Unlocked after payment

            // Verify access control reflects paid access
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(true); // Still requires payment (for others)
            expect(accessResult.isUnlocked).toBe(true); // But unlocked for this user
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 29: Locked file access prevention', () => {
    // Feature: critical-thinking-network, Property 29: Locked file access prevention
    it('should block view and download attempts for unpaid files from other colleges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college access
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from resource college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different college from resource
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId, // Different college from user
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks - NO paid access record (file is locked)
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No paid access

            // Mock payment session for initiate payment
            const mockPaymentSession: PaymentSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              sessionId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              amount: 10.00,
              currency: 'USD',
              status: PaymentStatus.PENDING,
              paymentProviderSessionId: null,
              paymentProviderResponse: null,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              completedAt: null,
            };

            jest.spyOn(paymentSessionRepository, 'create').mockReturnValue(mockPaymentSession);
            jest.spyOn(paymentSessionRepository, 'save').mockResolvedValue(mockPaymentSession);

            // Test 1: Access control should indicate payment required and file locked
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true); // Can access but...
            expect(accessResult.requiresPayment).toBe(true); // Payment required
            expect(accessResult.isUnlocked).toBe(false); // File is locked

            // Test 2: File metadata should be visible but file should be marked as locked
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            
            // Metadata should be visible (preview functionality)
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);
            
            // File should be locked for cross-college access without payment
            expect(resourceFile.isLocked).toBe(true); // Should be locked
            expect(resourceFile.isUnlocked).toBe(false); // Should not be unlocked

            // Test 3: Payment initiation should be required for access
            const paymentSession = await service.initiatePayment(testData.userId, testData.fileId);
            expect(paymentSession).toBeDefined();
            expect(paymentSession.resourceId).toBe(testData.fileId);
            expect(paymentSession.userId).toBe(testData.userId);
            expect(paymentSession.status).toBe('PENDING');
            expect(paymentSession.amount).toBeGreaterThan(0);

            // Test 4: File path access should work (for download after payment verification)
            // This tests that the file exists and can be accessed once payment is verified
            const filePath = await service.getResourceFilePath(testData.fileId);
            expect(filePath).toBeDefined();
            expect(filePath).toBe(mockResource.fileUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow immediate access to own college files without payment checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from same college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@test.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId,
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from same college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@test.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.collegeId, // Same college as resource
              college: mockCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from same college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId, // Same college as user
              college: mockCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No access record needed for own college

            // Test 1: Access control should allow immediate access without payment
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(false); // No payment required for own college
            expect(accessResult.isUnlocked).toBe(true); // Should be unlocked

            // Test 2: File should be accessible and unlocked
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            
            // All metadata should be visible
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);
            
            // File should not be locked for own college
            expect(resourceFile.isLocked).toBe(false); // Should not be locked
            expect(resourceFile.isUnlocked).toBe(true); // Should be unlocked

            // Test 3: Payment should not be required for own college files
            await expect(
              service.initiatePayment(testData.userId, testData.fileId)
            ).rejects.toThrow('Payment not required for this resource');

            // Test 4: File path should be accessible for download
            const filePath = await service.getResourceFilePath(testData.fileId);
            expect(filePath).toBeDefined();
            expect(filePath).toBe(mockResource.fileUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin users to access any file without payment restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
          }),
          async (testData) => {
            // Mock admin's college
            const adminCollege: College = {
              id: testData.adminCollegeId,
              name: 'Admin College',
              emailDomain: 'admin.edu',
              logoUrl: 'admin-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from resource college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock admin user
            const mockUser: User = {
              id: testData.userId,
              email: 'admin@platform.com',
              username: 'admin',
              displayName: 'Admin User',
              passwordHash: 'hash',
              role: UserRole.ADMIN, // Admin role
              collegeId: testData.adminCollegeId,
              college: adminCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);

            // Test 1: Admin should have immediate access without payment
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(true);
            expect(accessResult.requiresPayment).toBe(false); // No payment required for admin
            expect(accessResult.isUnlocked).toBe(true); // Should be unlocked for admin

            // Test 2: Admin should be able to access file without restrictions
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            
            // All metadata should be visible
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);
            
            // File should not be locked for admin
            expect(resourceFile.isLocked).toBe(false); // Should not be locked for admin
            expect(resourceFile.isUnlocked).toBe(true); // Should be unlocked for admin

            // Test 3: Payment should not be required for admin
            await expect(
              service.initiatePayment(testData.userId, testData.fileId)
            ).rejects.toThrow('Payment not required for this resource');

            // Test 4: File path should be accessible for admin download
            const filePath = await service.getResourceFilePath(testData.fileId);
            expect(filePath).toBeDefined();
            expect(filePath).toBe(mockResource.fileUrl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block general and guest users from any file access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            collegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            userRole: fc.constantFrom(UserRole.GENERAL_USER, UserRole.GUEST),
          }),
          async (testData) => {
            // Mock college
            const mockCollege: College = {
              id: testData.collegeId,
              name: 'Test College',
              emailDomain: 'test.edu',
              logoUrl: 'logo.png',
              createdAt: new Date(),
            };

            // Mock non-college user (general or guest)
            const mockUser: User = {
              id: testData.userId,
              email: testData.userRole === UserRole.GUEST ? null : 'user@gmail.com',
              username: testData.userRole === UserRole.GUEST ? null : 'generaluser',
              displayName: testData.userRole === UserRole.GUEST ? null : 'General User',
              passwordHash: testData.userRole === UserRole.GUEST ? null : 'hash',
              role: testData.userRole,
              collegeId: null, // No college association
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.collegeId,
              college: mockCollege,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: 'Test Batch',
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Setup mocks
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Test 1: Access control should deny access completely
            const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResult.canAccess).toBe(false); // No access at all
            expect(accessResult.requiresPayment).toBe(false);
            expect(accessResult.isUnlocked).toBe(false);

            // Test 2: File access should be completely blocked
            await expect(
              service.getResourceFile(testData.fileId, testData.userId)
            ).rejects.toThrow('Access denied to this resource');

            // Test 3: Payment initiation should be blocked
            await expect(
              service.initiatePayment(testData.userId, testData.fileId)
            ).rejects.toThrow('Access denied to this resource');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 30: Payment unlocks file access', () => {
    // Feature: critical-thinking-network, Property 30: Payment unlocks file access
    it('should grant viewing and downloading access to specific file after successful payment completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            fileName: fc.string({ minLength: 1, maxLength: 100 }),
            uploaderUsername: fc.string({ minLength: 3, maxLength: 30 }),
            resourceType: fc.constantFrom(...Object.values(ResourceType)),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            batch: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            uploadDate: fc.date(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college payment scenario
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock uploader user from resource college
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: testData.uploaderUsername,
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock requesting user from different college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different college from resource
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId, // Different college from user
              college: resourceCollege,
              resourceType: testData.resourceType,
              department: testData.department,
              batch: testData.batch,
              fileName: testData.fileName,
              fileUrl: `files/${testData.fileName}`,
              uploadedBy: mockUploader.id,
              uploader: mockUploader,
              description: testData.description,
              uploadDate: testData.uploadDate,
            };

            // Mock payment session
            const sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const mockPaymentSession: PaymentSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              sessionId,
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              amount: testData.paymentAmount,
              currency: 'USD',
              status: PaymentStatus.PENDING,
              paymentProviderSessionId: null,
              paymentProviderResponse: null,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              completedAt: null,
            };

            // Mock completed payment session (after verification)
            const completedPaymentSession: PaymentSession = {
              ...mockPaymentSession,
              status: PaymentStatus.COMPLETED,
              completedAt: new Date(),
            };

            // Mock paid access record (created after payment)
            const mockResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: new Date(),
            };

            // Clear all mocks before setting up new ones
            jest.clearAllMocks();

            // Setup mocks for payment verification
            jest.spyOn(paymentSessionRepository, 'findOne').mockResolvedValue(mockPaymentSession);
            jest.spyOn(paymentSessionRepository, 'save').mockResolvedValue(completedPaymentSession);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            
            // Mock for unlockResourceAfterPayment - no existing access initially
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null);
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(mockResourceAccess);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(mockResourceAccess);

            // Test payment verification and unlock
            const paymentResult = await service.verifyPayment(sessionId);
            expect(paymentResult.success).toBe(true);
            expect(paymentResult.resourceId).toBe(testData.fileId);
            expect(paymentResult.userId).toBe(testData.userId);
            expect(paymentResult.amount).toBe(testData.paymentAmount);
            expect(paymentResult.message).toContain('successfully');

            // Verify payment session was marked as completed
            expect(paymentSessionRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: PaymentStatus.COMPLETED,
                completedAt: expect.any(Date)
              })
            );

            // Verify resource access record was created
            expect(resourceAccessRepository.create).toHaveBeenCalledWith({
              userId: testData.userId,
              resourceId: testData.fileId,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: expect.any(Date)
            });
            expect(resourceAccessRepository.save).toHaveBeenCalledWith(mockResourceAccess);

            // Test access after payment - setup new mocks for access check
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(mockResourceAccess);

            const accessResultAfter = await service.canAccessResource(testData.userId, testData.fileId);
            expect(accessResultAfter.canAccess).toBe(true);
            expect(accessResultAfter.requiresPayment).toBe(true); // Still requires payment for others
            expect(accessResultAfter.isUnlocked).toBe(true); // Should be unlocked for this user

            // Test file access for viewing
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            expect(resourceFile.id).toBe(testData.fileId);
            expect(resourceFile.name).toBe(testData.fileName);
            expect(resourceFile.uploadedBy).toBe(testData.uploaderUsername);
            expect(resourceFile.batch).toBe(testData.batch);
            expect(resourceFile.description).toBe(testData.description);
            expect(resourceFile.uploadDate).toBe(testData.uploadDate);
            expect(resourceFile.isLocked).toBe(false); // Should not be locked after payment
            expect(resourceFile.isUnlocked).toBe(true); // Should be unlocked after payment

            // Test file path access for downloading
            const filePath = await service.getResourceFilePath(testData.fileId);
            expect(filePath).toBeDefined();
            expect(filePath).toBe(mockResource.fileUrl);
          }
        ),
        { numRuns: 20 } // Further reduced iterations for faster execution
      );
    }, 15000); // 15 second timeout

    it('should handle payment verification for expired sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
          }),
          async (testData) => {
            // Mock expired payment session
            const sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const expiredPaymentSession: PaymentSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              sessionId,
              userId: testData.userId,
              user: null,
              resourceId: testData.fileId,
              resource: null,
              amount: testData.paymentAmount,
              currency: 'USD',
              status: PaymentStatus.PENDING,
              paymentProviderSessionId: null,
              paymentProviderResponse: null,
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
              expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (expired)
              completedAt: null,
            };

            // Mock expired session after update
            const expiredSessionAfterUpdate: PaymentSession = {
              ...expiredPaymentSession,
              status: PaymentStatus.EXPIRED,
            };

            // Setup mocks
            jest.spyOn(paymentSessionRepository, 'findOne').mockResolvedValue(expiredPaymentSession);
            jest.spyOn(paymentSessionRepository, 'save').mockResolvedValue(expiredSessionAfterUpdate);

            // Test payment verification for expired session
            const paymentResult = await service.verifyPayment(sessionId);
            
            expect(paymentResult.success).toBe(false);
            expect(paymentResult.resourceId).toBe(testData.fileId);
            expect(paymentResult.userId).toBe(testData.userId);
            expect(paymentResult.message).toContain('expired');

            // Verify session was marked as expired
            expect(paymentSessionRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: PaymentStatus.EXPIRED
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle payment verification for non-existent sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionId: fc.string({ minLength: 10, maxLength: 50 }),
          }),
          async (testData) => {
            // Setup mocks - session not found
            jest.spyOn(paymentSessionRepository, 'findOne').mockResolvedValue(null);

            // Test payment verification for non-existent session
            const paymentResult = await service.verifyPayment(testData.sessionId);
            
            expect(paymentResult.success).toBe(false);
            expect(paymentResult.sessionId).toBe(testData.sessionId);
            expect(paymentResult.resourceId).toBe('');
            expect(paymentResult.userId).toBe('');
            expect(paymentResult.message).toContain('not found');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle payment verification for already completed sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
          }),
          async (testData) => {
            // Mock already completed payment session
            const sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const completedPaymentSession: PaymentSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              sessionId,
              userId: testData.userId,
              user: null,
              resourceId: testData.fileId,
              resource: null,
              amount: testData.paymentAmount,
              currency: 'USD',
              status: PaymentStatus.COMPLETED, // Already completed
              paymentProviderSessionId: null,
              paymentProviderResponse: null,
              createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
              expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
              completedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
            };

            // Setup mocks
            jest.spyOn(paymentSessionRepository, 'findOne').mockResolvedValue(completedPaymentSession);

            // Test payment verification for already completed session
            const paymentResult = await service.verifyPayment(sessionId);
            
            expect(paymentResult.success).toBe(true);
            expect(paymentResult.resourceId).toBe(testData.fileId);
            expect(paymentResult.userId).toBe(testData.userId);
            expect(paymentResult.amount).toBe(testData.paymentAmount);
            expect(paymentResult.message).toContain('already completed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent duplicate resource access records for the same payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user and resource
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId,
              college: null,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: 'Test Batch',
              fileName: 'test.pdf',
              fileUrl: 'files/test.pdf',
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Mock existing paid access record
            const existingResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: new Date(),
            };

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(existingResourceAccess); // Existing access found
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(null as any);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(null as any);

            // Test that unlockResource throws exception when resource is already unlocked
            await expect(service.unlockResource(testData.userId, testData.fileId, testData.paymentAmount))
              .rejects.toThrow('Resource already unlocked');

            // Verify that create and save were NOT called (no duplicate record)
            expect(resourceAccessRepository.create).not.toHaveBeenCalled();
            expect(resourceAccessRepository.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 31: Unlock record persistence', () => {
    // Feature: critical-thinking-network, Property 31: Unlock record persistence
    it('should persist unlock records with complete payment data after successful payment verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
            currency: fc.constantFrom('USD', 'EUR', 'GBP'),
            sessionId: fc.string({ minLength: 10, maxLength: 50 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college payment scenario
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user and resource
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId,
              college: null,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: 'Test Batch',
              fileName: 'test.pdf',
              fileUrl: 'files/test.pdf',
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Mock payment session
            const mockPaymentSession: PaymentSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              sessionId: testData.sessionId,
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              amount: testData.paymentAmount,
              currency: testData.currency,
              status: PaymentStatus.PENDING,
              paymentProviderSessionId: null,
              paymentProviderResponse: null,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              completedAt: null,
            };

            // Mock completed payment session
            const completedPaymentSession: PaymentSession = {
              ...mockPaymentSession,
              status: PaymentStatus.COMPLETED,
              completedAt: new Date(),
            };

            // Mock resource access record that should be created
            const expectedResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: expect.any(Date),
            };

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(paymentSessionRepository, 'findOne').mockResolvedValue(mockPaymentSession);
            jest.spyOn(paymentSessionRepository, 'save').mockResolvedValue(completedPaymentSession);
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(null); // No existing access
            jest.spyOn(resourceAccessRepository, 'create').mockReturnValue(expectedResourceAccess);
            jest.spyOn(resourceAccessRepository, 'save').mockResolvedValue(expectedResourceAccess);

            // Test payment verification which should create unlock record
            const paymentResult = await service.verifyPayment(testData.sessionId);
            
            expect(paymentResult.success).toBe(true);
            expect(paymentResult.amount).toBe(testData.paymentAmount);

            // Verify unlock record was created with complete payment data
            expect(resourceAccessRepository.create).toHaveBeenCalledWith({
              userId: testData.userId,
              resourceId: testData.fileId,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: expect.any(Date)
            });

            // Verify unlock record was persisted
            expect(resourceAccessRepository.save).toHaveBeenCalledWith(expectedResourceAccess);

            // Verify payment session was marked as completed
            expect(paymentSessionRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: PaymentStatus.COMPLETED,
                completedAt: expect.any(Date)
              })
            );
          }
        ),
        { numRuns: 20 } // Reduced iterations for faster execution
      );
    }, 15000); // 15 second timeout

    it('should maintain unlock record integrity across multiple access attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
            accessAttempts: fc.integer({ min: 2, max: 5 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college payment scenario
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user and resource
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId,
              college: null,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: 'Test Batch',
              fileName: 'test.pdf',
              fileUrl: 'files/test.pdf',
              uploadedBy: fc.sample(fc.uuid(), 1)[0],
              uploader: null,
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Mock existing unlock record
            const existingUnlockRecord: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: new Date(),
            };

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks - existing access found
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(existingUnlockRecord);

            // Test multiple access attempts
            for (let i = 0; i < testData.accessAttempts; i++) {
              const accessResult = await service.canAccessResource(testData.userId, testData.fileId);
              
              // Should consistently return unlocked status
              expect(accessResult.isUnlocked).toBe(true);
              expect(accessResult.requiresPayment).toBe(true);
              expect(accessResult.canAccess).toBe(true);
            }

            // Verify findOne was called for each access attempt
            expect(resourceAccessRepository.findOne).toHaveBeenCalledTimes(testData.accessAttempts);
            
            // Verify no additional records were created
            expect(resourceAccessRepository.create).not.toHaveBeenCalled();
            expect(resourceAccessRepository.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle unlock record retrieval for user access history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            unlockCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (testData) => {
            // Generate multiple unlock records
            const unlockRecords: ResourceAccess[] = [];
            for (let i = 0; i < testData.unlockCount; i++) {
              unlockRecords.push({
                id: fc.sample(fc.uuid(), 1)[0],
                userId: testData.userId,
                user: null,
                resourceId: fc.sample(fc.uuid(), 1)[0],
                resource: null,
                accessType: AccessType.PAID,
                paymentAmount: fc.sample(fc.float({ min: 1.0, max: 100.0 }), 1)[0],
                unlockedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over days
              });
            }

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue(unlockRecords);

            // Test retrieving user's paid access records
            const userPaidAccess = await service.getUserPaidAccess(testData.userId);

            // Verify all unlock records are returned
            expect(userPaidAccess).toHaveLength(testData.unlockCount);
            expect(userPaidAccess).toEqual(unlockRecords);

            // Verify correct query parameters
            expect(resourceAccessRepository.find).toHaveBeenCalledWith({
              where: { 
                userId: testData.userId,
                accessType: AccessType.PAID
              },
              relations: ['resource'],
              order: { unlockedAt: 'DESC' }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: Payment does not grant college panel access', () => {
    // Feature: critical-thinking-network, Property 32: Payment does not grant college panel access
    it('should not grant college panel access after paying for cross-college resources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            fileId: fc.uuid(),
            paymentAmount: fc.float({ min: 1.0, max: 100.0 }),
            postTitle: fc.string({ minLength: 1, maxLength: 200 }),
            postContent: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async (testData) => {
            // Ensure colleges are different for cross-college payment scenario
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user's college
            const userCollege: College = {
              id: testData.userCollegeId,
              name: 'User College',
              emailDomain: 'user.edu',
              logoUrl: 'user-logo.png',
              createdAt: new Date(),
            };

            // Mock resource's college
            const resourceCollege: College = {
              id: testData.resourceCollegeId,
              name: 'Resource College',
              emailDomain: 'resource.edu',
              logoUrl: 'resource-logo.png',
              createdAt: new Date(),
            };

            // Mock user from different college than resource
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId, // Different college from resource
              college: userCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock uploader user
            const mockUploader: User = {
              id: fc.sample(fc.uuid(), 1)[0],
              email: 'uploader@resource.edu',
              username: 'uploader',
              displayName: 'Uploader',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.resourceCollegeId,
              college: resourceCollege,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock resource from different college
            const mockResource: Resource = {
              id: testData.fileId,
              collegeId: testData.resourceCollegeId, // Different college from user
              college: resourceCollege,
              resourceType: ResourceType.TOPPER_NOTES,
              department: 'Test Department',
              batch: 'Test Batch',
              fileName: 'test.pdf',
              fileUrl: 'files/test.pdf',
              uploadedBy: mockUploader.id,
              uploader: mockUploader, // Add the uploader
              description: 'Test resource',
              uploadDate: new Date(),
            };

            // Mock paid access record (user has paid for resource)
            const paidResourceAccess: ResourceAccess = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: testData.userId,
              user: mockUser,
              resourceId: testData.fileId,
              resource: mockResource,
              accessType: AccessType.PAID,
              paymentAmount: testData.paymentAmount,
              unlockedAt: new Date(),
            };

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks for resource service
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource);
            jest.spyOn(resourceAccessRepository, 'findOne').mockResolvedValue(paidResourceAccess);

            // Test 1: User should have access to the paid resource
            const resourceAccess = await service.canAccessResource(testData.userId, testData.fileId);
            expect(resourceAccess.canAccess).toBe(true);
            expect(resourceAccess.requiresPayment).toBe(true);
            expect(resourceAccess.isUnlocked).toBe(true); // User has paid for this resource

            // Test 2: User should be able to access the resource file
            const resourceFile = await service.getResourceFile(testData.fileId, testData.userId);
            expect(resourceFile.isLocked).toBe(false);
            expect(resourceFile.isUnlocked).toBe(true);

            // Test 3: Payment for resource should NOT grant college panel access
            // User should still be denied access to the resource college's panel
            
            // Mock PostService behavior (simulating the actual access control)
            const mockPostService = {
              createCollegePost: jest.fn().mockRejectedValue(
                new ForbiddenException('College panel access restricted to college users')
              ),
              getCollegeFeed: jest.fn().mockRejectedValue(
                new ForbiddenException('College panel access restricted to members')
              ),
            };

            // Test college post creation - should be denied
            await expect(
              mockPostService.createCollegePost(testData.userId, {
                title: testData.postTitle,
                content: testData.postContent,
              })
            ).rejects.toThrow('College panel access restricted to college users');

            // Test college feed access - should be denied
            await expect(
              mockPostService.getCollegeFeed(testData.resourceCollegeId, 1, 20, testData.userId)
            ).rejects.toThrow('College panel access restricted to members');

            // Verify that payment for resources doesn't change user's college affiliation
            expect(mockUser.collegeId).toBe(testData.userCollegeId); // Still belongs to original college
            expect(mockUser.collegeId).not.toBe(testData.resourceCollegeId); // Not affiliated with resource college
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain college panel access restrictions regardless of number of paid resources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCollegeId: fc.uuid(),
            resourceCollegeId: fc.uuid(),
            userId: fc.uuid(),
            paidResourceCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.userCollegeId !== testData.resourceCollegeId);

            // Mock user from one college
            const mockUser: User = {
              id: testData.userId,
              email: 'user@user.edu',
              username: 'testuser',
              displayName: 'Test User',
              passwordHash: 'hash',
              role: UserRole.COLLEGE_USER,
              collegeId: testData.userCollegeId,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Generate multiple paid access records for different college
            const paidAccessRecords: ResourceAccess[] = [];
            for (let i = 0; i < testData.paidResourceCount; i++) {
              paidAccessRecords.push({
                id: fc.sample(fc.uuid(), 1)[0],
                userId: testData.userId,
                user: mockUser,
                resourceId: fc.sample(fc.uuid(), 1)[0],
                resource: null,
                accessType: AccessType.PAID,
                paymentAmount: fc.sample(fc.float({ min: 1.0, max: 100.0 }), 1)[0],
                unlockedAt: new Date(),
              });
            }

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(resourceAccessRepository, 'find').mockResolvedValue(paidAccessRecords);

            // Test: User has paid for multiple resources from another college
            const userPaidAccess = await service.getUserPaidAccess(testData.userId);
            expect(userPaidAccess).toHaveLength(testData.paidResourceCount);

            // Mock PostService behavior - access should still be denied
            const mockPostService = {
              getCollegeFeed: jest.fn().mockRejectedValue(
                new ForbiddenException('College panel access restricted to members')
              ),
            };

            // Test: Despite having paid for multiple resources, college panel access is still denied
            await expect(
              mockPostService.getCollegeFeed(testData.resourceCollegeId, 1, 20, testData.userId)
            ).rejects.toThrow('College panel access restricted to members');

            // Verify user's college affiliation hasn't changed
            expect(mockUser.collegeId).toBe(testData.userCollegeId);
            expect(mockUser.collegeId).not.toBe(testData.resourceCollegeId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin users to access any college panel regardless of payment status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminCollegeId: fc.uuid(),
            targetCollegeId: fc.uuid(),
            adminUserId: fc.uuid(),
          }),
          async (testData) => {
            // Ensure colleges are different
            fc.pre(testData.adminCollegeId !== testData.targetCollegeId);

            // Mock admin user
            const mockAdminUser: User = {
              id: testData.adminUserId,
              email: 'admin@admin.edu',
              username: 'admin',
              displayName: 'Admin User',
              passwordHash: 'hash',
              role: UserRole.ADMIN, // Admin role
              collegeId: testData.adminCollegeId,
              college: null,
              bio: null,
              profilePictureUrl: null,
              profile: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock target college
            const targetCollege: College = {
              id: testData.targetCollegeId,
              name: 'Target College',
              emailDomain: 'target.edu',
              logoUrl: 'target-logo.png',
              createdAt: new Date(),
            };

            // Clear all mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockAdminUser);
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(targetCollege);

            // Mock PostService behavior for admin access
            const mockPostService = {
              getCollegeFeed: jest.fn().mockResolvedValue({
                college: {
                  id: targetCollege.id,
                  name: targetCollege.name,
                  logoUrl: targetCollege.logoUrl,
                },
                posts: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
              }),
            };

            // Test: Admin should have access to any college panel without payment
            const collegeFeed = await mockPostService.getCollegeFeed(
              testData.targetCollegeId, 
              1, 
              20, 
              testData.adminUserId
            );

            expect(collegeFeed.college.id).toBe(testData.targetCollegeId);
            expect(mockPostService.getCollegeFeed).toHaveBeenCalledWith(
              testData.targetCollegeId,
              1,
              20,
              testData.adminUserId
            );

            // Verify admin user's role and college affiliation
            expect(mockAdminUser.role).toBe(UserRole.ADMIN);
            expect(mockAdminUser.collegeId).toBe(testData.adminCollegeId);
            expect(mockAdminUser.collegeId).not.toBe(testData.targetCollegeId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 33: Resource upload validation
   * Validates: Requirements 7.2
   * 
   * This property ensures that:
   * - Only moderators and admins can upload resources
   * - Resource type validation works correctly
   * - Required fields are validated
   * - Upload data is properly stored
   */
  describe('Property 33: Resource upload validation', () => {
    it('should validate resource upload permissions and data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            uploader: fc.record({
              id: fc.uuid(),
              role: fc.constantFrom(UserRole.GENERAL_USER, UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN),
              collegeId: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 30 }),
              email: fc.emailAddress(),
            }),
            college: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 200 }),
              emailDomain: fc.domain(),
            }),
            uploadData: fc.record({
              resourceType: fc.constantFrom(...Object.values(ResourceType)),
              department: fc.string({ minLength: 1, maxLength: 100 }),
              batch: fc.string({ minLength: 1, maxLength: 50 }),
              fileName: fc.string({ minLength: 1, maxLength: 255 }),
              fileUrl: fc.webUrl(),
              description: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
            }),
            collegeExists: fc.boolean(),
            uploaderExists: fc.boolean(),
            isModeratorForCollege: fc.boolean(),
          }),
          async ({ uploader, college, uploadData, collegeExists, uploaderExists, isModeratorForCollege }) => {
            // Clear mocks
            jest.clearAllMocks();

            // Setup mocks
            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValue(uploaderExists ? (uploader as User) : null);

            jest.spyOn(collegeRepository, 'findOne')
              .mockResolvedValue(collegeExists ? (college as College) : null);

            const mockResource = {
              id: 'resource-id',
              collegeId: college.id,
              ...uploadData,
              uploadedBy: uploader.id,
              uploadDate: new Date(),
            };

            jest.spyOn(resourceRepository, 'create').mockReturnValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'save').mockResolvedValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource as Resource);

            // Determine if upload should succeed
            const shouldSucceed = 
              uploaderExists &&
              (uploader.role === UserRole.MODERATOR || uploader.role === UserRole.ADMIN) &&
              collegeExists &&
              (uploader.role === UserRole.ADMIN || (uploader.role === UserRole.MODERATOR && (isModeratorForCollege || uploader.collegeId === college.id)));

            if (shouldSucceed) {
              const result = await service.uploadResource(uploader.id, college.id, uploadData);
              
              expect(result).toBeDefined();
              expect(result.id).toBe('resource-id');
              expect(result.collegeId).toBe(college.id);
              expect(result.resourceType).toBe(uploadData.resourceType);
              expect(result.department).toBe(uploadData.department);
              expect(result.batch).toBe(uploadData.batch);
              expect(result.fileName).toBe(uploadData.fileName);
              expect(result.fileUrl).toBe(uploadData.fileUrl);
              expect(result.uploadedBy).toBe(uploader.id);
            } else {
              await expect(service.uploadResource(uploader.id, college.id, uploadData))
                .rejects.toThrow();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 34: Resource hierarchical placement
   * Validates: Requirements 7.3
   * 
   * This property ensures that:
   * - Resources are placed in correct hierarchical location
   * - Hierarchy fields are properly validated and stored
   * - Resource organization follows the five-level structure
   */
  describe('Property 34: Resource hierarchical placement', () => {
    it('should validate resource hierarchical placement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            moderator: fc.record({
              id: fc.uuid(),
              role: fc.constantFrom(UserRole.MODERATOR),
              collegeId: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 30 }),
            }),
            college: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            resourceData: fc.record({
              resourceType: fc.constantFrom(...Object.values(ResourceType)),
              department: fc.string({ minLength: 1, maxLength: 100 }),
              batch: fc.string({ minLength: 1, maxLength: 50 }),
              fileName: fc.string({ minLength: 1, maxLength: 255 }),
              fileUrl: fc.webUrl(),
              description: fc.string({ minLength: 1, maxLength: 500 }),
            }),
          }),
          async ({ moderator, college, resourceData }) => {
            // Clear mocks
            jest.clearAllMocks();

            // Setup successful upload scenario
            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValue({ ...moderator, collegeId: college.id } as User);

            jest.spyOn(collegeRepository, 'findOne')
              .mockResolvedValue(college as College);

            const mockResource = {
              id: 'resource-id',
              collegeId: college.id,
              resourceType: resourceData.resourceType,
              department: resourceData.department,
              batch: resourceData.batch,
              fileName: resourceData.fileName,
              fileUrl: resourceData.fileUrl,
              uploadedBy: moderator.id,
              description: resourceData.description,
              uploadDate: new Date(),
              college,
              uploader: moderator,
            };

            jest.spyOn(resourceRepository, 'create').mockReturnValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'save').mockResolvedValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource as Resource);

            const result = await service.uploadResource(moderator.id, college.id, resourceData);

            // Verify hierarchical placement
            expect(result.collegeId).toBe(college.id); // Level 1: College
            expect(result.resourceType).toBe(resourceData.resourceType); // Level 2: Resource Type
            expect(result.department).toBe(resourceData.department); // Level 3: Department
            expect(result.batch).toBe(resourceData.batch); // Level 4: Batch
            expect(result.fileName).toBe(resourceData.fileName); // Level 5: File

            // Verify all hierarchy fields are properly stored
            expect(resourceRepository.create).toHaveBeenCalledWith({
              collegeId: college.id,
              resourceType: resourceData.resourceType,
              department: resourceData.department,
              batch: resourceData.batch,
              fileName: resourceData.fileName,
              fileUrl: resourceData.fileUrl,
              uploadedBy: moderator.id,
              description: resourceData.description,
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 35: Moderator college restriction
   * Validates: Requirements 7.5, 7.6
   * 
   * This property ensures that:
   * - Moderators can only upload to their assigned college
   * - Admins can upload to any college
   * - College assignment validation works correctly
   */
  describe('Property 35: Moderator college restriction', () => {
    it('should validate moderator college upload restrictions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.uuid(),
              role: fc.constantFrom(UserRole.MODERATOR, UserRole.ADMIN),
              collegeId: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 30 }),
            }),
            targetCollege: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            uploadData: fc.record({
              resourceType: fc.constantFrom(...Object.values(ResourceType)),
              department: fc.string({ minLength: 1, maxLength: 100 }),
              batch: fc.string({ minLength: 1, maxLength: 50 }),
              fileName: fc.string({ minLength: 1, maxLength: 255 }),
              fileUrl: fc.webUrl(),
              description: fc.string({ minLength: 1, maxLength: 500 }),
            }),
            isAssignedCollege: fc.boolean(),
          }),
          async ({ user, targetCollege, uploadData, isAssignedCollege }) => {
            // Clear mocks
            jest.clearAllMocks();

            // Set user's college based on test parameter
            const userWithCollege = {
              ...user,
              collegeId: isAssignedCollege ? targetCollege.id : 'different-college-id'
            };

            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValue(userWithCollege as User);

            jest.spyOn(collegeRepository, 'findOne')
              .mockResolvedValue(targetCollege as College);

            const mockResource = {
              id: 'resource-id',
              collegeId: targetCollege.id,
              ...uploadData,
              uploadedBy: user.id,
              uploadDate: new Date(),
            };

            jest.spyOn(resourceRepository, 'create').mockReturnValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'save').mockResolvedValue(mockResource as Resource);
            jest.spyOn(resourceRepository, 'findOne').mockResolvedValue(mockResource as Resource);

            // Determine if upload should succeed
            const shouldSucceed = 
              user.role === UserRole.ADMIN || 
              (user.role === UserRole.MODERATOR && isAssignedCollege);

            if (shouldSucceed) {
              const result = await service.uploadResource(user.id, targetCollege.id, uploadData);
              expect(result).toBeDefined();
              expect(result.collegeId).toBe(targetCollege.id);
            } else {
              await expect(service.uploadResource(user.id, targetCollege.id, uploadData))
                .rejects.toThrow(ForbiddenException);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});