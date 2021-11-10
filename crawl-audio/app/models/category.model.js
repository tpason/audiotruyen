module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      title: String,
      href: String,
      slug: String,
      pagination: Array,
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

  const Category = mongoose.model("category", schema);
  return Category;
};
