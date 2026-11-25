export function formatGradeClassroom(gradeLevel, classroom) {
  const grade = String(gradeLevel || '').trim();
  if (!grade) return '';
  if (grade === 'บุคคลทั่วไป') return grade;

  const gradeNumber = grade.replace(/^(?:ม\.\s*)+/u, '').trim();
  let room = String(classroom || '').trim() || '—';

  // The imported classroom may include the grade already, for example "6/3".
  const roomParts = room.split('/');
  const roomGrade = roomParts[0].trim().replace(/^(?:ม\.\s*)+/u, '').trim();
  if (roomParts.length > 1 && roomGrade === gradeNumber) {
    room = roomParts.slice(1).join('/').trim() || '—';
  }

  return `ม.${gradeNumber}/${room}`;
}
