import {
  CirclePlay,
  ExternalLink,
  FileText,
  Headphones,
  MousePointerClick,
  Package,
  Presentation,
  type LucideIcon,
} from 'lucide-react-native';

import type { LessonContentType } from '@/core/api/types';

const ICONS: Record<LessonContentType, LucideIcon> = {
  VIDEO: CirclePlay,
  AUDIO: Headphones,
  DOCUMENT: FileText,
  PRESENTATION: Presentation,
  INTERACTIVE: MousePointerClick,
  SCORM: Package,
  EXTERNAL_LINK: ExternalLink,
};

export function ContentTypeIcon({
  type,
  size = 18,
  color,
}: {
  type: LessonContentType;
  size?: number;
  color: string;
}) {
  const Icon = ICONS[type] ?? FileText;
  return <Icon size={size} color={color} />;
}
