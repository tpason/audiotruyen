const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Crawler = require("crawler");

const serviceAccount = require("./crawler-audio-story-firebase-adminsdk-vhyob-56d8fc79be.json");
const app = express();

app.use(cors({ origin: true }));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const checkExists = ({ items, item }) => items.some((i) => item === i);
const convertToSlug = (str, whitespace = false) => {
  str = str.toLowerCase();

  str = str.replace(/(à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ)/g, "a");
  str = str.replace(/(è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ)/g, "e");
  str = str.replace(/(ì|í|ị|ỉ|ĩ)/g, "i");
  str = str.replace(/(ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ)/g, "o");
  str = str.replace(/(ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ)/g, "u");
  str = str.replace(/(ỳ|ý|ỵ|ỷ|ỹ)/g, "y");
  str = str.replace(/(đ)/g, "d");
  str = str.replace(/([^0-9a-z-\s])/g, "");
  if (whitespace === false) {
    str = str.replace(/(\s+)/g, "-");
  }
  str = str.replace(/^-+/g, "");
  str = str.replace(/-+$/g, "");
  return str;
};
const TOP = ["Top Ngày", "Top Tuần", "Top Tháng", "Top Toàn Thời Gian"];

app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

app.post("/create", (req, res) => {
  (async () => {
    try {
      await db
        .collection("items")
        .doc("/" + req.body.id + "/")
        .create({ item: req.body.item });
      return res.status(200).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// get all category and add database
app.get("/audio-story/crawl/category", (req, res) => {
  (async () => {
    try {
      const c = new Crawler({
        maxConnections: 10,
        // This will be called for each crawled page
        callback: async (error, res, done) => {
          if (error) {
            console.log(error);
          } else {
            const items = [];
            const $ = res.$;
            const createdAt = new Date().toISOString();
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
              const item = { title, href, id: i, slug, createdAt };
              await db
                .collection("category")
                .doc(`/${slug}/`)
                .set({ data: item }, { merge: true });
            });
          }
          done();
        },
      });

      c.queue("https://audiotruyenfull.com/");
      return res.status(200).send("Successful!");
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// update pagination of category
app.get("/audio-story/crawl/category/child/update-page", (req, res) => {
  (async () => {
    try {
      const hrefList = [];
      let query = db.collection("category");
      let categories = [];
      await query.get().then((querySnapshot) => {
        let docs = querySnapshot.docs;
        for (let doc of docs) {
          categories.push(doc.data());
        }
      });
      categories.map(({ data: { href } = {} }) => {
        hrefList.push(href);
      });

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
            const document = db.collection("category").doc(slug);
            await document.update({
              pagination,
            });
          }
          done();
        },
      });

      c.queue(hrefList);
      return res.status(200).send("Successful!");
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// update audio to category and add audio
app.get("/audio-story/crawl/category/child/update-audio", (req, res) => {
  (async () => {
    try {
      let hrefList = [];
      let query = db.collection("category");
      let categories = [];
      const categoriesSlug = [];
      await query.get().then((querySnapshot) => {
        let docs = querySnapshot.docs;
        for (let doc of docs) {
          categories.push(doc.data());
        }
      });
      categories.map(({ pagination, data: { slug } = {} }) => {
        hrefList = [...hrefList, ...pagination];
        categoriesSlug.push(slug);
      });

      const c = new Crawler({
        maxConnections: 10,
        // This will be called for each crawled page
        callback: async (error, res, done) => {
          if (error) {
            console.log(error);
          } else {
            const categories = [];
            const $ = res.$;
            const createdAt = new Date().toISOString();

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
              const url = headerElement
                .children("h2")
                .children("a")
                .attr("href");
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
                    await db
                      .collection("category")
                      .doc(`/${slug}/`)
                      .update({
                        audio: admin.firestore.FieldValue.arrayUnion(audioSlug),
                      });
                  } else {
                    //create new category
                    const item = {
                      title: categoryTitle,
                      href,
                      slug,
                      createdAt,
                      isNew: true,
                    };

                    await db
                      .collection("category")
                      .doc(`/${slug}/`)
                      .set(
                        { data: item, audio: [{ audioSlug }] },
                        { merge: true }
                      );
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
                createdAt,
              };
              // add audio list
              await db
                .collection("audio")
                .doc(`/${audioSlug}/`)
                .set(item, { merge: true });
            });
          }
          done();
        },
      });

      c.queue(hrefList);
      return res.status(200).send("Successful!");
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// update audio detail and add author
app.get("/audio-story/crawl/category/child/update-audio/detail", (req, res) => {
  (async () => {
    try {
      let hrefList = [];
      let query = db.collection("audio");
      let authorQuery = db.collection("author");
      let audioList = [];
      let authorList = [];
      const authorSlugs = [];
      await query.get().then((querySnapshot) => {
        let docs = querySnapshot.docs;
        for (let doc of docs) {
          audioList.push(doc.data());
        }
      });
      audioList.map(({ url }) => {
        hrefList.push(url);
      });
      await authorQuery.get().then((querySnapshot) => {
        let docs = querySnapshot.docs;
        for (let doc of docs) {
          authorList.push(doc.data());
        }
      });
      authorList.map(({ data: { slug } = {} }) => {
        authorSlugs.push(slug);
      });

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
            const createdAt = new Date().toISOString();
            const updatedAt = new Date().toISOString();
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
            $(".entry-content")
              .children("p")
              .each((i, el) => {
                const content = $(el).text();
                description = `${description}<br/>${content}`.trim();
              });

            const authorSlug = convertToSlug(author);
            const isAuthorExists = checkExists({
              items: authorSlugs,
              item: authorSlug,
            });
            if (isAuthorExists) {
              // update category list
              await db
                .collection("author")
                .doc(`/${authorSlug}/`)
                .update({
                  audio: admin.firestore.FieldValue.arrayUnion(audioSlug),
                });
            } else {
              const item = {
                author,
                authorSlug,
                createdAt,
              };
              // add author list
              await db
                .collection("author")
                .doc(`/${authorSlug}/`)
                .set({ data: item, audio: [{ audioSlug }] }, { merge: true });
            }

            $(".hap-playlist-item").each((i, el) => {
              const dataTitle = $(el).attr("data-title");
              const dataHref = $(el).attr("data-download");
              dataTitle && audioList.push({ title: dataTitle, href: dataHref });
            });

            await db.collection("audio").doc(`/${audioSlug}/`).update({
              updatedAt,
              imgLarge,
              iframe,
              author,
              countView,
              description,
              audioList,
            });
          }
          done();
        },
      });

      c.queue(hrefList);
      return res.status(200).send("Successful!");
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

exports.app = functions.https.onRequest(app);
