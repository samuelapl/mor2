import { Module, forwardRef } from '@nestjs/common';
import { CoursesModule } from '@modules/courses/courses.module';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  // forwardRef: CoursesModule → ProgressModule → CertificatesModule → FilesModule
  imports: [forwardRef(() => CoursesModule)],
  controllers: [FilesController],
  providers: [FilesService, PrismaService],
  exports: [FilesService],
})
export class FilesModule {}
