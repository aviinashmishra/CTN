import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostDocument } from '@/schemas/post.schema';
import { Comment, CommentDocument } from '@/schemas/comment.schema';
import { Like, LikeDocument } from '@/schemas/like.schema';
import { Report, ReportDocument } from '@/schemas/report.schema';
import { User } from '@/entities/user.entity';
import { UserProfile } from '@/entities/user-profile.entity';
import { College } from '@/entities/college.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserProfile) private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(College) private collegeRepository: Repository<College>,
  ) {}

  // National Panel Posts
  async createNationalPost(userId: string, createPostDto: CreatePostDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['college'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const post = new this.postModel({
      authorId: user.id,
      authorName: user.displayName || user.username,
      authorUsername: user.username,
      authorRole: user.role,
      panelType: 'NATIONAL',
      title: createPostDto.title,
      content: createPostDto.content,
      likes: 0,
      commentCount: 0,
      reportCount: 0,
    });

    const savedPost = await post.save();

    // Update user profile post count
    await this.userProfileRepository.increment(
      { userId: user.id },
      'postCount',
      1,
    );

    return this.formatPost(savedPost, userId);
  }

  // College Panel Posts
  async createCollegePost(userId: string, createPostDto: CreatePostDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['college'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is a college user (has college access)
    if (!user.college || (user.role !== 'COLLEGE_USER' && user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
      throw new ForbiddenException('College panel access restricted to college users');
    }

    const post = new this.postModel({
      authorId: user.id,
      authorName: user.displayName || user.username,
      authorUsername: user.username,
      authorRole: user.role,
      collegeId: user.college.id,
      panelType: 'COLLEGE',
      title: createPostDto.title,
      content: createPostDto.content,
      likes: 0,
      commentCount: 0,
      reportCount: 0,
    });

    const savedPost = await post.save();

    // Update user profile post count
    await this.userProfileRepository.increment(
      { userId: user.id },
      'postCount',
      1,
    );

    return this.formatPost(savedPost, userId);
  }

  async getCollegeFeed(collegeId: string, page: number = 1, limit: number = 20, userId?: string) {
    // Verify user has access to this college panel
    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['college'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check access: user must be from the same college or be an admin
      if (user.role !== 'ADMIN' && (!user.college || user.college.id !== collegeId)) {
        throw new ForbiddenException('College panel access restricted to members');
      }
    } else {
      throw new ForbiddenException('Authentication required for college panel access');
    }

    // Get college information for branding
    const college = await this.collegeRepository.findOne({
      where: { id: collegeId },
    });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    const skip = (page - 1) * limit;

    const posts = await this.postModel
      .find({ 
        panelType: 'COLLEGE', 
        collegeId: collegeId,
        isDeleted: false 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.postModel.countDocuments({
      panelType: 'COLLEGE',
      collegeId: collegeId,
      isDeleted: false,
    });

    const formattedPosts = await Promise.all(
      posts.map((post) => this.formatPost(post, userId)),
    );

    return {
      college: {
        id: college.id,
        name: college.name,
        logoUrl: college.logoUrl,
      },
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getNationalFeed(page: number = 1, limit: number = 20, userId?: string) {
    const skip = (page - 1) * limit;

    const posts = await this.postModel
      .find({ panelType: 'NATIONAL', isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.postModel.countDocuments({
      panelType: 'NATIONAL',
      isDeleted: false,
    });

    const formattedPosts = await Promise.all(
      posts.map((post) => this.formatPost(post, userId)),
    );

    return {
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(postId: string, userId?: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId).exec();

    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    return this.formatPost(post, userId);
  }

  // Comments
  async createComment(
    userId: string,
    postId: string,
    createCommentDto: CreateCommentDto,
  ) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId).exec();
    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const comment = new this.commentModel({
      postId: new Types.ObjectId(postId),
      authorId: user.id,
      authorName: user.displayName || user.username,
      authorUsername: user.username,
      content: createCommentDto.content,
      parentCommentId: createCommentDto.parentCommentId
        ? new Types.ObjectId(createCommentDto.parentCommentId)
        : undefined,
      likes: 0,
    });

    const savedComment = await comment.save();

    // Update post comment count
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { commentCount: 1 },
    });

    // Update user profile comment count
    await this.userProfileRepository.increment(
      { userId: user.id },
      'commentCount',
      1,
    );

    return this.formatComment(savedComment, userId);
  }

  async getPostComments(postId: string, userId?: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const comments = await this.commentModel
      .find({
        postId: new Types.ObjectId(postId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();

    return Promise.all(
      comments.map((comment) => this.formatComment(comment, userId)),
    );
  }

  // Likes
  async likePost(userId: string, postId: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId).exec();
    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.likeModel.findOne({
      targetId: new Types.ObjectId(postId),
      userId,
    });

    if (existingLike) {
      // Unlike
      await this.likeModel.deleteOne({ _id: existingLike._id });
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { likes: -1 },
        $pull: { likedBy: userId },
      });
      return { liked: false };
    } else {
      // Like
      const like = new this.likeModel({
        targetId: new Types.ObjectId(postId),
        targetType: 'POST',
        userId,
      });
      await like.save();
      await this.postModel.findByIdAndUpdate(postId, {
        $inc: { likes: 1 },
        $push: { likedBy: userId },
      });
      return { liked: true };
    }
  }

  async likeComment(userId: string, commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    // Check if already liked
    const existingLike = await this.likeModel.findOne({
      targetId: new Types.ObjectId(commentId),
      userId,
    });

    if (existingLike) {
      // Unlike
      await this.likeModel.deleteOne({ _id: existingLike._id });
      await this.commentModel.findByIdAndUpdate(commentId, {
        $inc: { likes: -1 },
        $pull: { likedBy: userId },
      });
      return { liked: false };
    } else {
      // Like
      const like = new this.likeModel({
        targetId: new Types.ObjectId(commentId),
        targetType: 'COMMENT',
        userId,
      });
      await like.save();
      await this.commentModel.findByIdAndUpdate(commentId, {
        $inc: { likes: 1 },
        $push: { likedBy: userId },
      });
      return { liked: true };
    }
  }

  // Reports
  async reportPost(userId: string, postId: string, reason: string) {
    if (!Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel.findById(postId).exec();
    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    const report = new this.reportModel({
      targetId: new Types.ObjectId(postId),
      targetType: 'POST',
      reportedBy: userId,
      reason,
      status: 'PENDING',
    });

    await report.save();

    // Update post report count
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { reportCount: 1 },
    });

    return { message: 'Report submitted successfully' };
  }

  async reportComment(userId: string, commentId: string, reason: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    const report = new this.reportModel({
      targetId: new Types.ObjectId(commentId),
      targetType: 'COMMENT',
      reportedBy: userId,
      reason,
      status: 'PENDING',
    });

    await report.save();

    return { message: 'Report submitted successfully' };
  }

  // Helper methods
  private async formatPost(post: PostDocument, userId?: string) {
    const isLiked = userId
      ? post.likedBy?.includes(userId) || false
      : false;

    return {
      id: post._id.toString(),
      authorId: post.authorId,
      authorName: post.authorName,
      authorUsername: post.authorUsername,
      authorRole: post.authorRole,
      collegeId: post.collegeId,
      panelType: post.panelType,
      title: post.title,
      content: post.content,
      likes: post.likes,
      commentCount: post.commentCount,
      reportCount: post.reportCount,
      isLiked,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private async formatComment(comment: CommentDocument, userId?: string) {
    const isLiked = userId
      ? comment.likedBy?.includes(userId) || false
      : false;

    return {
      id: comment._id.toString(),
      postId: comment.postId.toString(),
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorUsername: comment.authorUsername,
      content: comment.content,
      likes: comment.likes,
      parentCommentId: comment.parentCommentId?.toString(),
      isLiked,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
