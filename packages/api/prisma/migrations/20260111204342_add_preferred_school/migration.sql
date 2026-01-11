-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_guardians" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "rut" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT NOT NULL DEFAULT 'guardian',
    "preferred_school_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guardians_preferred_school_id_fkey" FOREIGN KEY ("preferred_school_id") REFERENCES "schools" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_guardians" ("created_at", "first_name", "id", "last_name", "phone", "relationship", "rut", "updated_at", "user_id") SELECT "created_at", "first_name", "id", "last_name", "phone", "relationship", "rut", "updated_at", "user_id" FROM "guardians";
DROP TABLE "guardians";
ALTER TABLE "new_guardians" RENAME TO "guardians";
CREATE UNIQUE INDEX "guardians_user_id_key" ON "guardians"("user_id");
CREATE INDEX "guardians_rut_idx" ON "guardians"("rut");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
