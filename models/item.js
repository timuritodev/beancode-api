const mongoose = require('mongoose');

const itemsSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
//   size: {
//     type: String,
//     required: true,
//   },
  price: {
    type: String,
    required: true,
  },
//   quantity: {
//     type: Number,
//     required: true,
//   },
  is_favorite: {
    type: Boolean,
    required: true,
  },
  is_bin: {
    type: Boolean,
    required: true,
  },
}, { versionKey: false });

module.exports = {
  Items: mongoose.model('items', itemsSchema),
};
