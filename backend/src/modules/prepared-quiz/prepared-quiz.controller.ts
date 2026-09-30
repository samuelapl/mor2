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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';
import { Permissions } from '@common/decorators';
import { PreparedQuizService } from './prepared-quiz.service';
import {
  AddPreparedQuestionDto,
  BulkAddPreparedQuestionsDto,
  ReorderPreparedQuestionsDto,
} from './dto';

@ApiTags('prepared-quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('live-sessions/:sessionId/prepared-quiz')
export class PreparedQuizController {
  constructor(private readonly preparedQuizService: PreparedQuizService) {}

  @Get()
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Get all prepared quiz questions for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async findAll(@Param('sessionId') sessionId: string) {
    return this.preparedQuizService.findAll(sessionId);
  }

  @Post()
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Add a single question from the bank to the prepared quiz' })
  @ApiParam({ name: 'sessionId', type: String })
  async addQuestion(
    @Param('sessionId') sessionId: string,
    @Body() dto: AddPreparedQuestionDto,
  ) {
    return this.preparedQuizService.addQuestion(sessionId, dto);
  }

  @Post('bulk')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Bulk-import multiple questions from the bank into the prepared quiz' })
  @ApiParam({ name: 'sessionId', type: String })
  async bulkAdd(
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkAddPreparedQuestionsDto,
  ) {
    return this.preparedQuizService.bulkAdd(sessionId, dto);
  }

  @Patch('reorder')
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Reorder prepared quiz questions' })
  @ApiParam({ name: 'sessionId', type: String })
  async reorder(
    @Param('sessionId') sessionId: string,
    @Body() dto: ReorderPreparedQuestionsDto,
  ) {
    return this.preparedQuizService.reorder(sessionId, dto);
  }

  // IMPORTANT: DELETE / must be defined BEFORE DELETE /:questionId
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Clear all prepared quiz questions from a session' })
  @ApiParam({ name: 'sessionId', type: String })
  async clearAll(@Param('sessionId') sessionId: string) {
    await this.preparedQuizService.clearAll(sessionId);
  }

  @Delete(':questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('live_session.manage_own', 'live_session.manage_all')
  @ApiOperation({ summary: 'Remove a single question from the prepared quiz' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiParam({ name: 'questionId', type: String })
  async removeQuestion(
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.preparedQuizService.removeQuestion(sessionId, questionId);
  }
}
