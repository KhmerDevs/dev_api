import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { QCM } from '../entities/qcm.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { Lesson } from '../entities/lesson.entity';
import { PracticeExercise } from '../entities/practice-exercise.entity';
import { LessonCompletion } from '../entities/lesson-completion.entity';
import { PracticeExerciseAttempt } from '../entities/practice-exercise-attempt.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { Roadmap } from '../entities/roadmap.entity';
import { EnrollmentService } from './service/enrollment.service';
import { CourseProgressService } from './service/course-progress.service';
import { ExamService } from './service/exam.service';
import { LessonService } from './service/lesson.service';
import { RoadmapService } from './service/roadmap.service';
import { CertificateService } from './service/certificate.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(QCM)
    private qcmRepository: Repository<QCM>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ExamAttempt)
    private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(PracticeExercise)
    private practiceExerciseRepository: Repository<PracticeExercise>,
    @InjectRepository(LessonCompletion)
    private lessonCompletionRepository: Repository<LessonCompletion>,
    @InjectRepository(PracticeExerciseAttempt)
    private practiceExerciseAttemptRepository: Repository<PracticeExerciseAttempt>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(Roadmap)
    private roadmapRepository: Repository<Roadmap>,
    private enrollmentService: EnrollmentService,
    private courseProgressService: CourseProgressService,
    private examService: ExamService,
    private lessonService: LessonService,
    private roadmapService: RoadmapService,
    private certificateService: CertificateService,
  ) {}

  async getProfile(userId: number) {
    // Get user basic info
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get enrolled courses with progress
    const enrolledCourses = await this.enrollmentService.getEnrolledCoursesWithProgress(userId);

    // Get lesson completion statistics
    const stats = await this.courseProgressService.getUserStats(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      enrolledCourses,
      stats,
    };
  }

  async getEnrolledCourses(userId: number) {
    return this.enrollmentService.getEnrolledCourses(userId);
  }

  async enrollCourse(userId: number, courseId: number) {
    return this.enrollmentService.enrollCourse(userId, courseId);
  }

  async getCourseDetails(userId: number, courseId: number) {
    return this.enrollmentService.getCourseDetails(userId, courseId);
  }

  async getExam(userId: number, courseId: number) {
    return this.examService.getExam(userId, courseId);
  }

  async submitExam(
    userId: number, 
    courseId: number, 
    examAttemptId: number, 
    answers: { qcmId: number; answer: number }[]
  ) {
    return this.examService.submitExam(userId, courseId, examAttemptId, answers);
  }

  async getExamResults(userId: number, courseId: number) {
    return this.examService.getExamResults(userId, courseId);
  }

  async startExam(userId: number, courseId: number) {
    return this.examService.startExam(userId, courseId);
  }

  async getExamTimeRemaining(userId: number, courseId: number) {
    return this.examService.getExamTimeRemaining(userId, courseId);
  }

  async getExamHistory(userId: number) {
    return this.examService.getExamHistory(userId);
  }

  async getCourseExamHistory(userId: number, courseId: number) {
    return this.examService.getCourseExamHistory(userId, courseId);
  }

  async getPublishedCourses() {
    return this.enrollmentService.getPublishedCourses();
  }

  async markLessonViewed(userId: number, courseId: number, lessonId: number, timeSpentSeconds?: number) {
    return this.lessonService.markLessonViewed(userId, courseId, lessonId, timeSpentSeconds);
  }

  async markLessonCompleted(userId: number, courseId: number, lessonId: number) {
    return this.lessonService.markLessonCompleted(userId, courseId, lessonId);
  }

  async submitPracticeExercise(
    userId: number, 
    courseId: number, 
    lessonId: number, 
    exerciseId: number, 
    submittedCode: string
  ) {
    return this.lessonService.submitPracticeExercise(userId, courseId, lessonId, exerciseId, submittedCode);
  }

  async getCourseProgress(userId: number, courseId: number) {
    return this.courseProgressService.getCourseProgress(userId, courseId);
  }

  async getRoadmaps() {
    return this.roadmapService.getRoadmaps();
  }

  async getRoadmapById(id: number) {
    return this.roadmapService.getRoadmapById(id);
  }

  async getRoadmapsByCategory(categoryId: number) {
    return this.roadmapService.getRoadmapsByCategory(categoryId);
  }

  async getExamQuestions(userId: number, courseId: number) {
    return this.examService.getExamQuestions(userId, courseId);
  }

  async getUserCertificates(userId: number) {
    return this.certificateService.getUserCertificates(userId);
  }

  async getCertificateById(id: number) {
    return this.certificateService.getCertificateById(id);
  }

  async verifyCertificate(certificateNumber: string) {
    return this.certificateService.verifyCertificate(certificateNumber);
  }

  async generateCertificate(userId: number, courseId: number, examAttemptId: number) {
    return this.certificateService.generateCertificate(userId, courseId, examAttemptId);
  }

  async getActiveExamAttempt(userId: number, courseId: number) {
    const attempt = await this.examService.getActiveExamAttempt(userId, courseId);
    if (!attempt) {
      throw new NotFoundException('No active exam attempt found');
    }
    return attempt;
  }
} 