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
  ) {}


  async getAllUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });
    return users;
  }

  async getUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    
    const { password, ...result } = user;
    return result;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateUserDto);
    
    return this.getUser(id);
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async getDashboardStats() {
    const totalUsers = await this.userRepository.count();
    const adminUsers = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
    const regularUsers = await this.userRepository.count({ where: { role: UserRole.USER } });
    
    const recentUsers = await this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      recentUsers,
    };
  }

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
    return this.courseCategoryRepository.findOne({ where: { id } });
  }

  async createCourse(createCourseDto: CreateCourseDto) {
    const category = await this.courseCategoryRepository.findOne({ 
      where: { id: createCourseDto.categoryId } 
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      category,
      isPublished: false
    });

    return this.courseRepository.save(course);
  }

  async getAllCourses() {
    // Use a query builder to get courses with enrollment counts
    const coursesWithEnrollments = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoin('course.enrollments', 'enrollment')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollmentCount')
      .groupBy('course.id')
      .addGroupBy('category.id')
      .getRawAndEntities();

    // Map the raw results (with count) to the entities
    return coursesWithEnrollments.entities.map((course, index) => {
      const rawResult = coursesWithEnrollments.raw[index];
      return {
        ...course,
        enrollmentCount: parseInt(rawResult.enrollmentCount) || 0
      };
    });
  }

  private transformLessonResponse(lesson: Lesson, orderIndex: number): LessonResponseDto {
    return {
      lessonNumber: orderIndex,
      title: lesson.title,
      content: lesson.content,
      codeExamples: lesson.codeExamples
        ?.sort((a, b) => a.orderIndex - b.orderIndex)
        ?.map((example, index) => ({
          exampleNumber: index + 1,  // Sequential number for code examples
          title: example.title,
          programmingLanguage: example.programmingLanguage,
          code: example.code,
          explanation: example.explanation,
          orderIndex: example.orderIndex
        })),
      practiceExercises: lesson.practiceExercises
        ?.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        ?.map((exercise, index) => ({
          exerciseNumber: index + 1,  // Sequential number for exercises
          id: exercise.id,  // Include id for reference
          instructions: exercise.instructions,
          starterCode: exercise.starterCode,
          solution: exercise.solution,  // Explicitly include solution
          isEnabled: exercise.isEnabled,
          orderIndex: exercise.orderIndex || 0
        })),
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt
    };
  }

  async getCourse(id: number) {
    const courseWithEnrollments = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.lessons', 'lessons')
      .leftJoinAndSelect('lessons.codeExamples', 'codeExamples')
      .leftJoinAndSelect('lessons.practiceExercises', 'practiceExercises')
      .leftJoin('course.enrollments', 'enrollment')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollmentCount')
      .where('course.id = :id', { id })
      .groupBy('course.id')
      .addGroupBy('category.id')
      .addGroupBy('lessons.id')
      .addGroupBy('codeExamples.id')
      .addGroupBy('practiceExercises.id')
      .getRawAndEntities();

    if (courseWithEnrollments.entities.length === 0) {
      throw new NotFoundException('Course not found');
    }

    const course = courseWithEnrollments.entities[0];
    const enrollmentCount = parseInt(courseWithEnrollments.raw[0]?.enrollmentCount) || 0;

    // Sort lessons by orderIndex
    course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);

    // Transform lessons to have sequential numbers
    const transformedLessons = course.lessons.map((lesson, index) => 
      this.transformLessonResponse(lesson, index + 1)
    );

    return {
      ...course,
      enrollmentCount,
      lessons: transformedLessons
    };
  }

  async updateCourse(id: number, updateCourseDto: UpdateCourseDto) {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (updateCourseDto.categoryId) {
      const category = await this.courseCategoryRepository.findOne({ 
        where: { id: updateCourseDto.categoryId } 
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    await this.courseRepository.update(id, updateCourseDto);
    return this.getCourse(id);
  }

  async deleteCourse(id: number) {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['lessons', 'lessons.codeExamples', 'lessons.practiceExercises']
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Delete related entities in proper order - first delete lessons
    if (course.lessons && course.lessons.length > 0) {
      for (const lesson of course.lessons) {
        // Delete code examples
        if (lesson.codeExamples && lesson.codeExamples.length > 0) {
          await this.codeExampleRepository.remove(lesson.codeExamples);
        }
        
        // Delete practice exercises
        if (lesson.practiceExercises && lesson.practiceExercises.length > 0) {
          await this.practiceExerciseRepository.remove(lesson.practiceExercises);
        }
      }
      
      // Now delete the lessons
      await this.lessonRepository.remove(course.lessons);
    }

    // Finally delete the course
    await this.courseRepository.remove(course);
    return { message: 'Course deleted successfully' };
  }

  async publishCourse(id: number) {
    const course = await this.courseRepository.findOne({ 
      where: { id },
      relations: ['lessons']
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    if (course.lessons.length === 0) {
      throw new ConflictException('Cannot publish a course without lessons');
    }
    
    await this.courseRepository.update(id, { isPublished: true });
    return this.getCourse(id);
  }

  async createLesson(createLessonDto: CreateLessonDto) {
    const course = await this.courseRepository.findOne({ 
      where: { id: createLessonDto.courseId },
      relations: ['lessons']
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get current lessons for this course and sort them
    const currentLessons = course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Calculate the next lesson number for this specific course
    const nextLessonNumber = currentLessons.length > 0 
      ? Math.max(...currentLessons.map(l => l.orderIndex)) + 1 
      : 1;

    const lesson = this.lessonRepository.create({
      title: createLessonDto.title,
      content: createLessonDto.content,
      orderIndex: nextLessonNumber,
      course
    });

    const savedLesson = await this.lessonRepository.save(lesson);

    // Handle code examples with sequential ordering
    if (createLessonDto.codeExamples && createLessonDto.codeExamples.length > 0) {
      for (let i = 0; i < createLessonDto.codeExamples.length; i++) {
        const exampleDto = createLessonDto.codeExamples[i];
        const codeExample = this.codeExampleRepository.create({
          ...exampleDto,
          orderIndex: i + 1,  // Sequential ordering
          lesson: savedLesson
        });
        await this.codeExampleRepository.save(codeExample);
      }
    }

    // Handle practice exercises with sequential ordering
    if (createLessonDto.practiceExercises && createLessonDto.practiceExercises.length > 0) {
      for (let i = 0; i < createLessonDto.practiceExercises.length; i++) {
        const exerciseDto = createLessonDto.practiceExercises[i];
        const practiceExercise = this.practiceExerciseRepository.create({
          ...exerciseDto,
          orderIndex: i + 1,  // Sequential ordering
          lesson: savedLesson
        });
        await this.practiceExerciseRepository.save(practiceExercise);
      }
    }

    return this.getLessonById(savedLesson.id);
  }

  async getLessonById(id: number) {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course', 'codeExamples', 'practiceExercises'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Get all lessons for this course to determine the lesson number
    const courseLessons = await this.lessonRepository.find({
      where: { courseId: lesson.courseId },
      order: { orderIndex: 'ASC' }
    });

    const lessonIndex = courseLessons.findIndex(l => l.id === lesson.id);
    return this.transformLessonResponse(lesson, lessonIndex + 1);
  }

  async updateLesson(id: number, updateLessonDto: any) {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.lessonRepository.update(id, {
      title: updateLessonDto.title,
      content: updateLessonDto.content,
      orderIndex: updateLessonDto.orderIndex
    });

    return this.getLessonById(id);
  }

  async deleteLesson(id: number) {
    // Validate that id is a valid number
    if (isNaN(id) || !Number.isInteger(Number(id)) || id <= 0) {
      throw new BadRequestException('Lesson ID must be a positive integer');
    }

    // Get the lesson first to verify it exists
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    const courseId = lesson.courseId;
    const courseWithLessons = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.lessons', 'lesson')
      .where('course.id = :courseId', { courseId })
      .getOne();

    // Remove the lesson and update order indexes
    await this.lessonRepository.remove(lesson);

    // If there are other lessons, update their order
    if (courseWithLessons && courseWithLessons.lessons) {
      const remainingLessons = courseWithLessons.lessons
        .filter(l => l.id !== id) // Filter out the deleted lesson
        .sort((a, b) => a.orderIndex - b.orderIndex);

      // Update order indexes to be sequential
      for (let i = 0; i < remainingLessons.length; i++) {
        await this.lessonRepository.update(
          remainingLessons[i].id,
          { orderIndex: i + 1 }
        );
      }
    }

    return { message: 'Lesson deleted successfully' };
  }

  async createLessons(createLessonDtos: CreateLessonDto[]) {
    const results = [];
    
    // Group lessons by courseId
    const lessonsByCourse = createLessonDtos.reduce((acc, dto) => {
      if (!acc[dto.courseId]) {
        acc[dto.courseId] = [];
      }
      acc[dto.courseId].push(dto);
      return acc;
    }, {});

    // Process each course's lessons in order
    for (const courseId in lessonsByCourse) {
      const courseLessons = lessonsByCourse[courseId];
      for (const lessonDto of courseLessons) {
        const lesson = await this.createLesson(lessonDto);
        results.push(lesson);
      }
    }
    
    return results;
  }

  // Add a method to reorder lessons
  async reorderLessons(courseId: number, lessonIds: number[]) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['lessons']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify all lessons belong to this course
    for (const lessonId of lessonIds) {
      const lesson = course.lessons.find(l => l.id === lessonId);
      if (!lesson) {
        throw new NotFoundException(`Lesson ${lessonId} not found in course ${courseId}`);
      }
    }

    // Update order indices
    for (let i = 0; i < lessonIds.length; i++) {
      await this.lessonRepository.update(
        { id: lessonIds[i] },
        { orderIndex: i + 1 }
      );
    }

    return this.getCourse(courseId);
  }

  // Get QCMs for a course
  async getCourseQcms(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort QCMs by orderIndex and transform response
    return course.qcms
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((qcm, index) => ({
        id: index + 1,  // Sequential ID starting from 1 for each course
        question: qcm.question,
        options: qcm.options,
        correctAnswer: qcm.correctAnswer,
        orderIndex: qcm.orderIndex
      }));
  }

  // Create QCM with sequential ID
  async createQcm(createQcmDto: CreateQcmDto) {
    const course = await this.courseRepository.findOne({
      where: { id: createQcmDto.courseId },
      relations: ['qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get current QCMs for this course and sort them
    const currentQcms = course.qcms.sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Calculate the next QCM number for this specific course
    const nextQcmNumber = currentQcms.length > 0 
      ? Math.max(...currentQcms.map(q => q.orderIndex)) + 1 
      : 1;

    const qcm = this.qcmRepository.create({
      ...createQcmDto,
      orderIndex: nextQcmNumber,
      course
    });

    const savedQcm = await this.qcmRepository.save(qcm);

    // Return transformed response
    return {
      id: nextQcmNumber,  // Use the sequential number as ID
      question: savedQcm.question,
      options: savedQcm.options,
      correctAnswer: savedQcm.correctAnswer,
      orderIndex: savedQcm.orderIndex
    };
  }

  // Update QCM using courseId and questionNumber
  async updateQcm(courseId: number, questionNumber: number, updateQcmDto: CreateQcmDto) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort QCMs and find the one we want to update
    const sortedQcms = course.qcms.sort((a, b) => a.orderIndex - b.orderIndex);
    const qcmToUpdate = sortedQcms[questionNumber - 1];

    if (!qcmToUpdate) {
      throw new NotFoundException(`Question number ${questionNumber} not found in course ${courseId}`);
    }

    // Update the QCM
    await this.qcmRepository.update(qcmToUpdate.id, {
      question: updateQcmDto.question,
      options: updateQcmDto.options,
      correctAnswer: updateQcmDto.correctAnswer
    });

    // Return the updated question
    return {
      id: questionNumber,
      question: updateQcmDto.question,
      options: updateQcmDto.options,
      correctAnswer: updateQcmDto.correctAnswer,
      orderIndex: qcmToUpdate.orderIndex
    };
  }

  // Delete QCM using courseId and questionNumber
  async deleteQcm(courseId: number, questionNumber: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort QCMs and find the one we want to delete
    const sortedQcms = course.qcms.sort((a, b) => a.orderIndex - b.orderIndex);
    const qcmToDelete = sortedQcms[questionNumber - 1];

    if (!qcmToDelete) {
      throw new NotFoundException(`Question number ${questionNumber} not found in course ${courseId}`);
    }

    await this.qcmRepository.remove(qcmToDelete);

    // Reorder remaining questions
    const remainingQcms = course.qcms
      .filter(q => q.id !== qcmToDelete.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    for (let i = 0; i < remainingQcms.length; i++) {
      await this.qcmRepository.update(remainingQcms[i].id, { orderIndex: i + 1 });
    }

    return { message: `Question ${questionNumber} deleted successfully from course ${courseId}` };
  }

  // Reorder QCMs
  async reorderQcms(courseId: number, qcmIds: number[]) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['qcms']
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Update order indices
    for (let i = 0; i < qcmIds.length; i++) {
      await this.qcmRepository.update(
        { id: qcmIds[i] },
        { orderIndex: i + 1 }
      );
    }

    return this.getCourseQcms(courseId);
  }

  // Create roadmap
  async createRoadmap(createRoadmapDto: CreateRoadmapDto) {
    const category = await this.courseCategoryRepository.findOne({ 
      where: { id: createRoadmapDto.categoryId } 
    });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const roadmap = this.roadmapRepository.create({
      ...createRoadmapDto,
      category
    });

    return this.roadmapRepository.save(roadmap);
  }

  // Get all roadmaps
  async getAllRoadmaps() {
    return this.roadmapRepository.find({
      relations: ['category']
    });
  }

  // Get roadmap by id
  async getRoadmap(id: number) {
    const roadmap = await this.roadmapRepository.findOne({
      where: { id },
      relations: ['category']
    });

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    return roadmap;
  }

  // Update roadmap
  async updateRoadmap(id: number, updateRoadmapDto: CreateRoadmapDto) {
    const roadmap = await this.roadmapRepository.findOne({ where: { id } });
    
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    if (updateRoadmapDto.categoryId) {
      const category = await this.courseCategoryRepository.findOne({ 
        where: { id: updateRoadmapDto.categoryId } 
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    await this.roadmapRepository.update(id, updateRoadmapDto);
    return this.getRoadmap(id);
  }

  // Delete roadmap
  async deleteRoadmap(id: number) {
    const roadmap = await this.roadmapRepository.findOne({ where: { id } });
    
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.roadmapRepository.remove(roadmap);
    return { message: 'Roadmap deleted successfully' };
  }

  // Save image URL
  async saveRoadmapImageUrl(id: number, imageUrl: string) {
    const roadmap = await this.roadmapRepository.findOne({ where: { id } });
    
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    await this.roadmapRepository.update(id, { imageUrl });
    return this.getRoadmap(id);
  }

  async createQcmsBatch(createQcmDtos: CreateQcmDto[]) {
    const savedQcms = [];
    for (const dto of createQcmDtos) {
      const qcm = this.qcmRepository.create(dto);
      savedQcms.push(await this.qcmRepository.save(qcm));
    }
    return savedQcms;
  }

  async getAllExamResults(courseId?: number, userId?: number) {
    // Build the query with optional filters
    const query: any = {};
    
    if (courseId) {
      query.courseId = courseId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    const examAttempts = await this.examAttemptRepository.find({
      where: query,
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' }
    });
    
    // Format the results to include user and course info
    return examAttempts.map(attempt => ({
      id: attempt.id,
      user: {
        id: attempt.user.id,
        name: attempt.user.name,
        email: attempt.user.email
      },
      course: {
        id: attempt.course.id,
        title: attempt.course.title
      },
      score: attempt.score,
      passed: attempt.passed,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationInSeconds: attempt.durationInSeconds,
      createdAt: attempt.createdAt
    }));
  }

  async getExamResultById(id: number) {
    const examAttempt = await this.examAttemptRepository.findOne({
      where: { id },
      relations: ['user', 'course']
    });
    
    if (!examAttempt) {
      throw new NotFoundException('Exam attempt not found');
    }
    
    return {
      id: examAttempt.id,
      user: {
        id: examAttempt.user.id,
        name: examAttempt.user.name,
        email: examAttempt.user.email
      },
      course: {
        id: examAttempt.course.id,
        title: examAttempt.course.title
      },
      score: examAttempt.score,
      passed: examAttempt.passed,
      answers: examAttempt.answers,
      startedAt: examAttempt.startedAt,
      submittedAt: examAttempt.submittedAt,
      durationInSeconds: examAttempt.durationInSeconds,
      createdAt: examAttempt.createdAt
    };
  }

  async getAdminProfile(adminId: number) {
    // Get the admin user
    const admin = await this.userRepository.findOne({
      where: { id: adminId, role: UserRole.ADMIN },
      select: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
    });

    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }

    // Get counts for dashboard-like data
    const totalUsers = await this.userRepository.count();
    const totalCourses = await this.courseRepository.count();
    const totalCategories = await this.courseCategoryRepository.count();
    const publishedCourses = await this.courseRepository.count({ where: { isPublished: true } });
    
    // Get recent activities (could be expanded based on what you want to track)
    const recentExamAttempts = await this.examAttemptRepository.find({
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      admin,
      stats: {
        totalUsers,
        totalCourses,
        totalCategories,
        publishedCourses,
      },
      recentActivity: recentExamAttempts.map(attempt => ({
        id: attempt.id,
        user: {
          id: attempt.user.id,
          name: attempt.user.name,
        },
        course: {
          id: attempt.course.id,
          title: attempt.course.title,
        },
        score: attempt.score,
        passed: attempt.passed,
        createdAt: attempt.createdAt,
      })),
    };
  }
} 