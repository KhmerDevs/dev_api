import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

export enum ActivityType {
  VIEW_LESSON = 'view_lesson',
  COMPLETE_LESSON = 'complete_lesson',
  SUBMIT_EXERCISE = 'submit_exercise',
  START_EXAM = 'start_exam',
  COMPLETE_EXAM = 'complete_exam'
}

@Entity('user_activities')
export class UserActivity {
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

  @Column({ nullable: true })
  lessonId: number;

  @Column({ nullable: true })
  exerciseId: number;

  @Column({ nullable: true })
  examId: number;

  @Column({
    type: 'enum',
    enum: ActivityType
  })
  activityType: ActivityType;

  @Column({ nullable: true })
  timeSpentSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
} 