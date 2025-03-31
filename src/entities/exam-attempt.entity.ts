import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { Certificate } from './certificate.entity';

export enum ExamAttemptStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FLAGGED = 'FLAGGED',
  EXPIRED = 'EXPIRED'
}

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.examAttempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Course)
  course: Course;

  @Column()
  courseId: number;

  @Column('json', { nullable: true })
  answers: { qcmId: number, answer: number }[];

  @Column('float', { nullable: true })
  score: number;

  @Column({ nullable: true })
  passed: boolean;

  @Column({ default: false })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ nullable: true })
  durationInSeconds: number;

  @OneToMany(() => Certificate, certificate => certificate.examAttempt, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  certificates: Certificate[];

  @Column({
    type: 'enum',
    enum: ExamAttemptStatus,
    default: ExamAttemptStatus.PENDING
  })
  status: ExamAttemptStatus;
} 