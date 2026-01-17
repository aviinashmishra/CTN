import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  // National Panel Endpoints
  @Post('national')
  @UseGuards(JwtAuthGuard)
  async createNationalPost(@Request() req, @Body() createPostDto: CreatePostDto) {
    return await this.postService.createNationalPost(req.user.sub, createPostDto);
  }

  @Get('national')
  async getNationalFeed(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req,
  ) {
    const userId = req.user?.sub;
    return await this.postService.getNationalFeed(
      parseInt(page),
      parseInt(limit),
      userId,
    );
  }

  // College Panel Endpoints
  @Post('college')
  @UseGuards(JwtAuthGuard)
  async createCollegePost(@Request() req, @Body() createPostDto: CreatePostDto) {
    return await this.postService.createCollegePost(req.user.sub, createPostDto);
  }

  @Get('college/:collegeId')
  @UseGuards(JwtAuthGuard)
  async getCollegeFeed(
    @Param('collegeId') collegeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req,
  ) {
    return await this.postService.getCollegeFeed(
      collegeId,
      parseInt(page),
      parseInt(limit),
      req.user.sub,
    );
  }

  @Get(':id')
  async getPost(@Param('id') id: string, @Request() req) {
    const userId = req.user?.sub;
    return await this.postService.getPostById(id, userId);
  }

  // Comments
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Request() req,
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return await this.postService.createComment(
      req.user.sub,
      postId,
      createCommentDto,
    );
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string, @Request() req) {
    const userId = req.user?.sub;
    return await this.postService.getPostComments(postId, userId);
  }

  // Likes
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likePost(@Request() req, @Param('id') postId: string) {
    return await this.postService.likePost(req.user.sub, postId);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeComment(@Request() req, @Param('id') commentId: string) {
    return await this.postService.likeComment(req.user.sub, commentId);
  }

  // Reports
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportPost(
    @Request() req,
    @Param('id') postId: string,
    @Body('reason') reason: string,
  ) {
    return await this.postService.reportPost(req.user.sub, postId, reason);
  }

  @Post('comments/:id/report')
  @UseGuards(JwtAuthGuard)
  async reportComment(
    @Request() req,
    @Param('id') commentId: string,
    @Body('reason') reason: string,
  ) {
    return await this.postService.reportComment(req.user.sub, commentId, reason);
  }
}
