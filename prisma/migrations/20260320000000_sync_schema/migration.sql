-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_ticket_id_fkey";

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "github_issue_number" INTEGER,
ADD COLUMN     "github_issue_url" TEXT,
ADD COLUMN     "target_repos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "ticket_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Backlog';

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'Open';

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubIssueLink" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "repo_name" TEXT NOT NULL,
    "repo_full" TEXT NOT NULL DEFAULT '',
    "issue_number" INTEGER NOT NULL,
    "issue_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubIssueLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GithubIssueLink" ADD CONSTRAINT "GithubIssueLink_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

