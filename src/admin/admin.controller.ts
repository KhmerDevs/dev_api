import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateUserDto } from './dto/user/create-user.dto';
import { UpdateUserDto } from './dto/user/update-user.dto';
import { CreateCourseCategoryDto } from './dto/course_categories/create-course_catagories';
import { UpdateCourseCategoryDto } from './dto/course_categories/update-course_catagories';
import { CreateCourseDto } from './dto/course/create-course.dto';
import { UpdateCourseDto } from './dto/course/update-course.dto';
import { CreateLessonDto } from './dto/lesson/create-lesson.dto';
import { CreateQcmDto } from './dto/qcm/create-qcm.dto';
import { CreateRoadmapDto } from './dto/roadmap/create-roadmap.dto';
import { UserRole } from '../entities/user.entity';
import { CreateQcmBatchDto } from './dto/qcm/create-qcm-batch.dto';
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  getUser(@Param('id') id: number) {
    return this.adminService.getUser(id);
  }

  @Post('users')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Post('users/admin')
  createAdminUser(@Body() createUserDto: CreateUserDto) {
    // Ensure role is ADMIN regardless of input
    createUserDto.role = UserRole.ADMIN;
    return this.adminService.createUser(createUserDto);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: number) {
    return this.adminService.deleteUser(id);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Post('course-categories')
  createCourseCategory(@Body() createCourseCategoryDto: CreateCourseCategoryDto) {
    return this.adminService.createCourseCategory(createCourseCategoryDto);
  }

  @Put('course-categories/:id')
  updateCourseCategory(@Param('id') id: number, @Body() updateCourseCategoryDto: UpdateCourseCategoryDto) {
    return this.adminService.updateCourseCategory(id, updateCourseCategoryDto);
  }

  @Delete('course-categories/:id')
  deleteCourseCategory(@Param('id') id: number) {
    return this.adminService.deleteCourseCategory(id);
  }

  @Get('course-categories')
  getAllCourseCategories() {
    return this.adminService.getAllCourseCategories();
  } 

  @Get('course-categories/:id')
  getCourseCategory(@Param('id') id: number) {
    return this.adminService.getCourseCategory(id);
  }

  @Post('courses')
  createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.adminService.createCourse(createCourseDto);
  }

  @Get('courses')
  getAllCourses() {
    return this.adminService.getAllCourses();
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: number) {
    return this.adminService.getCourse(id);
  }

  @Put('courses/:id')
  updateCourse(@Param('id') id: number, @Body() updateCourseDto: UpdateCourseDto) {
    return this.adminService.updateCourse(id, updateCourseDto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: number) {
    return this.adminService.deleteCourse(id);
  }

  @Post('courses/:id/publish')
  publishCourse(@Param('id') id: number) {
    return this.adminService.publishCourse(id);
  }

  @Post('lessons')
  createLesson(@Body() createLessonDto: CreateLessonDto) {
    return this.adminService.createLesson(createLessonDto);
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: number) {
    return this.adminService.getLessonById(id);
  }

  @Put('lessons/:id')
  updateLesson(@Param('id') id: number, @Body() updateLessonDto: any) {
    return this.adminService.updateLesson(id, updateLessonDto);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: number) {
    return this.adminService.deleteLesson(id);
  }

  @Post('lessons/batch')
  createLessons(@Body() createLessonDtos: CreateLessonDto[]) {
    return this.adminService.createLessons(createLessonDtos);
  }

  @Post('upload-image-url')
  async saveImageUrl(@Body() body: { imageUrl: string }) {
    // Optional: validate the URL format or check if it's accessible
    return { url: body.imageUrl };
  }

  @Put('courses/:id/reorder-lessons')
  async reorderLessons(
    @Param('id') courseId: number,
    @Body() body: { lessonIds: number[] }
  ) {
    return this.adminService.reorderLessons(courseId, body.lessonIds);
  }

  @Post('courses/:id/qcms')
  createQcm(
    @Param('id') courseId: number,
    @Body() createQcmDto: CreateQcmDto
  ) {
    createQcmDto.courseId = courseId;
    return this.adminService.createQcm(createQcmDto);
  }

  @Get('courses/:id/qcms')
  getCourseQcms(@Param('id') courseId: number) {
    return this.adminService.getCourseQcms(courseId);
  }

  @Delete('courses/:courseId/qcms/:questionNumber')
  deleteQcm(
    @Param('courseId') courseId: number,
    @Param('questionNumber') questionNumber: number,
  ) {
    return this.adminService.deleteQcm(courseId, questionNumber);
  }

  @Put('courses/:id/reorder-qcms')
  reorderQcms(
    @Param('id') courseId: number,
    @Body() body: { qcmIds: number[] }
  ) {
    return this.adminService.reorderQcms(courseId, body.qcmIds);
  }

  @Put('courses/:courseId/qcms/:questionNumber')
  updateQcm(
    @Param('courseId') courseId: number,
    @Param('questionNumber') questionNumber: number,
    @Body() updateQcmDto: CreateQcmDto
  ) {
    return this.adminService.updateQcm(courseId, questionNumber, updateQcmDto);
  }

  @Post('roadmaps')
  async createRoadmap(@Body() createRoadmapDto: CreateRoadmapDto) {
    return this.adminService.createRoadmap(createRoadmapDto);
  }

  @Get('roadmaps')
  getAllRoadmaps() {
    return this.adminService.getAllRoadmaps();
  }

  @Get('roadmaps/:id')
  getRoadmap(@Param('id') id: number) {
    return this.adminService.getRoadmap(id);
  }

  @Put('roadmaps/:id')
  async updateRoadmap(
    @Param('id') id: number,
    @Body() updateRoadmapDto: CreateRoadmapDto
  ) {
    return this.adminService.updateRoadmap(id, updateRoadmapDto);
  }

  @Delete('roadmaps/:id')
  deleteRoadmap(@Param('id') id: number) {
    return this.adminService.deleteRoadmap(id);
  }

  @Post('qcms/batch')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createQcmsBatch(@Body() createQcmBatchDto: CreateQcmBatchDto) {
    return this.adminService.createQcmsBatch(createQcmBatchDto.questions);
  }

  @Get('exam-results')
  getAllExamResults(
    @Query('courseId') courseId?: number,
    @Query('userId') userId?: number
  ) {
    return this.adminService.getAllExamResults(courseId, userId);
  }

  @Get('exam-results/:id')
  getExamResultById(@Param('id') id: number) {
    return this.adminService.getExamResultById(id);
  }
} 