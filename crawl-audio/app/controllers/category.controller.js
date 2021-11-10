const db = require("../models");
import { checkExists, convertToSlug } from "../utils";

const Category = db.categories;
const Crawler = require("crawler");

const TOP = ["Top Ngày", "Top Tuần", "Top Tháng", "Top Toàn Thời Gian"];

// Create and Save a new Category
exports.create = (req, response) => {
  try {
    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: async (error, res, done) => {
        if (error) {
          console.log(error);
        } else {
          const items = [];
          const data = [];
          const $ = res.$;
          // $ is Cheerio by default
          //a lean implementation of core jQuery designed specifically for the server
          $(".sub-menu LI A").each(async (i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr("href");
            const isExists = checkExists({ items, item: title });
            const isIgnore = checkExists({ items: TOP, item: title });
            if (isExists || isIgnore) {
              return;
            }
            items.push(title);
            const slug = convertToSlug(title);
            const item = { title, href, id: i, slug };
            data.push(item);
          });
          // Save Category in the database
          Category.insertMany(data)
            .then((data) => {
              response.send(data);
            })
            .catch((err) => {
              response.status(500).send({
                message:
                  err.message ||
                  "Some error occurred while creating the Category.",
              });
            });
        }
        done();
      },
    });

    c.queue("https://audiotruyenfull.com/");
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
};

const getHrefFromCategory = async () => {
  const hrefList = [];
  const categories = await Category.find({}).select("href");

  categories.map(({ href }) => {
    hrefList.push(href);
  });
  return hrefList;
};

// Update Category
export const update = async (req, response) => {
  try {
    const hrefList = (await getHrefFromCategory()) || [];

    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: async (error, res, done) => {
        if (error) {
          console.log(error);
        } else {
          const pagination = [];
          const $ = res.$;
          const titlePage = $("h1.page-title").text().trim();
          const slug = convertToSlug(titlePage);
          // $ is Cheerio by default
          //a lean implementation of core jQuery designed specifically for the server
          const paginationElement = $(".nav-links")
            .children("a.page-numbers")
            .slice(1);
          const paginationElementHref =
            paginationElement.attr("href") ||
            `https://audiotruyenfull.com/the-loai/${slug}/page/1/`;
          const arrHref = paginationElementHref.split("/");
          const paginationElementText = arrHref[arrHref.length - 2] || 1;

          for (let i = 1; i <= paginationElementText; i++) {
            const paginationUrl = paginationElementHref.replace(
              paginationElementText,
              i
            );
            pagination.push(paginationUrl);
          }

          await Category.updateOne({ slug }, { pagination });
        }
        done();
      },
    });

    c.queue(hrefList);
    response.send("Successful!!");
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
};
