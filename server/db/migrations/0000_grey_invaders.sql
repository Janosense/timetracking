CREATE TABLE `competitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_start` integer,
	`actual_start` integer,
	`control_time_minutes` integer,
	`lap_duration_minutes` integer DEFAULT 60,
	`target_laps` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finish_records` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`competition_id` text NOT NULL,
	`lap_number` integer NOT NULL,
	`finish_time_ms` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`competition_id` text NOT NULL,
	`bib_number` integer NOT NULL,
	`name` text,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action
);
