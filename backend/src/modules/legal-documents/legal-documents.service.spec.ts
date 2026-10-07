import { NotFoundException } from '@nestjs/common';
import { LegalDocumentsService } from './legal-documents.service';
import { LawDomain, LawInstrumentType, LawStatus } from '@prisma/client';

describe('LegalDocumentsService', () => {
  let service: LegalDocumentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      lawCategory: {
        findUnique: jest.fn(),
      },
      legalDocument: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new LegalDocumentsService(mockPrisma);
  });

  it('findAll should filter by category, domain, instrumentType, and paginate', async () => {
    mockPrisma.legalDocument.count.mockResolvedValue(1);
    mockPrisma.legalDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        documentNumber: '33/1984',
        titleEn: 'Revenue Sharing',
        category: { domain: LawDomain.TAX_LAW, instrumentType: LawInstrumentType.PROCLAMATION },
      },
    ]);

    const result = await service.findAll({
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
      page: 1,
      limit: 10,
    });

    expect(mockPrisma.legalDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        where: expect.objectContaining({
          deletedAt: null,
          category: { domain: LawDomain.TAX_LAW, instrumentType: LawInstrumentType.PROCLAMATION },
        }),
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('create should throw NotFoundException if category does not exist', async () => {
    mockPrisma.lawCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          categoryId: 'non-existent',
          documentNumber: '100/2020',
          titleEn: 'Test Doc',
          pdfUrl: 'https://example.com/test.pdf',
          fileName: 'test.pdf',
        },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('create should save document when category is valid', async () => {
    mockPrisma.lawCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrisma.legalDocument.create.mockResolvedValue({
      id: 'doc-new',
      documentNumber: '100/2020',
      titleEn: 'Test Doc',
      status: LawStatus.IN_FORCE,
    });

    const result = await service.create(
      {
        categoryId: 'cat-1',
        documentNumber: '100/2020',
        titleEn: 'Test Doc',
        pdfUrl: 'https://example.com/test.pdf',
        fileName: 'test.pdf',
      },
      'user-1',
    );

    expect(mockPrisma.legalDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: 'cat-1',
          documentNumber: '100/2020',
          createdById: 'user-1',
        }),
      }),
    );
    expect(result.id).toBe('doc-new');
  });

  it('remove should soft-delete document by updating deletedAt', async () => {
    mockPrisma.legalDocument.findFirst.mockResolvedValue({ id: 'doc-1' });
    mockPrisma.legalDocument.update.mockResolvedValue({ id: 'doc-1', deletedAt: new Date() });

    const result = await service.remove('doc-1');
    expect(mockPrisma.legalDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-1' },
        data: { deletedAt: expect.any(Date) },
      }),
    );
    expect(result.success).toBe(true);
  });
});

