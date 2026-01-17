import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource, ResourceType } from '../../entities/resource.entity';
import { ResourceAccess, AccessType } from '../../entities/resource-access.entity';
import { User, UserRole } from '../../entities/user.entity';
import { College } from '../../entities/college.entity';
import { PaymentSession, PaymentStatus } from '../../entities/payment-session.entity';

export interface ResourceHierarchy {
  college: College;
  resourceTypes: ResourceTypeNode[];
}

export interface ResourceTypeNode {
  type: ResourceType;
  departments: DepartmentNode[];
}

export interface DepartmentNode {
  name: string;
  batches: BatchNode[];
}

export interface BatchNode {
  name: string;
  files: ResourceFile[];
}

export interface ResourceFile {
  id: string;
  name: string;
  uploadedBy: string;
  batch: string;
  description: string;
  uploadDate: Date;
  isLocked: boolean;
  isUnlocked: boolean;
}

export interface AccessResult {
  canAccess: boolean;
  requiresPayment: boolean;
  isUnlocked: boolean;
}

export interface PaymentSessionResponse {
  sessionId: string;
  resourceId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface PaymentResult {
  success: boolean;
  sessionId: string;
  resourceId: string;
  userId: string;
  amount?: number;
  message: string;
}

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    @InjectRepository(ResourceAccess)
    private resourceAccessRepository: Repository<ResourceAccess>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(College)
    private collegeRepository: Repository<College>,
    @InjectRepository(PaymentSession)
    private paymentSessionRepository: Repository<PaymentSession>,
  ) {}

  /**
   * Browse resource hierarchy by college
   * Implements five-level hierarchy traversal (College → Type → Dept → Batch → Files)
   */
  async getResourceHierarchy(collegeId: string, userId: string): Promise<ResourceHierarchy> {
    // Verify college exists
    const college = await this.collegeRepository.findOne({ where: { id: collegeId } });
    if (!college) {
      throw new NotFoundException('College not found');
    }

    // Get user to check access permissions
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can access resources
    if (user.role === UserRole.GENERAL_USER || user.role === UserRole.GUEST) {
      throw new ForbiddenException('Resource access requires college email');
    }

    // Get all resources for this college
    const resources = await this.resourceRepository.find({
      where: { collegeId },
      relations: ['uploader'],
      order: { uploadDate: 'DESC' }
    });

    // Get user's unlocked resources if browsing another college
    let unlockedResourceIds: string[] = [];
    if (user.collegeId !== collegeId) {
      const unlocks = await this.resourceAccessRepository.find({
        where: { userId, accessType: AccessType.PAID },
        select: ['resourceId']
      });
      unlockedResourceIds = unlocks.map(unlock => unlock.resourceId);
    }

    // Build hierarchy structure
    const resourceTypes = this.buildResourceTypeHierarchy(resources, user, unlockedResourceIds);

    return {
      college,
      resourceTypes
    };
  }

  /**
   * Get specific resource file with access control
   */
  async getResourceFile(fileId: string, userId: string): Promise<ResourceFile> {
    const resource = await this.resourceRepository.findOne({
      where: { id: fileId },
      relations: ['college', 'uploader']
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accessResult = await this.canAccessResource(userId, fileId);
    if (!accessResult.canAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    return {
      id: resource.id,
      name: resource.fileName,
      uploadedBy: resource.uploader.username,
      batch: resource.batch,
      description: resource.description,
      uploadDate: resource.uploadDate,
      isLocked: accessResult.requiresPayment && !accessResult.isUnlocked,
      isUnlocked: accessResult.isUnlocked
    };
  }

  /**
   * Check if user can access a specific resource
   */
  async canAccessResource(userId: string, resourceId: string): Promise<AccessResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });

    if (!user || !resource) {
      return { canAccess: false, requiresPayment: false, isUnlocked: false };
    }

    // General users cannot access any resources
    if (user.role === UserRole.GENERAL_USER || user.role === UserRole.GUEST) {
      return { canAccess: false, requiresPayment: false, isUnlocked: false };
    }

    // Admins can access all resources for free
    if (user.role === UserRole.ADMIN) {
      return { canAccess: true, requiresPayment: false, isUnlocked: true };
    }

    // Own college access (free)
    if (user.collegeId === resource.collegeId) {
      return { canAccess: true, requiresPayment: false, isUnlocked: true };
    }

    // Cross-college access (requires payment)
    const existingAccess = await this.resourceAccessRepository.findOne({
      where: { userId, resourceId, accessType: AccessType.PAID }
    });

    return {
      canAccess: true,
      requiresPayment: true,
      isUnlocked: !!existingAccess
    };
  }

  /**
   * Validate resource type against allowed values
   */
  validateResourceType(resourceType: string): boolean {
    return Object.values(ResourceType).includes(resourceType as ResourceType);
  }

  /**
   * Get all available resource types
   */
  getAvailableResourceTypes(): ResourceType[] {
    return Object.values(ResourceType);
  }

  /**
   * Get all colleges for resource browsing
   */
  async getAllColleges(): Promise<{ colleges: College[] }> {
    const colleges = await this.collegeRepository.find({
      order: { name: 'ASC' }
    });
    
    return { colleges };
  }

  /**
   * Get departments for a specific college and resource type
   */
  async getDepartments(collegeId: string, resourceType: ResourceType): Promise<string[]> {
    const departments = await this.resourceRepository
      .createQueryBuilder('resource')
      .select('DISTINCT resource.department', 'department')
      .where('resource.collegeId = :collegeId', { collegeId })
      .andWhere('resource.resourceType = :resourceType', { resourceType })
      .orderBy('resource.department', 'ASC')
      .getRawMany();

    return departments.map(d => d.department);
  }

  /**
   * Get batches for a specific college, resource type, and department
   */
  async getBatches(collegeId: string, resourceType: ResourceType, department: string): Promise<string[]> {
    const batches = await this.resourceRepository
      .createQueryBuilder('resource')
      .select('DISTINCT resource.batch', 'batch')
      .where('resource.collegeId = :collegeId', { collegeId })
      .andWhere('resource.resourceType = :resourceType', { resourceType })
      .andWhere('resource.department = :department', { department })
      .orderBy('resource.batch', 'ASC')
      .getRawMany();

    return batches.map(b => b.batch);
  }

  /**
   * Record resource access for tracking purposes
   */
  async recordResourceAccess(userId: string, resourceId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });

    if (!user || !resource) {
      return;
    }

    // Determine access type
    const accessType = user.collegeId === resource.collegeId 
      ? AccessType.OWN_COLLEGE 
      : AccessType.PAID;

    // Check if access record already exists
    const existingAccess = await this.resourceAccessRepository.findOne({
      where: { userId, resourceId, accessType }
    });

    if (!existingAccess) {
      // Create new access record
      const resourceAccess = this.resourceAccessRepository.create({
        userId,
        resourceId,
        accessType,
        paymentAmount: accessType === AccessType.OWN_COLLEGE ? null : undefined,
        unlockedAt: new Date()
      });

      await this.resourceAccessRepository.save(resourceAccess);
    }
  }

  /**
   * Get file path for a resource (for downloading)
   */
  async getResourceFilePath(resourceId: string): Promise<string> {
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });
    
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // For now, return the fileUrl as the path
    // In a real implementation, this would resolve to the actual file system path
    // or cloud storage URL
    return resource.fileUrl;
  }

  /**
   * Get user's resource access records
   */
  async getUserResourceAccess(userId: string): Promise<ResourceAccess[]> {
    return this.resourceAccessRepository.find({
      where: { userId },
      relations: ['resource'],
      order: { unlockedAt: 'DESC' }
    });
  }

  /**
   * Get user's own college access records
   */
  async getUserOwnCollegeAccess(userId: string): Promise<ResourceAccess[]> {
    return this.resourceAccessRepository.find({
      where: { 
        userId,
        accessType: AccessType.OWN_COLLEGE
      },
      relations: ['resource'],
      order: { unlockedAt: 'DESC' }
    });
  }

  /**
   * Get user's paid access records
   */
  async getUserPaidAccess(userId: string): Promise<ResourceAccess[]> {
    return this.resourceAccessRepository.find({
      where: { 
        userId,
        accessType: AccessType.PAID
      },
      relations: ['resource'],
      order: { unlockedAt: 'DESC' }
    });
  }

  /**
   * Initiate payment for a locked resource
   */
  async initiatePayment(userId: string, resourceId: string): Promise<PaymentSessionResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resource = await this.resourceRepository.findOne({ 
      where: { id: resourceId },
      relations: ['college']
    });

    if (!user || !resource) {
      throw new NotFoundException('User or resource not found');
    }

    // Check if user can access this resource
    const accessResult = await this.canAccessResource(userId, resourceId);
    if (!accessResult.canAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    if (!accessResult.requiresPayment) {
      throw new ForbiddenException('Payment not required for this resource');
    }

    if (accessResult.isUnlocked) {
      throw new ForbiddenException('Resource already unlocked');
    }

    // Check for existing pending payment session
    const existingSession = await this.paymentSessionRepository.findOne({
      where: { 
        userId, 
        resourceId, 
        status: PaymentStatus.PENDING 
      }
    });

    if (existingSession && existingSession.expiresAt > new Date()) {
      // Return existing valid session
      return {
        sessionId: existingSession.sessionId,
        resourceId: existingSession.resourceId,
        userId: existingSession.userId,
        amount: existingSession.amount,
        currency: existingSession.currency,
        status: existingSession.status,
        createdAt: existingSession.createdAt,
        expiresAt: existingSession.expiresAt,
      };
    }

    // Generate new payment session
    const sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const amount = 10.00; // Fixed amount for now, could be dynamic based on resource type
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Create payment session in database
    const paymentSession = this.paymentSessionRepository.create({
      sessionId,
      userId,
      resourceId,
      amount,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      expiresAt,
    });

    const savedSession = await this.paymentSessionRepository.save(paymentSession);

    // In a real implementation, this would integrate with a payment provider like Stripe
    // For now, we'll just return the session details
    return {
      sessionId: savedSession.sessionId,
      resourceId: savedSession.resourceId,
      userId: savedSession.userId,
      amount: savedSession.amount,
      currency: savedSession.currency,
      status: savedSession.status,
      createdAt: savedSession.createdAt,
      expiresAt: savedSession.expiresAt,
    };
  }

  /**
   * Verify payment completion and unlock resource
   */
  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    // Find the payment session
    const paymentSession = await this.paymentSessionRepository.findOne({
      where: { sessionId },
      relations: ['user', 'resource']
    });

    if (!paymentSession) {
      return {
        success: false,
        sessionId,
        resourceId: '',
        userId: '',
        message: 'Payment session not found'
      };
    }

    // Check if session is expired
    if (paymentSession.expiresAt < new Date()) {
      // Mark session as expired
      paymentSession.status = PaymentStatus.EXPIRED;
      await this.paymentSessionRepository.save(paymentSession);

      return {
        success: false,
        sessionId,
        resourceId: paymentSession.resourceId,
        userId: paymentSession.userId,
        message: 'Payment session expired'
      };
    }

    // Check if already completed
    if (paymentSession.status === PaymentStatus.COMPLETED) {
      return {
        success: true,
        sessionId,
        resourceId: paymentSession.resourceId,
        userId: paymentSession.userId,
        amount: paymentSession.amount,
        message: 'Payment already completed'
      };
    }

    // Check if session is in pending state
    if (paymentSession.status !== PaymentStatus.PENDING) {
      return {
        success: false,
        sessionId,
        resourceId: paymentSession.resourceId,
        userId: paymentSession.userId,
        message: `Payment session is in ${paymentSession.status} state`
      };
    }

    // In a real implementation, this would verify with the payment provider (Stripe, PayPal, etc.)
    // For demo purposes, we'll simulate successful payment verification
    
    try {
      // Simulate payment provider verification
      const paymentVerified = await this.simulatePaymentProviderVerification(sessionId);
      
      if (!paymentVerified) {
        paymentSession.status = PaymentStatus.FAILED;
        await this.paymentSessionRepository.save(paymentSession);

        return {
          success: false,
          sessionId,
          resourceId: paymentSession.resourceId,
          userId: paymentSession.userId,
          message: 'Payment verification failed'
        };
      }

      // Payment verified successfully - unlock the resource
      await this.unlockResourceAfterPayment(
        paymentSession.userId, 
        paymentSession.resourceId, 
        paymentSession.amount
      );

      // Mark payment session as completed
      paymentSession.status = PaymentStatus.COMPLETED;
      paymentSession.completedAt = new Date();
      await this.paymentSessionRepository.save(paymentSession);

      return {
        success: true,
        sessionId,
        resourceId: paymentSession.resourceId,
        userId: paymentSession.userId,
        amount: paymentSession.amount,
        message: 'Payment verified and resource unlocked successfully'
      };

    } catch (error) {
      // Mark payment as failed
      paymentSession.status = PaymentStatus.FAILED;
      await this.paymentSessionRepository.save(paymentSession);

      return {
        success: false,
        sessionId,
        resourceId: paymentSession.resourceId,
        userId: paymentSession.userId,
        message: `Payment verification error: ${error.message}`
      };
    }
  }

  /**
   * Simulate payment provider verification (for demo purposes)
   * In a real implementation, this would call Stripe, PayPal, etc.
   */
  private async simulatePaymentProviderVerification(sessionId: string): Promise<boolean> {
    // For demo purposes, we'll simulate a successful payment verification
    // In reality, this would make an API call to the payment provider
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // For demo, we'll return true (successful verification)
    // In a real implementation, this would check with the actual payment provider
    return true;
  }

  /**
   * Unlock resource after successful payment verification
   */
  private async unlockResourceAfterPayment(userId: string, resourceId: string, paymentAmount: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });

    if (!user || !resource) {
      throw new NotFoundException('User or resource not found during unlock');
    }

    // Check if access record already exists
    const existingAccess = await this.resourceAccessRepository.findOne({
      where: { userId, resourceId, accessType: AccessType.PAID }
    });

    if (existingAccess) {
      // Already unlocked, no need to create duplicate record
      return;
    }

    // Create paid access record
    const resourceAccess = this.resourceAccessRepository.create({
      userId,
      resourceId,
      accessType: AccessType.PAID,
      paymentAmount,
      unlockedAt: new Date()
    });

    await this.resourceAccessRepository.save(resourceAccess);
  }

  /**
   * Unlock resource after payment (for testing/demo purposes)
   */
  async unlockResource(userId: string, resourceId: string, paymentAmount: number = 10.00): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resource = await this.resourceRepository.findOne({ where: { id: resourceId } });

    if (!user || !resource) {
      throw new NotFoundException('User or resource not found');
    }

    // Check if user can access this resource
    const accessResult = await this.canAccessResource(userId, resourceId);
    if (!accessResult.canAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    if (!accessResult.requiresPayment) {
      throw new ForbiddenException('Payment not required for this resource');
    }

    if (accessResult.isUnlocked) {
      throw new ForbiddenException('Resource already unlocked');
    }

    // Create paid access record
    const resourceAccess = this.resourceAccessRepository.create({
      userId,
      resourceId,
      accessType: AccessType.PAID,
      paymentAmount,
      unlockedAt: new Date()
    });

    await this.resourceAccessRepository.save(resourceAccess);
  }

  /**
   * Build the resource type hierarchy from flat resource list
   */
  private buildResourceTypeHierarchy(
    resources: Resource[], 
    user: User, 
    unlockedResourceIds: string[]
  ): ResourceTypeNode[] {
    const hierarchy: Map<ResourceType, Map<string, Map<string, Resource[]>>> = new Map();

    // Group resources by type → department → batch
    for (const resource of resources) {
      if (!hierarchy.has(resource.resourceType)) {
        hierarchy.set(resource.resourceType, new Map());
      }
      
      const typeMap = hierarchy.get(resource.resourceType)!;
      if (!typeMap.has(resource.department)) {
        typeMap.set(resource.department, new Map());
      }
      
      const deptMap = typeMap.get(resource.department)!;
      if (!deptMap.has(resource.batch)) {
        deptMap.set(resource.batch, []);
      }
      
      deptMap.get(resource.batch)!.push(resource);
    }

    // Convert to hierarchy structure
    const resourceTypes: ResourceTypeNode[] = [];
    
    for (const [resourceType, deptMap] of hierarchy) {
      const departments: DepartmentNode[] = [];
      
      for (const [deptName, batchMap] of deptMap) {
        const batches: BatchNode[] = [];
        
        for (const [batchName, batchResources] of batchMap) {
          const files: ResourceFile[] = batchResources.map(resource => {
            const isOwnCollege = user.collegeId === resource.collegeId;
            const isAdmin = user.role === UserRole.ADMIN;
            const isUnlocked = isOwnCollege || isAdmin || unlockedResourceIds.includes(resource.id);
            const requiresPayment = !isOwnCollege && !isAdmin;
            
            return {
              id: resource.id,
              name: resource.fileName,
              uploadedBy: resource.uploader.username,
              batch: resource.batch,
              description: resource.description,
              uploadDate: resource.uploadDate,
              isLocked: requiresPayment && !isUnlocked,
              isUnlocked: isUnlocked
            };
          });
          
          batches.push({
            name: batchName,
            files
          });
        }
        
        departments.push({
          name: deptName,
          batches
        });
      }
      
      resourceTypes.push({
        type: resourceType,
        departments
      });
    }

    return resourceTypes;
  }

  /**
   * Upload a new resource (moderators only)
   * Validates hierarchy fields and restricts uploads to moderator's assigned college
   */
  async uploadResource(
    uploaderId: string,
    collegeId: string,
    uploadData: {
      resourceType: ResourceType;
      department: string;
      batch: string;
      fileName: string;
      fileUrl: string;
      description?: string;
    }
  ): Promise<Resource> {
    // Verify uploader exists and has appropriate permissions
    const uploader = await this.userRepository.findOne({ 
      where: { id: uploaderId },
      relations: ['college']
    });
    
    if (!uploader) {
      throw new NotFoundException('Uploader not found');
    }

    // Check if user is a moderator or admin
    if (uploader.role !== UserRole.MODERATOR && uploader.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only moderators and admins can upload resources');
    }

    // Verify college exists
    const college = await this.collegeRepository.findOne({ where: { id: collegeId } });
    if (!college) {
      throw new NotFoundException('College not found');
    }

    // For moderators, restrict uploads to their assigned college
    if (uploader.role === UserRole.MODERATOR && uploader.collegeId !== collegeId) {
      throw new ForbiddenException('Moderators can only upload resources to their assigned college');
    }

    // Validate resource type
    if (!Object.values(ResourceType).includes(uploadData.resourceType)) {
      throw new BadRequestException('Invalid resource type');
    }

    // Validate required fields
    if (!uploadData.department || !uploadData.batch || !uploadData.fileName || !uploadData.fileUrl) {
      throw new BadRequestException('Department, batch, fileName, and fileUrl are required');
    }

    // Create and save the resource
    const resource = this.resourceRepository.create({
      collegeId,
      resourceType: uploadData.resourceType,
      department: uploadData.department,
      batch: uploadData.batch,
      fileName: uploadData.fileName,
      fileUrl: uploadData.fileUrl,
      uploadedBy: uploaderId,
      description: uploadData.description || '',
    });

    const savedResource = await this.resourceRepository.save(resource);

    // Return the resource with relations loaded
    return this.resourceRepository.findOne({
      where: { id: savedResource.id },
      relations: ['college', 'uploader']
    });
  }

  /**
   * Get all resources uploaded by a specific user (for moderator dashboard)
   */
  async getResourcesByUploader(uploaderId: string): Promise<Resource[]> {
    const uploader = await this.userRepository.findOne({ where: { id: uploaderId } });
    if (!uploader) {
      throw new NotFoundException('Uploader not found');
    }

    return this.resourceRepository.find({
      where: { uploadedBy: uploaderId },
      relations: ['college', 'uploader'],
      order: { uploadDate: 'DESC' }
    });
  }

  /**
   * Delete a resource (moderators can only delete their own uploads, admins can delete any)
   */
  async deleteResource(resourceId: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId },
      relations: ['uploader']
    });
    
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check permissions
    if (user.role === UserRole.ADMIN) {
      // Admins can delete any resource
    } else if (user.role === UserRole.MODERATOR && resource.uploadedBy === userId) {
      // Moderators can delete their own uploads
    } else {
      throw new ForbiddenException('You can only delete your own uploads');
    }

    await this.resourceRepository.remove(resource);
  }
}