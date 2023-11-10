const ServerError = require('../errors/ServerError');
const { Products } = require('../models/product');
const NotFoundError = require('../errors/NotFoundError');

module.exports.getProducts = (req, res, next) => {
    Products.find()
    .then((cards) => {
      res.send(cards);
    })
    .catch((err) => next(new ServerError(err.message)));
};

module.exports.getProductsById = (req, res, next) => {
  const itemId = req.params.id;
  Products.findOne({ id: itemId })
    .then((item) => {
      if (!item) {
        throw new NotFoundError('Товар не найден');
      }
      res.send(item);
    })
    .catch((err) => next(new ServerError(err.message)));
};
