const fs = require('fs');

const file = 'C:/Users/HP/Desktop/MoR LMS/MoR LMS/mor2/frontend/src/components/features/classroom/ClassroomSidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Base structural changes
content = content.replace(
  `border-r border-slate-200 bg-white`,
  `border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`
);
content = content.replace(
  `border-slate-100 bg-slate-50/60`,
  `border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60`
);
content = content.replace(
  `bg-white px-2 py-0.5 rounded-full border border-slate-200`,
  `bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700`
);

// Course overview item
content = content.replace(
  `border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs`,
  `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs`
);
content = content.replace(
  `bg-indigo-50 border-indigo-200 text-indigo-700 group-hover:bg-indigo-100`,
  `bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900`
);

// Module expansion
content = content.replace(
  `border-slate-200 bg-white shadow-2xs`,
  `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs`
);
content = content.replace(
  `border-slate-200/60 bg-slate-50/50 opacity-70`,
  `border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 opacity-70`
);
content = content.replace(
  `hover:bg-slate-50/80`,
  `hover:bg-slate-50/80 dark:hover:bg-slate-800/80`
);
content = content.replace(
  `bg-slate-100 border-slate-200 text-slate-400`,
  `bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500`
);
content = content.replace(
  `text-slate-900 truncate`,
  `text-slate-900 dark:text-slate-100 truncate`
);
content = content.replace(
  `border-t border-slate-100 bg-slate-50/40`,
  `border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40`
);

// Module overview inside content
content = content.replace(
  `text-slate-700 hover:bg-white hover:shadow-2xs`,
  `text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xs`
);

// Lesson rows
content = content.replace(
  `text-slate-700 hover:bg-white hover:shadow-2xs`,
  `text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xs`
);
content = content.replace(
  `text-slate-600 hover:bg-white`,
  `text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800`
);

// Quizzes inside modules
content = content.replace(
  `bg-white border-indigo-200 text-indigo-950 hover:bg-indigo-50/60`,
  `bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/30`
);
content = content.replace(
  `bg-slate-50 border-slate-200/80 text-slate-400 cursor-not-allowed`,
  `bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed`
);

// Module Assessment
content = content.replace(
  `bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200 text-indigo-950 hover:from-indigo-100`,
  `bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 hover:from-indigo-100 dark:hover:from-indigo-900/40`
);
content = content.replace(
  `bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed`,
  `bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed`
);

// Final Assessment
content = content.replace(
  `bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75`,
  `bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75`
);

// Certificate
content = content.replace(
  `bg-slate-50/80 border-slate-200 text-slate-500 hover:bg-slate-100/70`,
  `bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/80`
);
content = content.replace(
  `bg-slate-100 border-slate-200 text-slate-400`,
  `bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500`
);

fs.writeFileSync(file, content);
console.log('Done replacing sidebar classes');
