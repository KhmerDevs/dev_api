import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from './lesson.entity';

@Entity('practice_exercises')
export class PracticeExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  instructions: string;

  @Column('text')
  starterCode: string;

  @Column('text')
  solution: string;

  @Column({ default: true })
  isEnabled: boolean;

  @ManyToOne(() => Lesson, lesson => lesson.practiceExercises)
  lesson: Lesson;

  @Column()
  lessonId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  orderIndex: number;
} 