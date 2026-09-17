-- Soft-delete lịch khởi hành (ẩn trên site user khi toàn bộ lịch tour đã kết thúc)

ALTER TABLE `TourSchedule` ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `TourSchedule_tourId_deletedAt_idx` ON `TourSchedule`(`tourId`, `deletedAt`);
