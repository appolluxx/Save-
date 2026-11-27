const USER_GROUP_LABELS = Object.freeze({
  STUDENT: 'นักเรียน',
  TEACHER: 'ครู / บุคลากร',
  EXTERNAL: 'บุคคลภายนอก',
  ADMIN: 'ผู้ดูแลระบบ',
});

export function userGroupLabel(userGroup) {
  return USER_GROUP_LABELS[userGroup] || 'สมาชิก';
}
