import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { SubmitPracticeExerciseDto } from './dto/submit-practice-exercise.dto';
import { MarkLessonViewedDto } from './dto/mark-lesson-viewed.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CertificateService } from './service/certificate.service';
import { ExamService } from './service/exam.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly certificateService: CertificateService,
    private readonly examService: ExamService
  ) {}

  @Get('courses/published')
  @Public()
  async getPublishedCourses() {
    return this.userService.getPublishedCourses();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.userService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses')
  getEnrolledCourses(@Request() req) {
    return this.userService.getEnrolledCourses(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses/enroll')
  enrollCourse(@Request() req, @Body() enrollCourseDto: EnrollCourseDto) {
    return this.userService.enrollCourse(req.user.userId, enrollCourseDto.courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId')
  getCourseDetails(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getCourseDetails(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/exam')
  getExam(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getExam(req.user.userId, courseId);
  }

  @Post('exam/submit/:courseId')
  @UseGuards(JwtAuthGuard)
  async submitExam(
    @Request() req,
    @Param('courseId') courseId: number,
    @Body() submitExamDto: SubmitExamDto
  ) {
    const examAttempt = await this.userService.getActiveExamAttempt(
      req.user.userId,
      courseId
    );
    
    return this.userService.submitExam(
      req.user.userId,
      courseId,
      examAttempt.id,
      submitExamDto.answers
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/exam/results')
  getExamResults(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getExamResults(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/exam/start')
  startExam(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.startExam(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/exam/time-remaining')
  getExamTimeRemaining(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getExamTimeRemaining(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('exams/history')
  getExamHistory(@Request() req) {
    return this.userService.getExamHistory(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/exams/history')
  getCourseExamHistory(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getCourseExamHistory(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/lessons/:lessonId/view')
  markLessonViewed(
    @Request() req, 
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() markLessonViewedDto: MarkLessonViewedDto
  ) {
    return this.userService.markLessonViewed(
      req.user.userId, 
      courseId, 
      lessonId, 
      markLessonViewedDto.timeSpentSeconds
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/lessons/:lessonId/complete')
  markLessonCompleted(
    @Request() req, 
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number
  ) {
    return this.userService.markLessonCompleted(req.user.userId, courseId, lessonId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/lessons/:lessonId/exercises/:exerciseId/submit')
  submitPracticeExercise(
    @Request() req, 
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() submitPracticeExerciseDto: SubmitPracticeExerciseDto
  ) {
    return this.userService.submitPracticeExercise(
      req.user.userId, 
      courseId, 
      lessonId, 
      exerciseId, 
      submitPracticeExerciseDto.submittedCode
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/progress')
  getCourseProgress(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getCourseProgress(req.user.userId, courseId);
  }

  @Get('roadmaps')
  @Public()
  async getRoadmaps() {
    return this.userService.getRoadmaps();
  }

  @Get('roadmaps/:id')
  @Public()
  async getRoadmapById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getRoadmapById(id);
  }

  @Get('roadmaps/category/:categoryId')
  @Public()
  async getRoadmapsByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.userService.getRoadmapsByCategory(categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/exam/questions')
  getExamQuestions(@Request() req, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.userService.getExamQuestions(req.user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('certificates')
  getUserCertificates(@Request() req) {
    return this.certificateService.getUserCertificates(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('certificates/:id')
  getCertificateById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.certificateService.getCertificateById(id);
  }

  @Public()
  @Get('certificates/verify/:certificateNumber')
  verifyCertificate(@Param('certificateNumber') certificateNumber: string) {
    return this.certificateService.verifyCertificate(certificateNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/certificate')
  async generateCertificate(
    @Request() req, 
    @Param('courseId', ParseIntPipe) courseId: number
  ) {
    // Get the latest passing exam attempt
    const latestAttempt = await this.examService.getLatestPassingAttempt(req.user.userId, courseId);
    if (!latestAttempt) {
      throw new NotFoundException('No passing exam attempt found');
    }
    
    return this.certificateService.generateCertificate(
      req.user.userId, 
      courseId, 
      latestAttempt.id
    );
  }
} 