import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Resource } from './resource.entity';

export enum AccessType {
  OWN_COLLEGE = 'OWN_COLLEGE',
  PAID = 'PAID',
}

@Entity('resource_access')
export class ResourceAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  resourceId: string;

  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @Column({
    type: 'enum',
    enum: AccessType,
  })
  accessType: AccessType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paymentAmount: number;

  @CreateDateColumn()
  unlockedAt: Date;
}