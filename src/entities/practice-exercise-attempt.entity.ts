import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { PracticeExercise } from './practice-exercise.entity';

@Entity('practice_exercise_attempts')
export class PracticeExerciseAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => PracticeExercise)
  practiceExercise: PracticeExercise;

  @Column()
  practiceExerciseId: number;

  @Column()
  lessonId: number;

  @Column()
  courseId: number;

  @Column('text')
  submittedCode: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ nullable: true })
  executionTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;
} 