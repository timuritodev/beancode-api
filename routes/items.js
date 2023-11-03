const router = require('express').Router();
const { getItems, getItemsById } = require('../controllers/items');

router.get('/', getItems);
router.get('/:id', getItemsById);

module.exports = router;
