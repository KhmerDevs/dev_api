import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}

export enum EmailType {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password_reset',
  EXAM_COMPLETION = 'exam_completion',
  GENERAL_ANNOUNCEMENT = 'general_announcement'
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientEmail: string;

  @Column()
  subject: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING
  })
  status: EmailStatus;

  @Column({
    type: 'enum',
    enum: EmailType
  })
  type: EmailType;

  @Column({ nullable: true })
  errorMessage?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ nullable: true })
  recipientId: number;

  @Column({ nullable: true })
  relatedCourseId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;
} 