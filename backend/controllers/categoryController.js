const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      isActive = 'true',
      sort = 'order',
    } = req.query;

    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 50;

    console.log('📋 Get categories request:', {
      page: pageInt,
      limit: limitInt,
      search,
      isActive,
      sort,
      requester: req.user ? req.user._id : 'anonymous',
    });

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    // Determine sort order
    let sortOption = {};
    switch (sort) {
      case 'name':
        sortOption = { name: 1 };
        break;
      case 'issues':
        sortOption = { 'metadata.issueCount': -1 };
        break;
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { order: 1, name: 1 };
    }

    const categories = await Category.find(query)
      .populate('parent', 'name displayName icon')
      .sort(sortOption)
      .limit(limitInt)
      .skip((pageInt - 1) * limitInt);

    const total = await Category.countDocuments(query);

    console.log('✅ Categories fetched:', {
      count: categories.length,
      total,
      firstCategory: categories[0] || null,
    });

    res.json({
      success: true,
      data: categories,
      pagination: {
        total,
        totalPages: Math.ceil(total / limitInt),
        currentPage: pageInt,
        limit: limitInt,
      },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories',
      error: error.message,
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
  try {
    console.log('📋 Get category request:', { id: req.params.id });

    const category = await Category.findById(req.params.id).populate(
      'parent',
      'name displayName icon color',
    );

    if (!category) {
      console.warn('⚠️ Category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Get subcategories if any
    const subcategories = await Category.find({ parent: category._id }).sort({
      order: 1,
      name: 1,
    });

    console.log('✅ Category fetched:', {
      id: category._id,
      subcount: subcategories.length,
    });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories,
      },
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching category',
      error: error.message,
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    console.log('📋 Create category request:', {
      body: req.body,
      requester: req.user ? req.user._id : 'anonymous',
    });

    const { name, displayName, description, icon, color, parent, order } =
      req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: name.toLowerCase().trim(),
    });

    if (existingCategory) {
      console.warn('⚠️ Create failed - duplicate name:', name);
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
      });
    }

    // If parent is provided, verify it exists
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }

    const category = await Category.create({
      name: name.toLowerCase().trim(),
      displayName: displayName || name,
      description: description || '',
      icon: icon || '📁',
      color: color || '#667eea',
      parent: parent || null,
      order: order || 0,
      isActive: true,
      metadata: { issueCount: 0, resolvedCount: 0 },
    });

    console.log('✅ Category created:', {
      id: category._id,
      name: category.name,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating category',
      error: error.message,
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    console.log('📋 Update category request:', {
      id: req.params.id,
      body: req.body,
    });

    const category = await Category.findById(req.params.id);

    if (!category) {
      console.warn('⚠️ Update failed - category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const {
      name,
      displayName,
      description,
      icon,
      color,
      parent,
      order,
      isActive,
    } = req.body;

    // Check if new name conflicts with existing category
    if (name && name.toLowerCase() !== category.name) {
      const existingCategory = await Category.findOne({
        name: name.toLowerCase().trim(),
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        console.warn('⚠️ Update failed - duplicate name:', name);
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }
    }

    // Prevent setting parent to self or creating circular reference
    if (parent) {
      if (parent.toString() === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
        });
      }

      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found',
        });
      }

      // Check for simple circular reference (parent->parent == this)
      if (
        parentCategory.parent &&
        parentCategory.parent.toString() === req.params.id
      ) {
        return res.status(400).json({
          success: false,
          message: 'Circular reference detected',
        });
      }
    }

    // Update fields
    if (name) category.name = name.toLowerCase().trim();
    if (displayName) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (color) category.color = color;
    if (parent !== undefined) category.parent = parent || null;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    console.log('✅ Category updated:', { id: category._id });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating category',
      error: error.message,
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    console.log('📋 Delete category request:', { id: req.params.id });

    const category = await Category.findById(req.params.id);

    if (!category) {
      console.warn('⚠️ Delete failed - category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has issues
    const Issue = require('../models/Issue');
    const issueCount = await Issue.countDocuments({ category: req.params.id });

    if (issueCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${issueCount} issue(s) are using this category. Please reassign or delete those issues first.`,
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({
      parent: req.params.id,
    });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${subcategoryCount} subcategory(ies). Please delete or reassign subcategories first.`,
      });
    }

    await category.deleteOne();

    console.log('✅ Category deleted:', { id: req.params.id });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting category',
      error: error.message,
    });
  }
};

// @desc    Toggle category active status
// @route   PATCH /api/categories/:id/toggle
// @access  Private/Admin
const toggleCategoryStatus = async (req, res) => {
  try {
    console.log('📋 Toggle category status request:', { id: req.params.id });

    const category = await Category.findById(req.params.id);

    if (!category) {
      console.warn('⚠️ Toggle failed - category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    console.log('✅ Category status toggled:', {
      id: category._id,
      isActive: category.isActive,
    });

    // Return full category object (as requested)
    res.json({
      success: true,
      message: `Category ${
        category.isActive ? 'activated' : 'deactivated'
      } successfully`,
      data: category,
    });
  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling category status',
      error: error.message,
    });
  }
};

// @desc    Get category statistics
// @route   GET /api/categories/:id/stats
// @access  Public
const getCategoryStats = async (req, res) => {
  try {
    console.log('📋 Get category stats request:', { id: req.params.id });

    const category = await Category.findById(req.params.id);

    if (!category) {
      console.warn('⚠️ Stats failed - category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const Issue = require('../models/Issue');

    const stats = await Issue.aggregate([
      { $match: { category: category._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsObj = {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      rejected: 0,
    };

    stats.forEach((stat) => {
      // convert keys like 'in-progress' => 'inProgress'
      const key = stat._id.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      statsObj[key] = stat.count;
      statsObj.total += stat.count;
    });

    // Update category metadata
    category.metadata = category.metadata || {};
    category.metadata.issueCount = statsObj.total;
    category.metadata.resolvedCount =
      (statsObj.resolved || 0) + (statsObj.closed || 0);
    await category.save();

    console.log('✅ Category stats calculated:', {
      id: category._id,
      total: statsObj.total,
    });

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name,
          displayName: category.displayName,
          icon: category.icon,
          color: category.color,
        },
        statistics: statsObj,
      },
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message,
    });
  }
};

// @desc    Get all categories with statistics
// @route   GET /api/categories/stats/all
// @access  Public
const getAllCategoriesStats = async (req, res) => {
  try {
    console.log('📋 Get all categories stats request');

    const Issue = require('../models/Issue');

    const stats = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 1,
          name: '$category.name',
          displayName: '$category.displayName',
          icon: '$category.icon',
          color: '$category.color',
          total: 1,
          open: 1,
          inProgress: 1,
          resolved: 1,
          closed: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    console.log('✅ All categories stats fetched:', { count: stats.length });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get all categories stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message,
    });
  }
};

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private/Admin
const reorderCategories = async (req, res) => {
  try {
    console.log('📋 Reorder categories request:', { body: req.body });

    const { categories } = req.body; // Array of { id, order }

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array',
      });
    }

    // Update all categories order
    const updatePromises = categories.map(({ id, order }) =>
      Category.findByIdAndUpdate(id, { order }),
    );

    await Promise.all(updatePromises);

    console.log('✅ Categories reordered:', { count: categories.length });

    res.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reordering categories',
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoryStats,
  getAllCategoriesStats,
  reorderCategories,
};
