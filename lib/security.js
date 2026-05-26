export async function canTeacherAccessStudent(teacherId, studentId, db) {
  const student = await db.collection('children').findOne({ id: studentId })
  if (!student) return false
  if (student.type === 'private') return false
  return student.teacherId === teacherId
}

export async function canParentAccessStudent(parentId, studentId, db) {
  const student = await db.collection('children').findOne({ id: studentId })
  if (!student) return false
  const ownerId = student.parentId ?? student.parent_id
  return ownerId === parentId
}

export async function isPrivateStudent(studentId, db) {
  const student = await db.collection('children').findOne({ id: studentId })
  return student?.type === 'private'
}
