import type { NameMatchResult } from '@/types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchNames(input: string, aresName: string): NameMatchResult {
  if (!input.trim()) return 'exact';

  const normInput = normalize(input);
  const normAres = normalize(aresName);

  // Exact match
  if (normInput === normAres) return 'exact';
  
  // If input has capital letters, treat as full name search
  // Strip company form and compare
  if (/[A-Z]/.test(input)) {
    const aresWords = normAres.split(/\s+/);
    const commonForms = ['sro', 's', 'r', 'o', 'as', 'kht', 'se', 'vos', 'pza'];
    
    let mainWords = [...aresWords];
    while (mainWords.length > 0 && commonForms.includes(mainWords[mainWords.length - 1])) {
      mainWords.pop();
    }
    const mainAres = mainWords.join(' ');
    
    if (normInput === mainAres) return 'exact';
  }
  
  // Check if substring
  if (normAres.includes(normInput) || normInput.includes(normAres)) return 'partial';

  // Check if any word matches
  const inputWords = normInput.split(' ').filter(Boolean);
  if (inputWords.some((word) => normAres.includes(word))) return 'partial';

  return 'none';
}
