import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { College } from './college.entity';
import { UserProfile } from './user-profile.entity';

export enum UserRole {
  GUEST = 'GUEST',
  GENERAL_USER = 'GENERAL_USER',
  COLLEGE_USER = 'COLLEGE_USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 30 })
  username: string;

  @Column({ nullable: true, length: 100 })
  displayName: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GENERAL_USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  collegeId: string;

  @ManyToOne(() => College, { nullable: true, eager: true })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  profilePictureUrl: string;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
