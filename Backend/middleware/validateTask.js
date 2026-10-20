function validateTask(req, res, next) {
  const { title, description, priority } = req.body ?? {};
  const errors = [];

  if (typeof title !== 'string' || !title.trim()) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.trim().length > 120) {
    errors.push({ field: 'title', message: 'Title must be 120 characters or fewer' });
  }
  if (description !== undefined && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description must be text' });
  }
  if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
    errors.push({ field: 'priority', message: 'Priority must be low, medium, or high' });
  }
  if (errors.length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  req.body.title = title.trim();
  if (typeof description === 'string') req.body.description = description.trim();
  return next();
}

module.exports = validateTask;
