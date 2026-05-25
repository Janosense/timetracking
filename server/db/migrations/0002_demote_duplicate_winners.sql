-- One-off data fix: backyard_ultra competitions that ended up with multiple participants
-- marked 'winner' due to non-idempotent finalizeTargetBackyard re-runs interleaving on
-- Vercel/Turso. Keeps the participant with the lowest total running time as winner;
-- demotes the rest to 'finisher'. Idempotent (no-op once each competition has a single winner).
WITH winner_totals AS (
	SELECT
		p.id AS participant_id,
		p.competition_id,
		COALESCE(SUM(f.finish_time_ms - (f.lap_number - 1) * c.lap_duration_minutes * 60000), 0) AS total_time_ms
	FROM participants p
	JOIN competitions c ON c.id = p.competition_id
	LEFT JOIN finish_records f ON f.participant_id = p.id
	WHERE p.status = 'winner' AND c.type = 'backyard_ultra'
	GROUP BY p.id, p.competition_id
),
demote AS (
	SELECT participant_id
	FROM (
		SELECT
			participant_id,
			ROW_NUMBER() OVER (PARTITION BY competition_id ORDER BY total_time_ms ASC) AS rn
		FROM winner_totals
	)
	WHERE rn > 1
)
UPDATE participants SET status = 'finisher'
WHERE id IN (SELECT participant_id FROM demote);
