import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { success, error } from '../utils/response.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function requireStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'student') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Student role required' } });
  }
  next();
}

// GET /api/v1/student/dashboard
router.get('/dashboard', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const [convs, favs, searches] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM conversations WHERE student_id = $1', [req.userId]),
    query<{ count: string }>('SELECT COUNT(*) as count FROM student_favorites WHERE student_id = $1', [req.userId]),
    query<{ count: string }>('SELECT COUNT(*) as count FROM search_history WHERE student_id = $1', [req.userId]),
  ]);
  const profile = await query<{ full_name: string | null; avatar_url: string | null }>(
    'SELECT full_name, avatar_url FROM profiles WHERE id = $1',
    [req.userId]
  );
  return success(res, {
    conversations_count: parseInt(convs.rows[0]?.count ?? '0', 10),
    favorites_count: parseInt(favs.rows[0]?.count ?? '0', 10),
    searches_count: parseInt(searches.rows[0]?.count ?? '0', 10),
    profile: profile.rows[0],
  });
});

// POST /api/v1/student/search - search tutors with filters; returns tutors with lessons and is_favorite
router.post('/search', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const { lesson_type_id, location_id, weekly_lesson_count, availability } = req.body;
  const criteria = { lesson_type_id, location_id, weekly_lesson_count, availability };
  await query(
    'INSERT INTO search_history (student_id, criteria) VALUES ($1, $2)',
    [req.userId, JSON.stringify(criteria)]
  );
  const tutorsResult = lesson_type_id
    ? await query<{ id: string; full_name: string | null; avatar_url: string | null; role: string | null }>(
        `SELECT DISTINCT p.id, p.full_name, p.avatar_url, p.role FROM profiles p
         INNER JOIN tutor_lessons tl ON tl.tutor_id = p.id
         WHERE p.role = 'tutor' AND p.is_approved = true AND p.deleted_at IS NULL AND tl.lesson_type_id = $1
         ORDER BY p.created_at DESC LIMIT 50`,
        [lesson_type_id]
      )
    : await query<{ id: string; full_name: string | null; avatar_url: string | null; role: string | null }>(
        `SELECT DISTINCT p.id, p.full_name, p.avatar_url, p.role FROM profiles p
         INNER JOIN tutor_lessons tl ON tl.tutor_id = p.id
         WHERE p.role = 'tutor' AND p.is_approved = true AND p.deleted_at IS NULL
         ORDER BY p.created_at DESC LIMIT 50`
      );
  const favoriteIds = await query<{ tutor_id: string }>(
    'SELECT tutor_id FROM student_favorites WHERE student_id = $1',
    [req.userId]
  );
  const favSet = new Set(favoriteIds.rows.map((r) => r.tutor_id));
  const withLessons = await Promise.all(
    tutorsResult.rows.map(async (t) => {
      const lessons = await query<{ id: string; price_per_hour_cents: number; currency: string; slug: string; name: unknown }>(
        'SELECT tl.id, tl.price_per_hour_cents, tl.currency, lt.slug, lt.name FROM tutor_lessons tl JOIN lesson_types lt ON lt.id = tl.lesson_type_id AND lt.deleted_at IS NULL WHERE tl.tutor_id = $1',
        [t.id]
      );
      const availabilityRow = await query<{ slots: unknown }>('SELECT slots FROM tutor_availability WHERE tutor_id = $1', [t.id]);
      return {
        ...t,
        lessons: lessons.rows,
        is_favorite: favSet.has(t.id),
        availability_slots: availabilityRow.rows[0]?.slots ?? [],
      };
    })
  );
  return success(res, { tutors: withLessons });
});

// GET /api/v1/student/favorites - list favorite tutors with details
router.get('/favorites', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const favs = await query<{ tutor_id: string; created_at: Date }>(
    'SELECT tutor_id, created_at FROM student_favorites WHERE student_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  const tutors = await Promise.all(
    favs.rows.map(async (f) => {
      const p = await query<{ id: string; full_name: string | null; avatar_url: string | null }>(
        'SELECT id, full_name, avatar_url FROM profiles WHERE id = $1 AND deleted_at IS NULL',
        [f.tutor_id]
      );
      if (p.rows.length === 0) return null;
      const lessons = await query<{ id: string; price_per_hour_cents: number; currency: string; slug: string; name: unknown }>(
        'SELECT tl.id, tl.price_per_hour_cents, tl.currency, lt.slug, lt.name FROM tutor_lessons tl JOIN lesson_types lt ON lt.id = tl.lesson_type_id AND lt.deleted_at IS NULL WHERE tl.tutor_id = $1',
        [f.tutor_id]
      );
      return { ...p.rows[0], lessons: lessons.rows, favorited_at: f.created_at };
    })
  );
  return success(res, { favorites: tutors.filter(Boolean) });
});

// GET /api/v1/student/search/history
router.get('/search/history', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const result = await query<{ id: string; criteria: unknown; created_at: Date }>(
    'SELECT id, criteria, created_at FROM search_history WHERE student_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.userId]
  );
  return success(res, { history: result.rows });
});

// GET /api/v1/student/lesson-preferences - stored lesson types the student wants to take (multiple)
router.get('/lesson-preferences', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const result = await query<{ lesson_type_id: string }>(
    'SELECT lesson_type_id FROM student_lesson_preferences WHERE student_id = $1 ORDER BY created_at',
    [req.userId]
  );
  const lessonTypes = await Promise.all(
    result.rows.map(async (r) => {
      const lt = await query<{ id: string; slug: string; name: unknown }>(
        'SELECT id, slug, name FROM lesson_types WHERE id = $1 AND deleted_at IS NULL',
        [r.lesson_type_id]
      );
      return lt.rows[0] ? { id: lt.rows[0].id, slug: lt.rows[0].slug, name: lt.rows[0].name } : null;
    })
  );
  return success(res, { lesson_types: lessonTypes.filter(Boolean) });
});

// POST /api/v1/student/lesson-preferences - add a lesson type to preferences
router.post('/lesson-preferences', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const { lesson_type_id } = req.body;
  if (!lesson_type_id || typeof lesson_type_id !== 'string') {
    return error(res, 'VALIDATION_ERROR', 'lesson_type_id required', 400);
  }
  await query(
    'INSERT INTO student_lesson_preferences (student_id, lesson_type_id) VALUES ($1, $2) ON CONFLICT (student_id, lesson_type_id) DO NOTHING',
    [req.userId, lesson_type_id]
  );
  return success(res, { message: 'Lesson preference added' });
});

// DELETE /api/v1/student/lesson-preferences/:lessonTypeId - remove a lesson type from preferences
router.delete('/lesson-preferences/:lessonTypeId', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const { lessonTypeId } = req.params;
  await query('DELETE FROM student_lesson_preferences WHERE student_id = $1 AND lesson_type_id = $2', [
    req.userId,
    lessonTypeId,
  ]);
  return success(res, { message: 'Lesson preference removed' });
});

// GET /api/v1/student/tutors - connected tutors (have conversation)
router.get('/tutors', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const result = await query<{ tutor_id: string; last_message_at: Date | null }>(
    'SELECT tutor_id, last_message_at FROM conversations WHERE student_id = $1 ORDER BY last_message_at DESC NULLS LAST',
    [req.userId]
  );
  const tutors = await Promise.all(
    result.rows.map(async (r) => {
      const p = await query<{ id: string; full_name: string | null; avatar_url: string | null }>(
        'SELECT id, full_name, avatar_url FROM profiles WHERE id = $1 AND deleted_at IS NULL',
        [r.tutor_id]
      );
      return { ...p.rows[0], last_contact: r.last_message_at };
    })
  );
  return success(res, { tutors: tutors.filter(Boolean) });
});

// POST /api/v1/student/favorites/:tutorId
router.post('/favorites/:tutorId', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  const { tutorId } = req.params;
  await query(
    'INSERT INTO student_favorites (student_id, tutor_id) VALUES ($1, $2) ON CONFLICT (student_id, tutor_id) DO NOTHING',
    [req.userId, tutorId]
  );
  return success(res, { message: 'Added to favorites' });
});

// DELETE /api/v1/student/favorites/:tutorId
router.delete('/favorites/:tutorId', requireAuth, requireStudent, async (req: AuthRequest, res) => {
  await query('DELETE FROM student_favorites WHERE student_id = $1 AND tutor_id = $2', [req.userId, req.params.tutorId]);
  return success(res, { message: 'Removed from favorites' });
});

export default router;
