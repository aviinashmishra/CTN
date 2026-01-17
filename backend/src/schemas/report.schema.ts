import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ required: true, enum: ['POST', 'COMMENT'] })
  targetType: string;

  @Prop({ required: true })
  reportedBy: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true, enum: ['PENDING', 'REVIEWED', 'RESOLVED'], default: 'PENDING' })
  status: string;

  @Prop()
  reviewedBy?: string;

  @Prop()
  reviewedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Indexes for performance
ReportSchema.index({ targetId: 1, status: 1 });
ReportSchema.index({ reportedBy: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });
