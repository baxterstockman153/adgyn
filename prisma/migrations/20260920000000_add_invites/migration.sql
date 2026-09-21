-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "org_type" "MembershipOrg" NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'owner',
    "email" TEXT,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- Enable Row-Level Security on the new table (the 20260918000000_enable_rls
-- migration ran before this table existed, so lock it down here too).
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
