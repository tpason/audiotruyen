module.exports = (app) => {
  const categories = require("../controllers/category.controller.js");

  var router = require("express").Router();

  // Create a new Category
  router.post("/", categories.create);
  // Update a new Category
  router.put("/", categories.update);

  app.use("/api/category", router);
};
