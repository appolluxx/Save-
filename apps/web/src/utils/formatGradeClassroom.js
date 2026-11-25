export function formatGradeClassroom(gradeLevel, classroom) {
  const grade = String(gradeLevel || '').trim();
  if (!grade) return '';
  if (grade === 'บุคคลทั่วไป') return grade;

  const gradeNumber = grade.replace(/^(?:ม\.\s*)+/u, '').trim();
  const room = String(classroom || '').trim() || '—';
  return `ม.${gradeNumber}/${room}`;
}
