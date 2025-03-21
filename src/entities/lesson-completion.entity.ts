import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Lesson } from './lesson.entity';

@Entity('lesson_completions')
export class LessonCompletion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Lesson)
  lesson: Lesson;

  @Column()
  lessonId: number;

  @Column()
  courseId: number;

  @Column({ default: false })
  completed: boolean;

  @Column({ default: 0 })
  timeSpentSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 