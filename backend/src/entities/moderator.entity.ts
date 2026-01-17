import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { College } from './college.entity';

@Entity('moderators')
export class Moderator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  collegeId: string;

  @ManyToOne(() => College)
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  assignedBy: string;

  @CreateDateColumn()
  assignedAt: Date;
}
