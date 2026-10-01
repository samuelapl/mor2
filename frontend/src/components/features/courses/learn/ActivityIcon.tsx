'use client';

import {
  ClipboardList,
  ExternalLink,
  FileText,
  Headphones,
  ListChecks,
  Presentation,
  Video,
} from 'lucide-react';

export function ActivityIcon({ type }: { type?: string }) {
  switch (type) {
    case 'VIDEO':
      return <Video className="h-4 w-4 text-rose-500" />;
    case 'AUDIO':
      return <Headphones className="h-4 w-4 text-purple-500" />;
    case 'PRESENTATION':
      return <Presentation className="h-4 w-4 text-amber-500" />;
    case 'INTERACTIVE':
      return <ListChecks className="h-4 w-4 text-emerald-500" />;
    case 'EXTERNAL_LINK':
      return <ExternalLink className="h-4 w-4 text-indigo-500" />;
    case 'ASSIGNMENT':
      return <ClipboardList className="h-4 w-4 text-orange-500" />;
    case 'DOCUMENT':
    default:
      return <FileText className="h-4 w-4 text-blue-500" />;
  }
}

