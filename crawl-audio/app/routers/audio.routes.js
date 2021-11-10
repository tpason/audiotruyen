module.exports = (app) => {
  const audio = require("../controllers/audio.controller.js");

  var router = require("express").Router();

  // Create a new Audio
  router.get("/", audio.findAll);
  router.post("/", audio.create);
  router.post("/re-update", audio.reUpdate);
  router.put("/", audio.update);

  app.use("/api/audio", router);
};
