import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Enrollment } from './enrollment.entity';
import { ExamAttempt } from './exam-attempt.entity';
import { LessonCompletion } from './lesson-completion.entity';
import { UserActivity } from './user-activity.entity';
import { Certificate } from './certificate.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ default: 'User' })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ default: false })
  isGoogleAccount: boolean;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Enrollment, enrollment => enrollment.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  enrollments: Enrollment[];

  @OneToMany(() => ExamAttempt, attempt => attempt.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  examAttempts: ExamAttempt[];

  @OneToMany(() => LessonCompletion, completion => completion.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  lessonCompletions: LessonCompletion[];

  @OneToMany(() => UserActivity, activity => activity.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  activities: UserActivity[];

  @OneToMany(() => Certificate, certificate => certificate.user, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  certificates: Certificate[];

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;
} 