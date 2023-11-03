const ServerError = require('../errors/ServerError');
const { Items } = require('../models/item');
const NotFoundError = require('../errors/NotFoundError');

module.exports.getItems = (req, res, next) => {
    Items.find()
    .then((cards) => {
      res.send(cards);
    })
    .catch((err) => next(new ServerError(err.message)));
};

module.exports.getItemsById = (req, res, next) => {
  const itemId = req.params.id;
  Items.findOne({ id: itemId })
    .then((item) => {
      if (!item) {
        throw new NotFoundError('Товар не найден');
      }
      res.send(item);
    })
    .catch((err) => next(new ServerError(err.message)));
};
