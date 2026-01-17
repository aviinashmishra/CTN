import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  authorUsername: string;

  @Prop({ required: true })
  authorRole: string;

  @Prop()
  collegeId?: string;

  @Prop({ required: true, enum: ['NATIONAL', 'COLLEGE'] })
  panelType: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes for performance
PostSchema.index({ panelType: 1, createdAt: -1 });
PostSchema.index({ collegeId: 1, createdAt: -1 });
PostSchema.index({ authorId: 1 });
