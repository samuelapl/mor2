export const COURSE_CATEGORIES = ['Tax', 'Customs', 'Excise', 'Compliance', 'Systems'];

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ['Tax', ['tax', 'vat', 'income', 'withholding']],
  ['Customs', ['customs', 'tariff', 'import duty']],
  ['Excise', ['excise', 'alcohol', 'tobacco']],
  ['Compliance', ['compliance', 'audit', 'ethics']],
  ['Systems', ['eservice', 'portal', 'system', 'excel']],
];

export function deriveCategory(title?: string | null, description?: string | null): string {
  const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return '';
}
