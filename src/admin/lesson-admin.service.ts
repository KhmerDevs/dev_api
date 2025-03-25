import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Course } from '../entities/course.entity';
import { CodeExample } from '../entities/code-example.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { CreateLessonDto } from './dto/lesson/create-lesson.dto';
import { LessonResponseDto } from './dto/lesson/lesson-response.dto';

@Injectable()
export class LessonAdminService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CodeExample)
    private codeExampleRepository: Repository<CodeExample>,
    @InjectRepository(PracticeExercise)
    private practiceExerciseRepository: Repository<PracticeExercise>,
  ) {}

  async createLesson(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: createLessonDto.courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${createLessonDto.courseId} not found`);
    }

    // Get the highest orderIndex for this course
    const highestOrderLesson = await this.lessonRepository.findOne({
      where: { courseId: createLessonDto.courseId },
      order: { orderIndex: 'DESC' }
    });

    const orderIndex = highestOrderLesson ? highestOrderLesson.orderIndex + 1 : 0;

    // Create the lesson
    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      orderIndex
    });

    const savedLesson = await this.lessonRepository.save(lesson);

    // Create code examples if provided
    if (createLessonDto.codeExamples && createLessonDto.codeExamples.length > 0) {
      const codeExamples = createLessonDto.codeExamples.map(codeExample => 
        this.codeExampleRepository.create({
          ...codeExample,
          lessonId: savedLesson.id
        })
      );
      await this.codeExampleRepository.save(codeExamples);
    }

    // Create practice exercises if provided
    if (createLessonDto.practiceExercises && createLessonDto.practiceExercises.length > 0) {
      const practiceExercises = createLessonDto.practiceExercises.map(exercise => 
        this.practiceExerciseRepository.create({
          ...exercise,
          lessonId: savedLesson.id
        })
      );
      await this.practiceExerciseRepository.save(practiceExercises);
    }

    // Return the lesson with its relations
    return this.getLessonById(savedLesson.id);
  }

  async getLessonById(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['codeExamples', 'practiceExercises']
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Convert Lesson to LessonResponseDto
    // We need to add the lessonNumber property
    const lessonResponse: LessonResponseDto = {
      ...lesson,
      lessonNumber: lesson.orderIndex + 1, // Using orderIndex + 1 as lessonNumber
    };

    return lessonResponse;
  }

  async updateLesson(id: number, updateLessonDto: any) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['codeExamples', 'practiceExercises']
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Update basic lesson properties
    if (updateLessonDto.title) lesson.title = updateLessonDto.title;
    if (updateLessonDto.content) lesson.content = updateLessonDto.content;
    // Remove the videoUrl property if it doesn't exist in the Lesson entity
    // if (updateLessonDto.videoUrl) lesson.videoUrl = updateLessonDto.videoUrl;

    await this.lessonRepository.save(lesson);

    // Handle code examples if provided
    if (updateLessonDto.codeExamples) {
      // Delete existing code examples
      if (lesson.codeExamples && lesson.codeExamples.length > 0) {
        await this.codeExampleRepository.remove(lesson.codeExamples);
      }

      // Create new code examples
      const codeExamples = updateLessonDto.codeExamples.map(codeExample => 
        this.codeExampleRepository.create({
          ...codeExample,
          lessonId: lesson.id
        })
      );
      await this.codeExampleRepository.save(codeExamples);
    }

    // Handle practice exercises if provided
    if (updateLessonDto.practiceExercises) {
      // Delete existing practice exercises
      if (lesson.practiceExercises && lesson.practiceExercises.length > 0) {
        await this.practiceExerciseRepository.remove(lesson.practiceExercises);
      }

      // Create new practice exercises
      const practiceExercises = updateLessonDto.practiceExercises.map(exercise => 
        this.practiceExerciseRepository.create({
          ...exercise,
          lessonId: lesson.id
        })
      );
      await this.practiceExerciseRepository.save(practiceExercises);
    }

    return this.getLessonById(id);
  }

  async deleteLesson(id: number) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['codeExamples', 'practiceExercises']
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.lessonRepository.remove(lesson);
    return { message: 'Lesson deleted successfully' };
  }

  async createLessons(createLessonDtos: CreateLessonDto[]) {
    const results = [];
    for (const dto of createLessonDtos) {
      results.push(await this.createLesson(dto));
    }
    return results;
  }

  async reorderLessons(courseId: number, lessonIds: number[]) {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Validate all lessons exist and belong to this course
    const lessons = await this.lessonRepository.find({
      where: { id: In(lessonIds), courseId }
    });

    if (lessons.length !== lessonIds.length) {
      throw new BadRequestException('Some lesson IDs are invalid or do not belong to this course');
    }

    // Update order indexes
    const updates = lessonIds.map((id, index) => {
      return this.lessonRepository.update(id, { orderIndex: index });
    });

    await Promise.all(updates);

    return {
      message: 'Lessons reordered successfully',
      order: lessonIds
    };
  }
} 