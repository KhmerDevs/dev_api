import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, user => user.certificates)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  courseId: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  examAttemptId: number;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examAttemptId' })
  examAttempt: ExamAttempt;

  @Column()
  certificateNumber: string; // Unique identifier for the certificate

  @Column({ nullable: true })
  pdfUrl: string; // URL to the generated PDF certificate

  @CreateDateColumn()
  issuedAt: Date;

  @Column({ default: true })
  isValid: boolean; // Can be used to revoke certificates if needed
} 