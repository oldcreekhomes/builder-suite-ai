
export const getTaskRowClassName = (isChild: boolean) => `
  ${isChild ? 'bg-slate-50/50' : 'bg-white'} 
  hover:bg-slate-50 
  transition-colors 
  border-b border-slate-100
  h-8
`;

export const getTaskNameClassName = (isChild: boolean, isParent: boolean) => 
  `text-sm ${isChild ? 'text-slate-700 pl-4' : isParent ? 'text-slate-900 font-bold' : 'text-slate-900'}`;

export const getProgressColor = (progress: number) => {
  if (progress === 0) return "bg-slate-200";
  if (progress < 50) return "bg-yellow-500";
  if (progress < 100) return "bg-blue-500";
  return "bg-green-500";
};
