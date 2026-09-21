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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { QuestionBankService } from './question-bank.service';
import {
  BulkCreateQuestionBankDto,
  CreateQuestionBankQuestionDto,
  QueryQuestionBankDto,
  UpdateQuestionBankQuestionDto,
} from './dto';
import { CurrentUser, Permissions } from '@common/decorators';
import { AuthenticatedUser } from '@common/interfaces';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards';

@ApiTags('question-bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'Create a question in the Question Bank' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionBankQuestionDto,
  ) {
    return this.questionBankService.create(user.id, dto);
  }

  @Post('bulk')
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'Bulk create questions in the Question Bank' })
  async bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreateQuestionBankDto,
  ) {
    return this.questionBankService.bulkCreate(user.id, dto);
  }

  @Get()
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'List questions from Question Bank with optional filters' })
  async findAll(@Query() query: QueryQuestionBankDto) {
    return this.questionBankService.findAll(query);
  }

  @Get(':id')
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'Get a single Question Bank question by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.questionBankService.findOne(id);
  }

  @Patch(':id')
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'Update a question in the Question Bank' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionBankQuestionDto,
  ) {
    return this.questionBankService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('question_bank.manage', 'quiz.create')
  @ApiOperation({ summary: 'Delete a question from Question Bank' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string) {
    await this.questionBankService.delete(id);
  }
}
