import { categorySchema, updateCategorySchema } from '@civita/shared';
import { Router } from 'express';
import { Types } from 'mongoose';
import { conflict, idParam, notFound, parse } from '../../lib/errors.js';
import { toCategory } from '../../lib/serialize.js';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/auth.js';
import { Category } from '../../models/category.model.js';
import { Issue } from '../../models/issue.model.js';

export const categoriesRouter = Router();

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 40);

const issueCounts = async () => {
  const rows = await Issue.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $group: { _id: '$category', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

/** Lists categories. Admins can pass ?all=true to include inactive ones. */
categoriesRouter.get('/', optionalAuth, async (req, res) => {
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
  const [categories, counts] = await Promise.all([
    Category.find(includeInactive ? {} : { isActive: true })
      .sort({ order: 1, name: 1 })
      .lean(),
    issueCounts(),
  ]);
  res.json(categories.map((c) => toCategory(c, counts.get(String(c._id)) ?? 0)));
});

categoriesRouter.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const input = parse(categorySchema, req.body);
  const slug = slugify(input.name);
  if (await Category.exists({ slug })) throw conflict('A category with this name already exists');
  const category = await Category.create({ ...input, slug });
  res.status(201).json(toCategory(category.toObject()));
});

categoriesRouter.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const input = parse(updateCategorySchema, req.body);
  const id = idParam(req);
  if (!Types.ObjectId.isValid(id)) throw notFound('Category');
  const update: typeof input & { slug?: string } = { ...input };
  if (input.name) {
    const slug = slugify(input.name);
    const clash = await Category.exists({ slug, _id: { $ne: id } });
    if (clash) throw conflict('A category with this name already exists');
    update.slug = slug;
  }
  const category = await Category.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!category) throw notFound('Category');
  const counts = await issueCounts();
  res.json(toCategory(category, counts.get(String(category._id)) ?? 0));
});

categoriesRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = idParam(req);
  if (!Types.ObjectId.isValid(id)) throw notFound('Category');
  const inUse = await Issue.exists({ category: id });
  if (inUse) {
    throw conflict('This category has issues. Deactivate it instead so they keep their category.');
  }
  const deleted = await Category.findByIdAndDelete(id);
  if (!deleted) throw notFound('Category');
  res.status(204).end();
});
