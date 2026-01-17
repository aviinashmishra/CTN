import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { College } from './college.entity';
import { User } from './user.entity';

export enum ResourceType {
  TOPPER_NOTES = 'TOPPER_NOTES',
  PYQS = 'PYQS',
  CASE_DECKS = 'CASE_DECKS',
  PRESENTATIONS = 'PRESENTATIONS',
  STRATEGIES = 'STRATEGIES',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  collegeId: string;

  @ManyToOne(() => College, { eager: true })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  resourceType: ResourceType;

  @Column()
  department: string;

  @Column()
  batch: string;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column()
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  uploadDate: Date;
}