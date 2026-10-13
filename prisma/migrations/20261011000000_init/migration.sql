-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'EQUIPMENT', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");

-- CreateIndex
CREATE INDEX "reservations_resourceId_startTime_idx" ON "reservations"("resourceId", "startTime");

-- CreateIndex
CREATE INDEX "reservations_userId_startTime_idx" ON "reservations"("userId", "startTime");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written: integrity rules that Prisma's schema language cannot express.
-- ---------------------------------------------------------------------------

-- btree_gist lets a GiST index/constraint combine equality on a plain column
-- (resourceId) with range overlap (the time window).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A reservation must end after it starts.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_valid_time_range"
  CHECK ("endTime" > "startTime");

-- THE core rule: two CONFIRMED reservations for the same resource can never
-- overlap. Enforced by the database itself, so it holds even when two requests
-- arrive at the same instant (no check-then-insert race condition).
-- '[)' = start inclusive, end exclusive, so 10:00-11:00 and 11:00-12:00 are
-- allowed back to back. Cancelled reservations are excluded by the WHERE
-- clause, which frees their slot automatically.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');
