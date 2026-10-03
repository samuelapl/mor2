import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { Permissions } from '@common/decorators';
import { PreparedQuizService } from './prepared-quiz.service';
import {
  CreatePreparedQuizDto,
  UpdatePreparedQuizDto,
  BulkAddPreparedQuestionsDto,
  ReorderPreparedQuestionsDto,
  SetPreparedQuestionPointsDto,
} from './dto';

@ApiTags('prepared-quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('live-sessions/:sessionId/prepared-quiz')
export class PreparedQuizController {
  constructor(private readonly preparedQuizService: PreparedQuizService) {}

  @Get()
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Get all prepared quiz groups for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async findAll(@Param('sessionId') sessionId: string) {
    return this.preparedQuizService.findAll(sessionId);
  }

  @Post()
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Create a new prepared quiz group (e.g. Lesson 1 Quiz)' })
  @ApiParam({ name: 'sessionId', type: String })
  async createQuiz(@Param('sessionId') sessionId: string, @Body() dto: CreatePreparedQuizDto) {
    return this.preparedQuizService.createQuiz(sessionId, dto);
  }

  @Patch(':quizId')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Update quiz group (title, minutes, order)' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  async updateQuiz(
    @Param('sessionId') sessionId: string,
    @Param('quizId') quizId: string,
    @Body() dto: UpdatePreparedQuizDto,
  ) {
    return this.preparedQuizService.updateQuiz(sessionId, quizId, dto);
  }

  @Delete(':quizId')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Delete a prepared quiz group and its questions' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  async deleteQuiz(@Param('sessionId') sessionId: string, @Param('quizId') quizId: string) {
    await this.preparedQuizService.deleteQuiz(sessionId, quizId);
    return { success: true };
  }

  @Post(':quizId/questions/bulk')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Bulk add questions to a specific quiz group' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  async bulkAddQuestions(
    @Param('sessionId') sessionId: string,
    @Param('quizId') quizId: string,
    @Body() dto: BulkAddPreparedQuestionsDto,
  ) {
    return this.preparedQuizService.bulkAddQuestions(sessionId, quizId, dto);
  }

  @Patch(':quizId/questions/reorder')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Reorder questions within a quiz group' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  async reorderQuestions(
    @Param('sessionId') sessionId: string,
    @Param('quizId') quizId: string,
    @Body() dto: ReorderPreparedQuestionsDto,
  ) {
    return this.preparedQuizService.reorderQuestions(sessionId, quizId, dto);
  }

  @Patch(':quizId/questions/points')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({
    summary:
      'Set the points of questions in a quiz group; a weighted quiz may not exceed its course weight',
  })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  async setQuestionPoints(
    @Param('sessionId') sessionId: string,
    @Param('quizId') quizId: string,
    @Body() dto: SetPreparedQuestionPointsDto,
  ) {
    return this.preparedQuizService.setQuestionPoints(sessionId, quizId, dto);
  }

  @Delete(':quizId/questions/:questionId')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Remove a question from a quiz group' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'quizId', type: String })
  @ApiParam({ name: 'questionId', type: String })
  async removeQuestion(
    @Param('sessionId') sessionId: string,
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.preparedQuizService.removeQuestion(sessionId, quizId, questionId);
    return { success: true };
  }
}
