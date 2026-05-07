-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `cancellationRequestState` ENUM('NONE', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `cancellationRequestedAtUtc` DATETIME(3) NULL,
    ADD COLUMN `cancellationRejectedAtUtc` DATETIME(3) NULL,
    ADD COLUMN `cancellationApprovedAtUtc` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Booking_cancellationRequestState_idx` ON `Booking`(`cancellationRequestState`);
