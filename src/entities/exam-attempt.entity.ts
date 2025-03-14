import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
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
} 