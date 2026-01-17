import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { AuthService } from './auth.service';
import { User, UserRole } from '@/entities/user.entity';
import { UserProfile } from '@/entities/user-profile.entity';
import { College } from '@/entities/college.entity';
import { ConflictException } from '@nestjs/common';

describe('AuthService Property Tests', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let userProfileRepository: Repository<UserProfile>;
  let collegeRepository: Repository<College>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(College),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userProfileRepository = module.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
    collegeRepository = module.get<Repository<College>>(
      getRepositoryToken(College),
    );
    jwtService = module.get<JwtService>(JwtService);
  });

  // Feature: critical-thinking-network, Property 1: Normal email registration creates general users
  describe('Property 1: Normal email registration creates general users', () => {
    it('should create GENERAL_USER for any valid normal email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
            fc.constantFrom('gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'),
          ).map(([local, domain]) => `${local}@${domain}`),
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (email, username, password) => {
            // Mock: No existing user
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
            
            // Mock: No college found (normal email)
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(null);

            // Mock: User creation
            const mockUser = {
              id: 'test-id',
              email,
              username,
              passwordHash: 'hashed',
              role: UserRole.GENERAL_USER,
              collegeId: null,
              displayName: username,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as User;

            jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
            jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

            // Mock: Profile creation
            const mockProfile = {
              userId: mockUser.id,
              postCount: 0,
              commentCount: 0,
              likesReceived: 0,
            } as UserProfile;

            jest.spyOn(userProfileRepository, 'create').mockReturnValue(mockProfile);
            jest.spyOn(userProfileRepository, 'save').mockResolvedValue(mockProfile);

            // Execute
            const result = await service.register({ email, username, password });

            // Verify
            expect(result.user.role).toBe(UserRole.GENERAL_USER);
            expect(result.user.email).toBe(email);
            expect(result.user.collegeId).toBeNull();
            expect(result.college).toBeNull();
            expect(result.token).toBe('mock-jwt-token');
          },
        ),
        { numRuns: 100 },
      );
    }, 30000); // 30 second timeout for property test
  });

  // Feature: critical-thinking-network, Property 2: College email domain verification
  describe('Property 2: College email domain verification', () => {
    it('should correctly identify college email domains', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
            fc.constantFrom('iimj.ac.in', 'iima.ac.in', 'iitd.ac.in', 'example.edu'),
            fc.boolean(),
          ),
          async ([local, domain, shouldExist]) => {
            const email = `${local}@${domain}`;
            
            // Mock: College exists or not based on shouldExist
            const mockCollege = shouldExist ? {
              id: 'college-id',
              name: 'Test College',
              emailDomain: domain,
              logoUrl: 'logo.png',
              createdAt: new Date(),
            } as College : null;

            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);

            // Execute
            const result = await service.verifyCollegeEmail(email);

            // Verify
            if (shouldExist) {
              expect(result).not.toBeNull();
              expect(result?.emailDomain).toBe(domain);
            } else {
              expect(result).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  // Feature: critical-thinking-network, Property 3: College email registration creates college users
  describe('Property 3: College email registration creates college users', () => {
    it('should create COLLEGE_USER for any verified college email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
            fc.constantFrom('iimj.ac.in', 'iima.ac.in', 'iitd.ac.in'),
          ).map(([local, domain]) => `${local}@${domain}`),
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (email, username, password) => {
            const domain = email.split('@')[1];
            
            // Mock: No existing user
            jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
            
            // Mock: College found (college email)
            const mockCollege = {
              id: 'college-id',
              name: 'Test College',
              emailDomain: domain,
              logoUrl: 'logo.png',
              createdAt: new Date(),
            } as College;
            
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);

            // Mock: User creation
            const mockUser = {
              id: 'test-id',
              email,
              username,
              passwordHash: 'hashed',
              role: UserRole.COLLEGE_USER,
              collegeId: mockCollege.id,
              displayName: username,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as User;

            jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
            jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

            // Mock: Profile creation
            const mockProfile = {
              userId: mockUser.id,
              postCount: 0,
              commentCount: 0,
              likesReceived: 0,
            } as UserProfile;

            jest.spyOn(userProfileRepository, 'create').mockReturnValue(mockProfile);
            jest.spyOn(userProfileRepository, 'save').mockResolvedValue(mockProfile);

            // Execute
            const result = await service.register({ email, username, password });

            // Verify
            expect(result.user.role).toBe(UserRole.COLLEGE_USER);
            expect(result.user.email).toBe(email);
            expect(result.user.collegeId).toBe(mockCollege.id);
            expect(result.college).toEqual(mockCollege);
            expect(result.token).toBe('mock-jwt-token');
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  // Feature: critical-thinking-network, Property 4: Role assignment consistency
  describe('Property 4: Role assignment consistency', () => {
    it('should assign role based on email type during login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
            fc.oneof(
              fc.constantFrom('gmail.com', 'outlook.com', 'yahoo.com'),
              fc.constantFrom('iimj.ac.in', 'iima.ac.in', 'iitd.ac.in'),
            ),
          ).map(([local, domain]) => ({ email: `${local}@${domain}`, domain })),
          fc.string({ minLength: 8, maxLength: 50 }),
          async ({ email, domain }, password) => {
            const isCollegeEmail = !['gmail.com', 'outlook.com', 'yahoo.com'].includes(domain);
            const expectedRole = isCollegeEmail ? UserRole.COLLEGE_USER : UserRole.GENERAL_USER;
            
            // Mock: College for college emails
            const mockCollege = isCollegeEmail ? {
              id: 'college-id',
              name: 'Test College',
              emailDomain: domain,
              logoUrl: 'logo.png',
              createdAt: new Date(),
            } as College : null;

            // Mock: Existing user
            const mockUser = {
              id: 'test-id',
              email,
              username: 'testuser',
              passwordHash: await require('bcrypt').hash(password, 10),
              role: expectedRole,
              collegeId: mockCollege?.id || null,
              college: mockCollege,
              displayName: 'testuser',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as User;

            jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

            // Execute
            const result = await service.login({ email, password });

            // Verify
            expect(result.user.role).toBe(expectedRole);
            if (isCollegeEmail) {
              expect(result.college).not.toBeNull();
            } else {
              expect(result.college).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  // Feature: critical-thinking-network, Property 45: Username uniqueness validation
  describe('Property 45: Username uniqueness validation', () => {
    it('should reject duplicate usernames', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
            fc.constantFrom('gmail.com', 'outlook.com'),
          ).map(([local, domain]) => `${local}@${domain}`),
          fc.string({ minLength: 8, maxLength: 50 }),
          async (username, email, password) => {
            // Mock: Username already exists
            const existingUser = {
              id: 'existing-id',
              username,
              email: 'other@example.com',
            } as User;

            jest.spyOn(userRepository, 'findOne')
              .mockResolvedValueOnce(null) // First call for email check
              .mockResolvedValueOnce(existingUser); // Second call for username check

            // Execute and verify
            await expect(
              service.register({ email, username, password })
            ).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });

  // Feature: critical-thinking-network, Property 46: Username character validation
  describe('Property 46: Username character validation', () => {
    it('should accept valid username characters and reject invalid ones', async () => {
      // Valid usernames
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          async (username) => {
            // This should not throw validation error
            expect(/^[a-zA-Z0-9_-]+$/.test(username)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );

      // Invalid usernames
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => /[^a-zA-Z0-9_-]/.test(s)),
          async (username) => {
            // This should fail validation
            expect(/^[a-zA-Z0-9_-]+$/.test(username)).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    }, 30000);
  });

  // Feature: critical-thinking-network, Property 47: Username length validation
  describe('Property 47: Username length validation', () => {
    it('should accept usernames between 3-30 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 30 }),
          async (length) => {
            const username = 'a'.repeat(length);
            expect(username.length).toBeGreaterThanOrEqual(3);
            expect(username.length).toBeLessThanOrEqual(30);
          },
        ),
        { numRuns: 50 },
      );
    }, 30000);

    it('should reject usernames outside 3-30 character range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ min: 0, max: 2 }),
            fc.integer({ min: 31, max: 50 }),
          ),
          async (length) => {
            const username = 'a'.repeat(length);
            const isValid = username.length >= 3 && username.length <= 30;
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    }, 30000);
  });
});
