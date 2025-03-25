import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCategory } from '../../entities/course_category.entity';
import { Course } from '../../entities/course.entity';
import { CreateCourseCategoryDto } from '../dto/course_categories/create-course_catagories';
import { UpdateCourseCategoryDto } from '../dto/course_categories/update-course_catagories';

@Injectable()
export class CategoryAdminService {
  constructor(
    @InjectRepository(CourseCategory)
    private courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async createCourseCategory(createCourseCategoryDto: CreateCourseCategoryDto) {
    const courseCategory = this.courseCategoryRepository.create(createCourseCategoryDto);
    return this.courseCategoryRepository.save(courseCategory);
  }

  async updateCourseCategory(id: number, updateCourseCategoryDto: UpdateCourseCategoryDto) {
    const courseCategory = await this.courseCategoryRepository.findOne({ where: { id } });

    if (!courseCategory) {
      throw new NotFoundException('Course category not found');
    }
    
    await this.courseCategoryRepository.update(id, updateCourseCategoryDto);
    return this.getCourseCategory(id);
  }

  async deleteCourseCategory(id: number) {
    // First check if there are any courses using this category
    const coursesUsingCategory = await this.courseRepository.count({
      where: { categoryId: id }
    });

    if (coursesUsingCategory > 0) {
      throw new ConflictException(
        `Cannot delete this category because it's being used by ${coursesUsingCategory} course(s). Please reassign or delete these courses first.`
      );
    }

    const courseCategory = await this.courseCategoryRepository.findOne({ where: { id } });

    if (!courseCategory) {
      throw new NotFoundException('Course category not found');
    }

    await this.courseCategoryRepository.remove(courseCategory);
    return { message: 'Course category deleted successfully' };
  }

  async getAllCourseCategories() {
    return this.courseCategoryRepository.find();
  }

  async getCourseCategory(id: number) {
    const courseCategory = await this.courseCategoryRepository.findOne({ where: { id } });

    if (!courseCategory) {
      throw new NotFoundException('Course category not found');
    }

    return courseCategory;
  }
} 