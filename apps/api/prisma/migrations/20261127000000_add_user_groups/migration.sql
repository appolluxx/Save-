CREATE TYPE "UserGroup" AS ENUM ('STUDENT', 'TEACHER', 'EXTERNAL', 'ADMIN');

ALTER TYPE "ActionType" ADD VALUE 'MANUAL_REVIEW';

ALTER TABLE "users"
ADD COLUMN "user_group" "UserGroup" NOT NULL DEFAULT 'STUDENT';

UPDATE "users"
SET "user_group" = 'TEACHER'
WHERE "role" = 'STAFF';

UPDATE "users"
SET "user_group" = 'ADMIN'
WHERE "role" = 'ADMIN';

UPDATE "users" AS u
SET "user_group" = 'EXTERNAL'
FROM "students_master" AS s
WHERE u."student_id" = s."student_id"
  AND s."grade_level" = 'บุคคลทั่วไป';

UPDATE "users"
SET "user_group" = 'EXTERNAL'
WHERE "role" = 'STUDENT'
  AND "student_id" IS NULL;

CREATE INDEX "users_user_group_idx" ON "users"("user_group");
