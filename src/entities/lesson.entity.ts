import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Course } from './course.entity';
import { CodeExample } from './code-example.entity';
import { PracticeExercise } from './practice-exercise.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  orderIndex: number;

  @ManyToOne(() => Course, course => course.lessons)
  course: Course;

  @Column()
  courseId: number;

  @OneToMany(() => CodeExample, codeExample => codeExample.lesson, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  codeExamples: CodeExample[];

  @OneToMany(() => PracticeExercise, practiceExercise => practiceExercise.lesson, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  practiceExercises: PracticeExercise[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 