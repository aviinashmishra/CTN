import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ required: true, enum: ['POST', 'COMMENT'] })
  targetType: string;

  @Prop({ required: true })
  userId: string;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Indexes for performance and uniqueness
LikeSchema.index({ targetId: 1, userId: 1 }, { unique: true });
LikeSchema.index({ userId: 1 });
