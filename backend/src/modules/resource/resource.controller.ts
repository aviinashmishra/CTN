import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { ResourceService, ResourceHierarchy, ResourceFile, PaymentSessionResponse, PaymentResult } from './resource.service';
import { BrowseHierarchyDto } from './dto/browse-hierarchy.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { UnlockResourceDto } from './dto/unlock-resource.dto';
import { UploadResourceDto } from './dto/upload-resource.dto';
import { Resource } from '../../entities/resource.entity';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  /**
   * Browse resource hierarchy by college
   * GET /resources/hierarchy/:collegeId
   */
  @Get('hierarchy/:collegeId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getResourceHierarchy(
    @Param('collegeId') collegeId: string,
    @Request() req: any,
  ): Promise<ResourceHierarchy> {
    return this.resourceService.getResourceHierarchy(collegeId, req.user.id);
  }

  /**
   * Get specific resource file
   * GET /resources/file/:fileId
   */
  @Get('file/:fileId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getResourceFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<ResourceFile> {
    return this.resourceService.getResourceFile(fileId, req.user.id);
  }

  /**
   * Get available resource types
   * GET /resources/types
   */
  @Get('types')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getResourceTypes() {
    return {
      resourceTypes: this.resourceService.getAvailableResourceTypes()
    };
  }

  /**
   * Get all colleges for resource browsing
   * GET /resources/colleges
   */
  @Get('colleges')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getAllColleges() {
    return this.resourceService.getAllColleges();
  }

  /**
   * Get departments for a college and resource type
   * GET /resources/:collegeId/departments?resourceType=TOPPER_NOTES
   */
  @Get(':collegeId/departments')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getDepartments(
    @Param('collegeId') collegeId: string,
    @Query('resourceType') resourceType: string,
  ) {
    if (!this.resourceService.validateResourceType(resourceType)) {
      throw new Error('Invalid resource type');
    }
    
    const departments = await this.resourceService.getDepartments(collegeId, resourceType as any);
    return { departments };
  }

  /**
   * Get batches for a college, resource type, and department
   * GET /resources/:collegeId/batches?resourceType=TOPPER_NOTES&department=MBA
   */
  @Get(':collegeId/batches')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getBatches(
    @Param('collegeId') collegeId: string,
    @Query('resourceType') resourceType: string,
    @Query('department') department: string,
  ) {
    if (!this.resourceService.validateResourceType(resourceType)) {
      throw new Error('Invalid resource type');
    }
    
    const batches = await this.resourceService.getBatches(collegeId, resourceType as any, department);
    return { batches };
  }

  /**
   * View resource file content (with access control)
   * GET /resources/view/:fileId
   */
  @Get('view/:fileId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async viewResourceFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ) {
    const accessResult = await this.resourceService.canAccessResource(req.user.id, fileId);
    
    if (!accessResult.canAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    if (accessResult.requiresPayment && !accessResult.isUnlocked) {
      throw new ForbiddenException('Payment required to view this resource');
    }

    const resourceFile = await this.resourceService.getResourceFile(fileId, req.user.id);
    
    // Record access for tracking
    await this.resourceService.recordResourceAccess(req.user.id, fileId);
    
    return {
      message: 'File access granted',
      file: resourceFile,
      canDownload: true
    };
  }

  /**
   * Download resource file (with access control)
   * GET /resources/download/:fileId
   */
  @Get('download/:fileId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  @Header('Content-Type', 'application/octet-stream')
  async downloadResourceFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<StreamableFile> {
    const accessResult = await this.resourceService.canAccessResource(req.user.id, fileId);
    
    if (!accessResult.canAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    if (accessResult.requiresPayment && !accessResult.isUnlocked) {
      throw new ForbiddenException('Payment required to download this resource');
    }

    const resourceFile = await this.resourceService.getResourceFile(fileId, req.user.id);
    
    // Record access for tracking
    await this.resourceService.recordResourceAccess(req.user.id, fileId);
    
    // Get file path and create stream
    const filePath = await this.resourceService.getResourceFilePath(fileId);
    const file = createReadStream(filePath);
    
    return new StreamableFile(file, {
      disposition: `attachment; filename="${resourceFile.name}"`,
    });
  }

  /**
   * Get user's resource access history
   * GET /resources/access/history
   */
  @Get('access/history')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getUserAccessHistory(@Request() req: any) {
    const accessRecords = await this.resourceService.getUserResourceAccess(req.user.id);
    return { accessRecords };
  }

  /**
   * Get user's own college access records
   * GET /resources/access/own-college
   */
  @Get('access/own-college')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getUserOwnCollegeAccess(@Request() req: any) {
    const accessRecords = await this.resourceService.getUserOwnCollegeAccess(req.user.id);
    return { accessRecords };
  }

  /**
   * Get user's paid access records
   * GET /resources/access/paid
   */
  @Get('access/paid')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async getUserPaidAccess(@Request() req: any) {
    const accessRecords = await this.resourceService.getUserPaidAccess(req.user.id);
    return { accessRecords };
  }

  /**
   * Initiate payment for a locked resource
   * POST /resources/payment/initiate/:fileId
   */
  @Post('payment/initiate/:fileId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async initiatePayment(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<{ paymentSession: PaymentSessionResponse }> {
    const paymentSession = await this.resourceService.initiatePayment(req.user.id, fileId);
    return { paymentSession };
  }

  /**
   * Verify payment completion
   * POST /resources/payment/verify
   */
  @Post('payment/verify')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async verifyPayment(
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ): Promise<{ result: PaymentResult }> {
    const result = await this.resourceService.verifyPayment(verifyPaymentDto.sessionId);
    return { result };
  }

  /**
   * Unlock resource (for testing/demo purposes)
   * POST /resources/unlock/:fileId
   */
  @Post('unlock/:fileId')
  @Roles(UserRole.COLLEGE_USER, UserRole.MODERATOR, UserRole.ADMIN)
  async unlockResource(
    @Param('fileId') fileId: string,
    @Body() unlockResourceDto: UnlockResourceDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.resourceService.unlockResource(req.user.id, fileId, unlockResourceDto.paymentAmount);
    return { message: 'Resource unlocked successfully' };
  }

  /**
   * Upload a new resource (moderators and admins only)
   * POST /resources/upload/:collegeId
   */
  @Post('upload/:collegeId')
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async uploadResource(
    @Param('collegeId') collegeId: string,
    @Body() uploadResourceDto: UploadResourceDto,
    @Request() req: any,
  ): Promise<{ resource: Resource }> {
    const resource = await this.resourceService.uploadResource(
      req.user.id,
      collegeId,
      uploadResourceDto
    );
    return { resource };
  }

  /**
   * Get resources uploaded by current user (for moderator dashboard)
   * GET /resources/my-uploads
   */
  @Get('my-uploads')
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async getMyUploads(@Request() req: any): Promise<{ resources: Resource[] }> {
    const resources = await this.resourceService.getResourcesByUploader(req.user.id);
    return { resources };
  }

  /**
   * Delete a resource (moderators can delete their own, admins can delete any)
   * DELETE /resources/:resourceId
   */
  @Delete(':resourceId')
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  async deleteResource(
    @Param('resourceId') resourceId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.resourceService.deleteResource(resourceId, req.user.id);
    return { message: 'Resource deleted successfully' };
  }
}