-- AlterTable Tour
ALTER TABLE `Tour` ADD COLUMN `singleRoomSupplement` DECIMAL(12, 2) NULL;

-- AlterTable Booking
ALTER TABLE `Booking` ADD COLUMN `discountCode` VARCHAR(64) NULL,
    ADD COLUMN `discountAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `singleRoomCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `singleRoomSupplementAmount` DECIMAL(12, 2) NULL;

-- CreateTable PromoCode
CREATE TABLE `PromoCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `fixedOff` DECIMAL(12, 2) NULL,
    `percentOff` DECIMAL(5, 2) NULL,
    `maxDiscountAmount` DECIMAL(12, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `validFromUtc` DATETIME(3) NULL,
    `validToUtc` DATETIME(3) NULL,
    `tourId` INTEGER NULL,

    UNIQUE INDEX `PromoCode_code_key`(`code`),
    INDEX `PromoCode_tourId_idx`(`tourId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromoCode` ADD CONSTRAINT `PromoCode_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `Tour`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
