module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      name: String,
      slug: String,
      audio: Array,
    },
    { timestamps: true }
  );

  //convert _id => id
  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Author = mongoose.model("author", schema);
  return Author;
};
