const { Schema } = require('mongoose');
const mongoose = require('mongoose');

const schemaUser = new mongoose.Schema({
    username: {
        type:String,
        required: true,
        unique: true,
        minlength: 5
    },
    password: {
        type:String,
        required: true,
        minlength: 7
    },
    name: {
        type:String,
        default: null,
    },
    year: {
        type: Number,
        required: true,
    },
    subscribe: {
        type: Schema.Types.ObjectId,
        ref: 'subscribe',
        default: null
    },
    endSubscribe: {
        type: Number,
        default: null,
    },
    ticket: [{
        type: String,
        default: null,
    }]
}); // Complete

const schemaProduct = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    count: {
        type: Number,
        required: true,
    },
    weight: {
        type: Number,
        default: null,
    },
    height: {
        type: Number,
        default: null,
    },
    price: {
        type: Number,
        required: true,
    },
    status: String,
});

const schemaStorage = new mongoose.Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    repository: [{
        type: Schema.Types.ObjectId,
        ref: 'product'
    }], 
    space: {
        type: Number,
        default: 0
    },
    maxweight: {
        type: Number,
        default: 0,
    },
    maxheight: {
        type: Number,
        default: 0,
    }
});

const schemaSubscribe = new mongoose.Schema({
    name: String,
    description: String,
    add: Number,
    price: Number,
    limit: Number,
});

const schemaOrder = new mongoose.Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    order: [{
        type: Schema.Types.ObjectId,
        ref: 'product'
    }],
    in: {
        type: Schema.Types.ObjectId,
        ref: 'storage'
    },
    status: String,
    check: {
        type: String,
        default: "-"
    },
});

const Subscribe = mongoose.model("subscribe", schemaSubscribe);
const User = mongoose.model("user", schemaUser);
const Product = mongoose.model("product", schemaProduct);
const Storage = mongoose.model("storage", schemaStorage);
const Order = mongoose.model("order", schemaOrder);

module.exports = { User, Product, Storage, Order, Subscribe };