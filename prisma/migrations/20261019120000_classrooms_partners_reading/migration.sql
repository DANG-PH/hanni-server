-- CreateEnum
CREATE TYPE "ClassAssignmentKind" AS ENUM ('LESSON', 'MOCK_EXAM');

-- CreateTable
CREATE TABLE "LessonReading" (
    "lessonId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sentences" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonReading_pkey" PRIMARY KEY ("lessonId")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hskLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomMember" (
    "classroomId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomMember_pkey" PRIMARY KEY ("classroomId","userId")
);

-- CreateTable
CREATE TABLE "ClassAssignment" (
    "id" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "kind" "ClassAssignmentKind" NOT NULL,
    "lessonId" UUID,
    "examSlug" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_ownerId_idx" ON "Classroom"("ownerId");

-- CreateIndex
CREATE INDEX "ClassroomMember_userId_idx" ON "ClassroomMember"("userId");

-- CreateIndex
CREATE INDEX "ClassAssignment_classroomId_createdAt_idx" ON "ClassAssignment"("classroomId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerLead_createdAt_idx" ON "PartnerLead"("createdAt");

-- AddForeignKey
ALTER TABLE "LessonReading" ADD CONSTRAINT "LessonReading_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMember" ADD CONSTRAINT "ClassroomMember_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMember" ADD CONSTRAINT "ClassroomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

