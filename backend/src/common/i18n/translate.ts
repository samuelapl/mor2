import { LOCALE, Locale } from '@config/constants';

const DICTIONARY: Array<[RegExp, string]> = [
  [/^Internal server error$/, 'የውስጥ ስህተት ተከስቷል'],
  [/^Unauthorized$/, 'ፈቃድ አልተሰጠም'],
  [/^Invalid or expired token$/, 'ልክ ያልሆነ ወይም ያለፈ የመግቢያ ማረጋገጫ'],
  [/^Forbidden resource$/, 'የተከለከለ ምንጭ'],
  [/^Not Found$/, 'አልተገኘም'],
  [/^Bad Request$/, 'ትክክል ያልሆነ ጥያቄ'],
  [/not found$/i, 'አልተገኘም'],
  [/must not be empty$/, 'ባዶ መሆን የለበትም'],
  [/must be a UUID$/, 'ትክክለኛ መለያ (UUID) መሆን አለበት'],
  [/must be an email$/, 'ትክክለኛ ኢሜይል መሆን አለበት'],
  [/must be a string$/, 'ሕብረቁምፊ (string) መሆን አለበት'],
  [/must be a number$/, 'ቁጥር መሆን አለበት'],
  [/must be a boolean$/, 'እውነት/ሐሰት (boolean) መሆን አለበት'],
  [/must be an integer$/, 'ሙሉ ቁጥር መሆን አለበት'],
  [/must be an array$/, 'ዝርዝር (array) መሆን አለበት'],
  [/must be a date$/, 'ትክክለኛ ቀን መሆን አለበት'],
  [/must be an object$/, 'ነገር (object) መሆን አለበት'],
  [/must be an enum value$/, 'ከተፈቀዱ እሴቶች አንዱ መሆን አለበት'],
  [/must not be greater than /, 'ከሚፈቀደው ከፍ ያለ መሆን የለበትም '],
  [/must not be less than /, 'ከሚፈቀደው ዝቅ ያለ መሆን የለበትም '],
  [/must be one of the following values: /, 'ከሚከተሉት እሴቶች አንዱ መሆን አለበት: '],
  [/must be shorter than or equal to /, 'ከሚፈቀደው ያነሰ ወይም እኩል ርዝመት ሊኖረው ይገባል '],
  [/must be longer than or equal to /, 'ከሚፈቀደው ረዘም ወይም እኩል ርዝመት ሊኖረው ይገባል '],
  [/has an unknown property /, 'ያልታወቀ ባህሪ አለው '],
  [/each value in nested property /, 'በተከተተ ባህሪ ውስጥ ያለው እያንዳንዱ እሴት '],
];

const FALLBACK_AM = 'ትክክል ያልሆነ ግቤት';

/**
 * Best-effort English → Amharic translation for common HTTP / validation
 * error messages. Unknown messages fall back to a generic Amharic label.
 */
export function localizeMessage(message: string, locale: Locale): string {
  if (locale !== LOCALE.AM) {
    return message;
  }

  const trimmed = message.trim();
  for (const [pattern, translation] of DICTIONARY) {
    if (pattern.test(trimmed)) {
      if (pattern.source.startsWith('must not be greater than')) {
        return `${translation}${trimmed.match(/(\d+)/)?.[0] ?? ''}`;
      }
      if (pattern.source.startsWith('must not be less than')) {
        return `${translation}${trimmed.match(/(\d+)/)?.[0] ?? ''}`;
      }
      return translation;
    }
  }
  return FALLBACK_AM;
}

export function localizeMessages(messages: string[], locale: Locale): string[] {
  if (locale !== LOCALE.AM) {
    return messages;
  }
  return messages.map((m) => localizeMessage(m, locale));
}

export function detectLocale(header?: string | string[]): Locale {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim().toLowerCase().startsWith(LOCALE.AM) ? LOCALE.AM : LOCALE.EN;
}
