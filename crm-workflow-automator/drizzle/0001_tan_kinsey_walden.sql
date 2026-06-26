CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('oauth_connect','oauth_disconnect','field_mapping_created','field_mapping_updated','field_mapping_deleted','workflow_created','workflow_updated','workflow_deleted','workflow_triggered','sync_started','sync_completed','sync_failed','csv_upload','data_migration','webhook_received','webhook_processed','webhook_failed') NOT NULL,
	`resourceType` varchar(128),
	`resourceId` varchar(256),
	`description` text,
	`httpStatus` int,
	`httpMethod` varchar(16),
	`endpoint` varchar(512),
	`requestPayload` longtext,
	`responsePayload` longtext,
	`errorDetails` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`executionTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crm_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`crmType` enum('hubspot','salesforce') NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`instanceUrl` varchar(512),
	`clientId` varchar(256) NOT NULL,
	`clientSecret` varchar(256) NOT NULL,
	`isConnected` boolean NOT NULL DEFAULT false,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_migration_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobName` varchar(256) NOT NULL,
	`sourceFile` varchar(512) NOT NULL,
	`entityType` enum('contact','deal','lead','opportunity') NOT NULL,
	`targetSystem` enum('hubspot','salesforce') NOT NULL,
	`totalRecords` int NOT NULL DEFAULT 0,
	`processedRecords` int NOT NULL DEFAULT 0,
	`successfulRecords` int NOT NULL DEFAULT 0,
	`failedRecords` int NOT NULL DEFAULT 0,
	`duplicatesDetected` int NOT NULL DEFAULT 0,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`csvData` longtext,
	`transformedData` longtext,
	`errorLog` longtext,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_migration_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deduplication_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('contact','deal','lead','opportunity') NOT NULL,
	`system` enum('hubspot','salesforce') NOT NULL,
	`emailHash` varchar(64) NOT NULL,
	`entityId` varchar(256) NOT NULL,
	`email` varchar(320),
	`firstName` varchar(256),
	`lastName` varchar(256),
	`phone` varchar(20),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deduplication_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mappingName` varchar(256) NOT NULL,
	`sourceSystem` enum('hubspot','salesforce') NOT NULL,
	`targetSystem` enum('hubspot','salesforce') NOT NULL,
	`entityType` enum('contact','deal','lead','opportunity','pipeline') NOT NULL,
	`mappingConfig` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sandbox_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`system` enum('hubspot','salesforce') NOT NULL,
	`entityType` enum('contact','deal','lead','opportunity','pipeline') NOT NULL,
	`entityData` json NOT NULL,
	`externalId` varchar(256) NOT NULL,
	`syncedToOtherSystem` boolean NOT NULL DEFAULT false,
	`lastModifiedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sandbox_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceSystem` enum('hubspot','salesforce') NOT NULL,
	`targetSystem` enum('hubspot','salesforce') NOT NULL,
	`entityType` enum('contact','deal','lead','opportunity','pipeline') NOT NULL,
	`entityId` varchar(256) NOT NULL,
	`syncDirection` enum('one_way','bidirectional') NOT NULL,
	`status` enum('pending','in_progress','success','failed','partial') NOT NULL DEFAULT 'pending',
	`recordsProcessed` int NOT NULL DEFAULT 0,
	`recordsSucceeded` int NOT NULL DEFAULT 0,
	`recordsFailed` int NOT NULL DEFAULT 0,
	`sourcePayload` longtext,
	`transformedPayload` longtext,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(256) NOT NULL,
	`source` enum('hubspot','salesforce','manual') NOT NULL,
	`payload` longtext NOT NULL,
	`processedAt` timestamp,
	`status` enum('received','processing','processed','failed') NOT NULL DEFAULT 'received',
	`errorMessage` text,
	`matchedRules` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleName` varchar(256) NOT NULL,
	`description` text,
	`triggerEvent` varchar(256) NOT NULL,
	`triggerCondition` json NOT NULL,
	`action` varchar(256) NOT NULL,
	`actionPayload` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`executionCount` int NOT NULL DEFAULT 0,
	`lastExecutedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_rules_id` PRIMARY KEY(`id`)
);
