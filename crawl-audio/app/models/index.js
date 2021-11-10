const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.tutorials = require("./tutorial.model.js")(mongoose);
db.categories = require("./category.model.js")(mongoose);
db.audio = require("./audio.model.js")(mongoose);
db.author = require("./author.model.js")(mongoose);

module.exports = db;
