import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/user/create-user.dto';
import { UpdateUserDto } from './dto/user/update-user.dto';
import { CourseCategory } from '../entities/course_category.entity';
import { CreateCourseCategoryDto } from './dto/course_categories/create-course_catagories';
import { UpdateCourseCategoryDto } from './dto/course_categories/update-course_catagories';
import * as bcrypt from 'bcrypt';
import { Course, DifficultyLevel } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { CodeExample } from '../entities/code-example.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { CreateCourseDto } from './dto/course/create-course.dto';
import { UpdateCourseDto } from './dto/course/update-course.dto';
import { CreateLessonDto } from './dto/lesson/create-lesson.dto';
import { LessonResponseDto } from './dto/lesson/lesson-response.dto';
import { QCM } from '../entities/qcm.entity';
import { CreateQcmDto } from './dto/qcm/create-qcm.dto';
import { Roadmap } from '../entities/roadmap.entity';
import { CreateRoadmapDto } from './dto/roadmap/create-roadmap.dto';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { UserAdminService } from './service/user-admin.service';
import { CategoryAdminService } from './service/category-admin.service';
import { CourseAdminService } from './service/course-admin.service';
import { LessonAdminService } from './service/lesson-admin.service';
import { ExamAdminService } from './service/exam-admin.service';
import { RoadmapAdminService } from './service/roadmap-admin.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CourseCategory)
    private courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(CodeExample)
    private codeExampleRepository: Repository<CodeExample>,
    @InjectRepository(PracticeExercise)
    private practiceExerciseRepository: Repository<PracticeExercise>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(Roadmap)
    private roadmapRepository: Repository<Roadmap>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    private userAdminService: UserAdminService,
    private categoryAdminService: CategoryAdminService,
    private courseAdminService: CourseAdminService,
    private lessonAdminService: LessonAdminService,
    private examAdminService: ExamAdminService,
    private roadmapAdminService: RoadmapAdminService,
  ) {}

  // User methods
  getAllUsers() { 
    return this.userAdminService.getAllUsers(); 
  }
  
  getUser(id: number) { 
    return this.userAdminService.getUser(id); 
  }
  
  createUser(createUserDto: CreateUserDto) { 
    return this.userAdminService.createUser(createUserDto); 
  }
  
  updateUser(id: number, updateUserDto: UpdateUserDto) { 
    return this.userAdminService.updateUser(id, updateUserDto); 
  }
  
  deleteUser(id: number) { 
    return this.userAdminService.deleteUser(id); 
  }
  
  getDashboardStats() { 
    return this.userAdminService.getDashboardStats(); 
  }
  
  getAdminProfile(adminId: number) { 
    return this.userAdminService.getAdminProfile(adminId); 
  }

  // Category methods
  createCourseCategory(createCourseCategoryDto: CreateCourseCategoryDto) { 
    return this.categoryAdminService.createCourseCategory(createCourseCategoryDto); 
  }
  
  updateCourseCategory(id: number, updateCourseCategoryDto: UpdateCourseCategoryDto) { 
    return this.categoryAdminService.updateCourseCategory(id, updateCourseCategoryDto); 
  }
  
  deleteCourseCategory(id: number) { 
    return this.categoryAdminService.deleteCourseCategory(id); 
  }
  
  getAllCourseCategories() { 
    return this.categoryAdminService.getAllCourseCategories(); 
  }
  
  getCourseCategory(id: number) { 
    return this.categoryAdminService.getCourseCategory(id); 
  }

  // Course methods
  createCourse(createCourseDto: CreateCourseDto) { 
    return this.courseAdminService.createCourse(createCourseDto); 
  }
  
  getAllCourses() { 
    return this.courseAdminService.getAllCourses(); 
  }
  
  getCourse(id: number) { 
    return this.courseAdminService.getCourse(id); 
  }
  
  updateCourse(id: number, updateCourseDto: UpdateCourseDto) { 
    return this.courseAdminService.updateCourse(id, updateCourseDto); 
  }
  
  deleteCourse(id: number) { 
    return this.courseAdminService.deleteCourse(id); 
  }
  
  publishCourse(id: number) { 
    return this.courseAdminService.publishCourse(id); 
  }

  // Lesson methods
  createLesson(createLessonDto: CreateLessonDto) { 
    return this.lessonAdminService.createLesson(createLessonDto); 
  }
  
  getLessonById(id: number) { 
    return this.lessonAdminService.getLessonById(id); 
  }
  
  updateLesson(id: number, updateLessonDto: any) { 
    return this.lessonAdminService.updateLesson(id, updateLessonDto); 
  }
  
  deleteLesson(id: number) { 
    return this.lessonAdminService.deleteLesson(id); 
  }
  
  createLessons(createLessonDtos: CreateLessonDto[]) { 
    return this.lessonAdminService.createLessons(createLessonDtos); 
  }
  
  reorderLessons(courseId: number, lessonIds: number[]) { 
    return this.lessonAdminService.reorderLessons(courseId, lessonIds); 
  }

  // Exam methods
  createQcm(createQcmDto: CreateQcmDto) { 
    return this.examAdminService.createQcm(createQcmDto); 
  }
  
  getCourseQcms(courseId: number) { 
    return this.examAdminService.getCourseQcms(courseId); 
  }
  
  deleteQcm(courseId: number, questionNumber: number) { 
    return this.examAdminService.deleteQcm(courseId, questionNumber); 
  }
  
  reorderQcms(courseId: number, qcmIds: number[]) { 
    return this.examAdminService.reorderQcms(courseId, qcmIds); 
  }
  
  updateQcm(courseId: number, questionNumber: number, updateQcmDto: CreateQcmDto) { 
    return this.examAdminService.updateQcm(courseId, questionNumber, updateQcmDto); 
  }
  
  createQcmsBatch(createQcmDtos: CreateQcmDto[]) { 
    return this.examAdminService.createQcmsBatch(createQcmDtos); 
  }
  
  getAllExamResults(courseId?: number, userId?: number) { 
    return this.examAdminService.getAllExamResults(courseId, userId); 
  }
  
  getExamResultById(id: number) { 
    return this.examAdminService.getExamResultById(id); 
  }

  // Roadmap methods
  createRoadmap(createRoadmapDto: CreateRoadmapDto) { 
    return this.roadmapAdminService.createRoadmap(createRoadmapDto); 
  }
  
  getAllRoadmaps() { 
    return this.roadmapAdminService.getAllRoadmaps(); 
  }
  
  getRoadmap(id: number) { 
    return this.roadmapAdminService.getRoadmap(id); 
  }
  
  updateRoadmap(id: number, updateRoadmapDto: CreateRoadmapDto) { 
    return this.roadmapAdminService.updateRoadmap(id, updateRoadmapDto); 
  }
  
  deleteRoadmap(id: number) { 
    return this.roadmapAdminService.deleteRoadmap(id); 
  }
  
  saveRoadmapImageUrl(id: number, imageUrl: string) { 
    return this.roadmapAdminService.saveRoadmapImageUrl(id, imageUrl); 
  }
  
  publishRoadmap(id: number) { 
    return this.roadmapAdminService.publishRoadmap(id); 
  }
} 