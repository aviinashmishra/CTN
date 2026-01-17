import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { CollegeService } from './college.service';
import { College } from '@/entities/college.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CollegeService Property Tests', () => {
  let service: CollegeService;
  let collegeRepository: Repository<College>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollegeService,
        {
          provide: getRepositoryToken(College),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CollegeService>(CollegeService);
    collegeRepository = module.get<Repository<College>>(
      getRepositoryToken(College),
    );
  });

  // Feature: critical-thinking-network, Property 5: Domain registry persistence
  describe('Property 5: Domain registry persistence', () => {
    it('should make approved domains available for verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)),
          fc.string({ minLength: 3, maxLength: 100 }),
          async (emailDomain, collegeName) => {
            // Mock: Domain doesn't exist initially
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValueOnce(null);

            // Mock: College creation
            const mockCollege = {
              id: 'college-id',
              name: collegeName,
              emailDomain,
              logoUrl: null,
              createdAt: new Date(),
            } as College;

            jest.spyOn(collegeRepository, 'create').mockReturnValue(mockCollege);
            jest.spyOn(collegeRepository, 'save').mockResolvedValue(mockCollege);

            // Execute: Approve domain
            const result = await service.approveDomain(emailDomain, collegeName);

            // Verify: Domain is added
            expect(result.emailDomain).toBe(emailDomain);
            expect(result.name).toBe(collegeName);

            // Mock: Domain now exists for verification
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);

            // Execute: Verify domain is available
            const verifyResult = await service.getCollegeByDomain(emailDomain);

            // Verify: Domain can be found
            expect(verifyResult).not.toBeNull();
            expect(verifyResult?.emailDomain).toBe(emailDomain);
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should prevent future verifications after domain removal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)),
          async (emailDomain) => {
            // Mock: Domain exists
            const mockCollege = {
              id: 'college-id',
              name: 'Test College',
              emailDomain,
              logoUrl: null,
              createdAt: new Date(),
            } as College;

            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(mockCollege);
            jest.spyOn(collegeRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

            // Execute: Remove domain
            await service.removeDomain(emailDomain);

            // Mock: Domain no longer exists
            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(null);

            // Execute: Try to verify removed domain
            const result = await service.getCollegeByDomain(emailDomain);

            // Verify: Domain cannot be found
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);

    it('should reject duplicate domain registrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)),
          fc.string({ minLength: 3, maxLength: 100 }),
          async (emailDomain, collegeName) => {
            // Mock: Domain already exists
            const existingCollege = {
              id: 'existing-id',
              name: 'Existing College',
              emailDomain,
              logoUrl: null,
              createdAt: new Date(),
            } as College;

            jest.spyOn(collegeRepository, 'findOne').mockResolvedValue(existingCollege);

            // Execute and verify: Should throw conflict exception
            await expect(
              service.approveDomain(emailDomain, collegeName)
            ).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 100 },
      );
    }, 30000);
  });
});
