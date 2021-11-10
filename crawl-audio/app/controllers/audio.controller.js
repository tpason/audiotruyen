const db = require("../models");
import {
  checkExists,
  convertToSlug,
  removeHtmlTags,
  removeLineBreak,
} from "../utils";

const Category = db.categories;
const Audio = db.audio;
const Author = db.author;
const Crawler = require("crawler");

const TOP = ["Top Ngày", "Top Tuần", "Top Tháng", "Top Toàn Thời Gian"];

const getPainationHrefFromCategory = async () => {
  let hrefList = [];
  const categoriesSlug = [];
  const categories = await Category.find({}).select("pagination slug").lean();
  categories.map(({ pagination, slug }) => {
    hrefList = [...hrefList, ...pagination];
    categoriesSlug.push(slug);
  });
  return { hrefList, categoriesSlug };
};

const getHrefFromAudio = async () => {
  let hrefList = [];
  const audio = await Audio.find({}).select("url").lean();
  audio.map(({ url }) => {
    hrefList.push(url);
  });
  return { hrefList };
};
const getSlugFromAuthor = async () => {
  let slugList = [];
  const author = await Author.find({}).select("slug").lean();
  author.map(({ slug }) => {
    slugList.push(slug);
  });
  return { slugList };
};

// Retrieve all Tutorials from the database.
export const findAll = async (req, response) => {
  try {
    const sort = { createdAt: -1 };

    const page = req.query?.page || 1;
    const limit = req.query?.limit || 10;
    const options = { sort, page, limit, lean: true };

    const res = await Audio.paginate({}, options);
    response.status(200).send(res);
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
};
export const reUpdate = async (req, response) => {
  try {
    const hrefList = [];
    //check after
    const audio = await Audio.find({
      $or: [
        {
          // Check about no Company key
          audioList: {
            $exists: false,
          },
        },
        {
          // Check for null
          audioList: null,
        },
        {
          // Check for empty array
          audioList: {
            $size: 0,
          },
        },
      ],
    })
      .select("url")
      .lean();

    audio.map(({ url }) => {
      hrefList.push(url);
    });
    console.log(":::::hrefList", hrefList);
    // let { slugList: authorSlugs } = await getSlugFromAuthor();

    // const c = new Crawler({
    //   maxConnections: 10,
    //   // This will be called for each crawled page
    //   callback: async (error, res, done) => {
    //     if (error) {
    //       console.log(error);
    //     } else {
    //       const $ = res.$;
    //       let author = "";
    //       const audioList = [];
    //       let description = "";

    //       const imgLarge = $(".entry-thumbnail img").attr("data-src");
    //       const title = $("h1.entry-title").text();
    //       const countView = $(".post-views-count").text();
    //       const iframe = $("iframe").attr("data-src");
    //       const audioSlug = convertToSlug(title);
    //       $(".entry-content")
    //         .children("a")
    //         .each((i, el) => {
    //           const href = $(el).attr("href");
    //           const authorName = $(el).text();
    //           href.includes("tac-gia") && (author = authorName);
    //         });
    //       $(".entry-content.clearfix")
    //         .children("p")
    //         .each((i, el) => {
    //           const content = removeLineBreak(
    //             removeHtmlTags($(el).text().trim())
    //           );
    //           description = `${description}<br/>${content}`;
    //         });

    //       const authorSlug = convertToSlug(author);
    //       const isAuthorExists = checkExists({
    //         items: authorSlugs,
    //         item: authorSlug,
    //       });
    //       if (isAuthorExists) {
    //         // update Author list
    //         await Author.updateOne(
    //           { slug: authorSlug },
    //           {
    //             $addToSet: {
    //               audio: [audioSlug],
    //             },
    //           },
    //           {
    //             multi: true,
    //           }
    //         );
    //       } else {
    //         const item = {
    //           author,
    //           authorSlug,
    //           audio: [audioSlug],
    //         };
    //         // add author list
    //         Author.create(item);
    //       }

    //       $(".hap-playlist-item").each((i, el) => {
    //         const dataTitle = $(el).attr("data-title");
    //         const dataHref = $(el).attr("data-download");
    //         dataTitle && audioList.push({ title: dataTitle, href: dataHref });
    //       });
    //       audioList?.[0]?.href ||
    //         $("source").each((i, el) => {
    //           const dataHref = $(el).attr("src");
    //           dataHref && audioList.push({ href: dataHref });
    //         });

    //       // update audio detail
    //       await Audio.updateOne(
    //         { slug: audioSlug },
    //         {
    //           imgLarge,
    //           iframe,
    //           author,
    //           countView,
    //           description: description.length > 400 ? "" : description,
    //           audioList,
    //         }
    //       );
    //     }
    //     done();
    //   },
    // });

    // c.queue(hrefList);
    // response.status(200).send("Successful!");
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
};

// Create and Save a new Audio
exports.create = async (req, response) => {
  try {
    let { hrefList, categoriesSlug } = await getPainationHrefFromCategory();

    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: async (error, res, done) => {
        if (error) {
          console.log(error);
        } else {
          const categories = [];
          const audioList = [];
          const $ = res.$;

          $("article.mh-posts-list-item").each(async (i, el) => {
            let status = "";
            let quantity = "";
            const img = $(el)
              .children(".mh-posts-list-thumb")
              .children(".mh-thumb-icon")
              .children("img")
              .attr("data-src");
            const headerElement = $(el)
              .children(".mh-posts-list-content")
              .children("header.mh-posts-list-header");
            const title = headerElement.children("h2").text().trim();
            const audioSlug = convertToSlug(title);
            const url = headerElement.children("h2").children("a").attr("href");
            headerElement.children("a").each(async (i, el) => {
              const href = $(el).attr("href");
              const categoryTitle = $(el).text().trim();

              const slug = convertToSlug(categoryTitle);
              const isExists = checkExists({
                items: categories,
                item: categoryTitle,
              });
              const isIgnore = checkExists({
                items: TOP,
                item: categoryTitle,
              });

              if (href.includes("the-loai") && !isExists && !isIgnore) {
                categories.push(categoryTitle);
                const isCategoryExists = checkExists({
                  items: categoriesSlug,
                  item: slug,
                });
                if (isCategoryExists) {
                  // update category list
                  await Category.updateOne(
                    { slug },
                    {
                      $addToSet: {
                        audio: [audioSlug],
                      },
                    },
                    {
                      multi: true,
                    }
                  );
                } else {
                  //create new category
                  const item = {
                    title: categoryTitle,
                    href,
                    slug,
                    isNew: true,
                    audio: [audioSlug],
                  };

                  Category.create(item);
                }
              }

              href.includes("trang_thai") && (status = categoryTitle);
              href.includes("so_tap") && (quantity = categoryTitle);
            });

            const shortDescription = $(el)
              .children(".mh-posts-list-content")
              .children(".mh-posts-large-excerpt")
              .text()
              .trim();
            const item = {
              img,
              shortDescription,
              quantity,
              status,
              url,
              title,
              categories,
              slug: audioSlug,
            };
            audioList.push(item);
          });
          Audio.insertMany(audioList);
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

// Create and Save a new Audio
exports.update = async (req, response) => {
  try {
    let { hrefList } = await getHrefFromAudio();
    let { slugList: authorSlugs } = await getSlugFromAuthor();
    const c = new Crawler({
      maxConnections: 10,
      // This will be called for each crawled page
      callback: async (error, res, done) => {
        if (error) {
          console.log(error);
        } else {
          const $ = res.$;
          let author = "";
          const audioList = [];
          let description = "";

          const imgLarge = $(".entry-thumbnail img").attr("data-src");
          const title = $("h1.entry-title").text();
          const countView = $(".post-views-count").text();
          const iframe = $("iframe").attr("data-src");
          const audioSlug = convertToSlug(title);
          $(".entry-content")
            .children("a")
            .each((i, el) => {
              const href = $(el).attr("href");
              const authorName = $(el).text();
              href.includes("tac-gia") && (author = authorName);
            });
          $(".entry-content.clearfix")
            .children("p")
            .each((i, el) => {
              const content = removeLineBreak(
                removeHtmlTags($(el).text().trim())
              );
              description = `${description}<br/>${content}`;
            });

          const authorSlug = convertToSlug(author);
          const isAuthorExists = checkExists({
            items: authorSlugs,
            item: authorSlug,
          });
          if (isAuthorExists) {
            // update Author list
            await Author.updateOne(
              { slug: authorSlug },
              {
                $addToSet: {
                  audio: [audioSlug],
                },
              },
              {
                multi: true,
              }
            );
          } else {
            const item = {
              author,
              authorSlug,
              audio: [audioSlug],
            };
            // add author list
            Author.create(item);
          }

          $(".hap-playlist-item").each((i, el) => {
            const dataTitle = $(el).attr("data-title");
            const dataHref = $(el).attr("data-download");
            dataTitle && audioList.push({ title: dataTitle, href: dataHref });
          });
          audioList?.[0]?.href ||
            $("source").each((i, el) => {
              const dataHref = $(el).attr("src");
              dataHref && audioList.push({ href: dataHref });
            });

          // update audio detail
          await Audio.updateOne(
            { slug: audioSlug },
            {
              imgLarge,
              iframe,
              author,
              countView,
              description: description.length > 400 ? "" : description,
              audioList,
            }
          );
        }
        done();
      },
    });

    c.queue(hrefList);
    response.status(200).send("Successful!");
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
};
