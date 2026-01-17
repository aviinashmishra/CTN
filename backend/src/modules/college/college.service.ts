import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { College } from '@/entities/college.entity';

@Injectable()
export class CollegeService {
  constructor(
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
  ) {}

  async createCollege(name: string, emailDomain: string, logoUrl?: string): Promise<College> {
    // Check if domain already exists
    const existing = await this.collegeRepository.findOne({
      where: { emailDomain },
    });

    if (existing) {
      throw new ConflictException('Email domain already registered');
    }

    const college = this.collegeRepository.create({
      name,
      emailDomain,
      logoUrl,
    });

    return await this.collegeRepository.save(college);
  }

  async getAllColleges(): Promise<College[]> {
    return await this.collegeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getCollegeById(id: string): Promise<College> {
    const college = await this.collegeRepository.findOne({ where: { id } });
    if (!college) {
      throw new NotFoundException('College not found');
    }
    return college;
  }

  async getCollegeByDomain(emailDomain: string): Promise<College | null> {
    return await this.collegeRepository.findOne({ where: { emailDomain } });
  }

  async deleteCollege(id: string): Promise<void> {
    const result = await this.collegeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('College not found');
    }
  }

  async approveDomain(emailDomain: string, collegeName: string, logoUrl?: string): Promise<College> {
    return await this.createCollege(collegeName, emailDomain, logoUrl);
  }

  async removeDomain(emailDomain: string): Promise<void> {
    const college = await this.getCollegeByDomain(emailDomain);
    if (!college) {
      throw new NotFoundException('Domain not found');
    }
    await this.deleteCollege(college.id);
  }
}
