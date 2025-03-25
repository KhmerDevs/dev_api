import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { CourseCategory } from '../../entities/course_category.entity';
import { CreateCourseDto } from '../dto/course/create-course.dto';
import { UpdateCourseDto } from '../dto/course/update-course.dto';

@Injectable()
export class CourseAdminService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseCategory)
    private courseCategoryRepository: Repository<CourseCategory>,
  ) {}

  async createCourse(createCourseDto: CreateCourseDto) {
    // Validate category exists
    const category = await this.courseCategoryRepository.findOne({
      where: { id: createCourseDto.categoryId }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${createCourseDto.categoryId} not found`);
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      isPublished: false, // Default to unpublished
    });

    return this.courseRepository.save(course);
  }

  async getAllCourses() {
    return this.courseRepository.find({
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });
  }

  async getCourse(id: number) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['category', 'lessons', 'lessons.codeExamples', 'lessons.practiceExercises']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort lessons by orderIndex
    if (course.lessons) {
      course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return course;
  }

  async updateCourse(id: number, updateCourseDto: UpdateCourseDto) {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If category is being updated, validate it exists
    if (updateCourseDto.categoryId) {
      const category = await this.courseCategoryRepository.findOne({
        where: { id: updateCourseDto.categoryId }
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${updateCourseDto.categoryId} not found`);
      }
    }

    await this.courseRepository.update(id, updateCourseDto);
    return this.getCourse(id);
  }

  async deleteCourse(id: number) {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.courseRepository.remove(course);
    return { message: 'Course deleted successfully' };
  }

  async publishCourse(id: number) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['lessons', 'qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Validate course has lessons
    if (!course.lessons || course.lessons.length === 0) {
      throw new BadRequestException('Cannot publish a course without lessons');
    }

    // Validate course has exam questions
    if (!course.qcms || course.qcms.length === 0) {
      throw new BadRequestException('Cannot publish a course without exam questions');
    }

    // Toggle published status
    course.isPublished = !course.isPublished;
    await this.courseRepository.save(course);

    return {
      id: course.id,
      isPublished: course.isPublished,
      message: course.isPublished ? 'Course published successfully' : 'Course unpublished'
    };
  }
} 