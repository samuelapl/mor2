import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LawCategoriesService } from './law-categories.service';
import { LawDomain, LawInstrumentType } from '@prisma/client';

describe('LawCategoriesService', () => {
  let service: LawCategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      lawCategory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      legalDocument: {
        count: jest.fn(),
      },
    };
    service = new LawCategoriesService(mockPrisma);
  });

  it('findAll should filter by domain and instrumentType', async () => {
    mockPrisma.lawCategory.findMany.mockResolvedValue([
      { id: 'cat-1', nameEn: 'VAT Proclamation', domain: LawDomain.TAX_LAW, instrumentType: LawInstrumentType.PROCLAMATION },
    ]);

    const result = await service.findAll({
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
    });

    expect(mockPrisma.lawCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain: LawDomain.TAX_LAW,
          instrumentType: LawInstrumentType.PROCLAMATION,
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('create should calculate next order if none provided', async () => {
    mockPrisma.lawCategory.findFirst.mockResolvedValue({ order: 5 });
    mockPrisma.lawCategory.create.mockResolvedValue({
      id: 'cat-new',
      nameEn: 'Excise Tax',
      order: 6,
    });

    await service.create({
      nameEn: 'Excise Tax',
      domain: LawDomain.TAX_LAW,
      instrumentType: LawInstrumentType.PROCLAMATION,
    });

    expect(mockPrisma.lawCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 6 }),
      }),
    );
  });

  it('remove should throw BadRequestException if category has documents', async () => {
    mockPrisma.lawCategory.findUnique.mockResolvedValue({ id: 'cat-1', nameEn: 'VAT' });
    mockPrisma.legalDocument.count.mockResolvedValue(2);

    await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.lawCategory.delete).not.toHaveBeenCalled();
  });

  it('remove should delete category if no documents exist', async () => {
    mockPrisma.lawCategory.findUnique.mockResolvedValue({ id: 'cat-1', nameEn: 'VAT' });
    mockPrisma.legalDocument.count.mockResolvedValue(0);
    mockPrisma.lawCategory.delete.mockResolvedValue({ id: 'cat-1' });

    const result = await service.remove('cat-1');
    expect(result).toEqual({ id: 'cat-1' });
  });
});

