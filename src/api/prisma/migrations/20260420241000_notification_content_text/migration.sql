-- AlterTable (tour names are TEXT; wishlist messages embed full name)
ALTER TABLE `Notification` MODIFY COLUMN `content` TEXT NULL;
