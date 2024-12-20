const puppeteer = require("puppeteer");
const _ = require("lodash");

const CHUNK_LIMIT = 50;
const BATCH_LIMIT = 5;

async function launch(opt) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: opt.headless === null ? true : opt.headless,
  });
  const [page] = await browser.pages();
  const timeout = opt.timeout === null ? 10000 : opt.timeout;

  return { browser, page, timeout: 0 };
}

function buildQuery(opt) {
  const { text, to, op } = opt;
  const from = opt.from || "auto";
  if (opt.op === "translate") {
    if (text.length > 5000)
      throw new Error(`Expected <= 5000 characters, received ${text.length}`);
    if (text.length === 0)
      throw new Error("Expected one or more character, received none");
  }
  return `?text=${encodeURIComponent(text)}&sl=${from}&tl=${to}&op=${op}`;
}

async function fromTextArray(query, opt) {
  const { browser, page, timeout } = await launch(opt);
  const inputSelector = ".er8xn";
  await page.goto("https://translate.google.com/?&tl=en");
  const result = {};
  for (let i = 0; i < query.length; i++) {
    try {
      console.log(`${i + 1}/${query.length}`)
      await page.type(inputSelector, query[i]);
      // await page.goto("https://translate.google.com/" + query[i]);
      const el = await page.waitForSelector("span>span>span[jsaction]", {
        timeout,
      });
      const translated = await el.evaluate((e) => e.textContent);
      console.log("🚀 ~ fromTextArray ~ translated:", translated)
      result[query[i]] = translated;

      // Clear the input field properly
      await page.evaluate(selector => {
        const input = document.querySelector(selector);
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, inputSelector);
    } catch (err) {
      await browser.close();
      throw err;
    }
  }
  await browser.close();
  return result;
}

async function translateText(text, opt) {
  const queryTexts = typeof text === "string" ? [text] : text;
  if (queryTexts.length === 0) return [];
  // const queryArr = queryTexts.map((t) =>
  //   buildQuery({
  //     text: t,
  //     to: opt.to || "en",
  //     from: opt.from || "auto",
  //     op: "translate",
  //   }),
  // );

  const queryArr = queryTexts;

  const querryChunks = _.chunk(queryArr, CHUNK_LIMIT);
  let mappedResults = {};
  for(let i = 0; i < querryChunks.length; i += BATCH_LIMIT) {
    const batch = querryChunks.slice(i, i + BATCH_LIMIT);
    // const chunk = querryChunks[i];

    const results = await Promise.all(batch.map(chunk => fromTextArray(chunk, {
      headless: opt.headless,
      timeout: opt.timeout,
    })));

    mappedResults = {
      ...mappedResults,
      ..._.merge({}, ...results),
    }
  }

  return queryTexts.reduce((acc, t) => {
    return {
      ...acc,
      [t]: mappedResults[t]
    }
  }, {})
}

module.exports = translateText;
