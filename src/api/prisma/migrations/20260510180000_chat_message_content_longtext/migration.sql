-- Chat replies (LLM / web search) exceed VARCHAR(191)
ALTER TABLE `ChatMessage` MODIFY COLUMN `content` LONGTEXT NOT NULL;
