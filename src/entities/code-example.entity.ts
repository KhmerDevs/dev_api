import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from './lesson.entity';

@Entity('code_examples')
export class CodeExample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  programmingLanguage: string;

  @Column('text')
  code: string;

  @Column('text')
  explanation: string;

  @Column()
  orderIndex: number;

  @ManyToOne(() => Lesson, lesson => lesson.codeExamples)
  lesson: Lesson;

  @Column()
  lessonId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 