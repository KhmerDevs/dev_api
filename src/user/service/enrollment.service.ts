import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Course } from '../../entities/course.entity';
import { Enrollment } from '../../entities/enrollment.entity';
import { ExamAttempt } from '../../entities/exam-attempt.entity';
import { CourseProgressService } from './course-progress.service';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @Inject(forwardRef(() => CourseProgressService))
    private courseProgressService: CourseProgressService,
  ) {}

  async getEnrolledCourses(userId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.category'],
    });

    return enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      category: enrollment.course.category,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      difficultyLevel: enrollment.course.difficultyLevel,
      progress: enrollment.progress,
      completed: enrollment.completed,
      enrolledAt: enrollment.createdAt,
    }));
  }

  async getEnrolledCoursesWithProgress(userId: number) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.category'],
    });

    return enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      categoryId: enrollment.course.categoryId,
      categoryName: enrollment.course.category?.name,
      progress: enrollment.progress,
      completed: enrollment.completed,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      backgroundColor: enrollment.course.backgroundColor,
      enrolledAt: enrollment.createdAt
    }));
  }

  async enrollCourse(userId: number, courseId: number) {
    this.logger.log(`Attempting to enroll user ${userId} in course ${courseId}`);
    
    // Check if course exists at all first
    const courseExists = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    
    if (!courseExists) {
      this.logger.warn(`Course ${courseId} does not exist`);
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    
    // Then check if it's published
    if (!courseExists.isPublished) {
      this.logger.warn(`Course ${courseId} exists but is not published`);
      throw new ForbiddenException(`Course with ID ${courseId} is not available for enrollment`);
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (existingEnrollment) {
      throw new ConflictException('Already enrolled in this course');
    }

    // Get all enrollments for this user
    const userEnrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    // Get exam attempts that were passed
    const passedExams = await this.examAttemptRepository.find({
      where: { userId, passed: true },
      select: ['courseId']
    });

    // Count unique courseIds in passed exams using JavaScript's Set
    const uniquePassedCourses = [...new Set(passedExams.map(exam => exam.courseId))].length;
    
    // Calculate enrollment limit (base 5 + number of passed courses)
    const enrollmentLimit = 5 + uniquePassedCourses;
    
    // Check if user has reached the limit
    if (userEnrollments.length >= enrollmentLimit) {
      throw new ForbiddenException(
        `You can enroll in a maximum of ${enrollmentLimit} courses. Please complete some of your current courses before enrolling in new ones.`
      );
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      progress: 0,
      completed: false,
    });

    await this.enrollmentRepository.save(enrollment);

    return {
      message: 'Successfully enrolled in course',
      courseId,
      courseTitle: courseExists.title,
      enrollmentsRemaining: enrollmentLimit - userEnrollments.length - 1
    };
  }

  async getCourseDetails(userId: number, courseId: number) {
    // Check if enrolled
    await this.checkEnrollment(userId, courseId);

    // Get course details
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['category', 'lessons', 'lessons.codeExamples', 'lessons.practiceExercises'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Sort lessons by orderIndex
    course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);

    // Format response
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      difficultyLevel: course.difficultyLevel,
      prerequisites: course.prerequisites,
      learningObjectives: course.learningObjectives,
      thumbnailUrl: course.thumbnailUrl,
      lessons: course.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        orderIndex: lesson.orderIndex,
        codeExamples: lesson.codeExamples?.map(code => ({
          id: code.id,
          title: code.title,
          programmingLanguage: code.programmingLanguage,
          code: code.code,
          explanation: code.explanation,
        })) || [],
        practiceExercises: lesson.practiceExercises?.map(exercise => ({
          id: exercise.id,
          instructions: exercise.instructions,
          starterCode: exercise.starterCode,
          isEnabled: exercise.isEnabled,
        })) || [],
      })),
      examDuration: course.examDuration,
      examPassScore: course.examPassScore,
    };
  }

  async getPublishedCourses() {
    const courses = await this.courseRepository.find({
      where: { isPublished: true },
      relations: ['category'],
      order: { createdAt: 'DESC' }
    });

    return courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      difficultyLevel: course.difficultyLevel,
      thumbnailUrl: course.thumbnailUrl,
      categoryId: course.categoryId,
      category: course.category,
      sampleCodes: course.sampleCodes,
      backgroundColor: course.backgroundColor,
      createdAt: course.createdAt
    }));
  }

  // Helper method to check if user is enrolled in a course
  async checkEnrollment(userId: number, courseId: number) {
    // Convert and validate parameters
    userId = +userId;
    courseId = +courseId;

    if (isNaN(userId) || isNaN(courseId)) {
      throw new BadRequestException('Invalid user ID or course ID');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { 
        userId: userId,
        courseId: courseId 
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return enrollment;
  }
} 