import AutoIncrementFactory from "mongoose-sequence";
import mongoosePaginate from "mongoose-paginate-v2";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

module.exports = (mongoose) => {
  var schema = mongoose.Schema(
    {
      title: String,
      img: String,
      imgLarge: String,
      iframe: String,
      author: String,
      countView: String,
      description: String,
      shortDescription: String,
      status: String,
      url: String,
      slug: String,
      quantity: Number,
      categories: Array,
      audioList: Array,
    },
    { timestamps: true }
  );

  //convert _id => id
  schema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });
  const AutoIncrement = AutoIncrementFactory(mongoose);
  schema.plugin(mongoosePaginate);
  schema.plugin(aggregatePaginate);

  schema.plugin(AutoIncrement, { inc_field: "id" });

  const Audio = mongoose.model("audio", schema);

  return Audio;
};
