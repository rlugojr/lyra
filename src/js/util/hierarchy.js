'use strict';

var store = require('../store'),
    state = store.getState(),
    getIn = require('./immutable-utils').getIn;

/**
 * Find the parent item for a given mark.
 *
 * @param {ImmutableMap} mark - A mark for which to return the parent mark
 * @returns {ImmutableMap|null} The requested mark, if present, else null
 */
function getParent(mark) {
  // Require ctrl in here to sidestep circular dependency issue
  return getIn(state, 'marks.' + mark.get('_parent')) || null;
}

/**
 * Get all parent nodes for a given primitive in the Lyra hierarchy, i.e. all
 * groups which may be considered to be ancestors of the provided primitive.
 *
 * @param  {ImmutableMap} primitive - The primitive for which to return ancestors.
 * @returns {ImmutableMap[]} An array of primitives.
 */
function getParents(primitive) {
  if (!primitive) {
    return [];
  }
  var current = primitive.get('_parent') && getParent(primitive);
  if (!current) {
    return [];
  }
  var parents = [current];
  while (current && current.get('_parent')) {
    current = getParent(current);
    if (current) {
      parents.push(current);
    }
  }
  return parents;
}

/**
 * Pluck the IDs from any group layers within the provided array of primitives.
 *
 * @param {ImmutableMap[]} primitives - An array of primitives
 * @returns {Array} Array of group mark IDs
 */
function getGroupIds(primitives) {
  return primitives.reduce(function(groupIds, primitive) {
    if (primitive.type === 'group') {
      groupIds.push(primitive.get('_id'));
    }
    return groupIds;
  }, []);
}

/**
 * Wrap a commonly chained sequence of hierarchy inquiries: take a primitive,
 * find all its parents, and return an array of those parents' IDs.
 *
 * @param {number} markId - The ID of a mark for which to return parent layer IDs.
 * @returns {number[]} An array of the (lyra) IDs of the primitive's parent layers.
 */
function getParentGroupIds(markId) {
  return getGroupIds(getParents(getIn(state, 'marks.' + markId)));
}

/**
 * Given a Vega scene graph root node and an array representing the path to a
 * desired item, walk the scene graph to find that desired item and return its
 * Vega scene graph representation.
 *
 * @param  {Object} item The root vega-scenegraph Item.
 * @param  {number[]} path An array of Lyra Primitive IDs to walk down.
 * @returns {Object|null} The matched item, or null;
 */
function findInItemTree(item, path) {
  var id, items, i, j, len;
  for (i = path.length - 1; i >= 0; --i) {
    id = path[i];

    for (items = item.items, j = 0, len = items.length; j < len; ++j) {
      // The Vega scene graph structure alternates between definition nodes
      // which hold the vega spec for a mark, and each of the item nodes (one
      // per visualized element). This logic handles that alternation.
      item = items[j].def.lyra_id === id ? items[j].items[0] : null;
      if (item !== null) {
        break;
      }
    }

    if (item === null) {
      break;
    }
  }
  return item;
}

module.exports = {
  getParent: getParent,
  getParentGroupIds: getParentGroupIds,
  getParents: getParents,
  getGroupIds: getGroupIds,
  findInItemTree: findInItemTree
};
