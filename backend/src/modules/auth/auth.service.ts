import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@/entities/user.entity';
import { UserProfile } from '@/entities/user-profile.entity';
import { College } from '@/entities/college.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Verify if it's a college email
    const college = await this.verifyCollegeEmail(email);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine role based on email type
    const role = college ? UserRole.COLLEGE_USER : UserRole.GENERAL_USER;

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      role,
      collegeId: college?.id,
      displayName: username, // Default display name to username
    });

    const savedUser = await this.userRepository.save(user);

    // Create user profile
    const profile = this.userProfileRepository.create({
      userId: savedUser.id,
      postCount: 0,
      commentCount: 0,
      likesReceived: 0,
    });
    await this.userProfileRepository.save(profile);

    // Generate JWT token
    const token = this.generateToken(savedUser);

    return {
      user: this.sanitizeUser(savedUser),
      token,
      college,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user with college relation
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['college'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
      college: user.college,
    };
  }

  async verifyCollegeEmail(email: string): Promise<College | null> {
    const domain = email.split('@')[1];
    if (!domain) {
      return null;
    }

    const college = await this.collegeRepository.findOne({
      where: { emailDomain: domain },
    });

    return college;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { username } });
    return !user;
  }

  async assignRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.role = role;
    return await this.userRepository.save(user);
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      collegeId: user.collegeId,
    };

    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['college'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
