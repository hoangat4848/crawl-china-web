const _ = require("lodash");
const puppeteer = require('puppeteer');

const translateText = require('./puppeteer-google-translate.js');
const fetchedData = require("./data.js");

const PROCESS_ITEM_CHUNK_SIZE = 500;
const TRANSLATE_OPTIONS = { from: 'auto', to: 'en', timeout: 10000, headless: true };

// Agency name
// Province
// Type
// Address
// Phone
// Email
// Website (DYR)

// // Instantiates a client

// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const dataItems = fetchedData.data.contentList.content;


// const hasMailBoxItems = dataItems.filter(item => {
//     return (item.mailBox && emailRegex.test(item.mailBox));
// });
// const hasEnglishNameItems = dataItems.filter(item => item.englishName);
// const hasNoMailBoxItemNames = dataItems.filter(item => {
//     return !(item.mailBox && emailRegex.test(item.mailBox));
// }).map(item => item.name);

// // console.log(dataItems.length);
// // console.log(hasMailBoxItems.length);
// // console.log(hasEnglishNameItems.length);
// // console.log(hasNoMailBoxItemNames);
async function formatItems(items) {
  const translatedAgencyNames = await translateText(_.map(items, 'name'), TRANSLATE_OPTIONS);
  const translatedProvinceNames = await translateText(_.map(items, 'provinceName'), TRANSLATE_OPTIONS);
  const translatedAddresses = await translateText(_.map(items, 'localPath'), TRANSLATE_OPTIONS);;

  const formatItemPromises = items.map(async (i, index) => {
    const {name, provinceName, phone, mailBox, localPath } = i;

    return {
      agencyName: translatedAgencyNames[index],
      provinceName: translatedProvinceNames[index],
      type: "outbound",
      address: translatedAddresses[index],
      phone,
      email: (mailBox === '无' || !mailBox) ? "None" : mailBox,
    }

  });
  const formattedItems = await Promise.all(formatItemPromises)
  return formattedItems;
}

function findDuplicates(arr) {
  // Count occurrences of each element
  const counts = _.countBy(arr);

  // Filter keys with counts >= 2
  return Object.keys(counts)
    .filter(key => counts[key] >= 2)
    .map(key => (isNaN(key) ? key : Number(key))); // Convert numeric keys back to numbers if necessary
}

async function processData() {
  const cnAgencyNames = _.uniq(_.map(dataItems, 'name'));
  const cnProvinceNames = _.uniq(_.map(dataItems, 'provinceName'));
  const cnAddresses = _.uniq(_.map(dataItems, 'localPath'));
  // const asdasd = findDuplicates(_.map(dataItems, 'localPath'));
  const translatedAgencyNamesPromise = await translateText(cnAgencyNames, TRANSLATE_OPTIONS);
  const translatedProvinceNamesPromise = await translateText(cnProvinceNames, TRANSLATE_OPTIONS);
  const translatedAddressesPromise = await translateText(cnAddresses, TRANSLATE_OPTIONS);;
  // const asd = await Promise.all([translatedAgencyNamesPromise, translatedProvinceNamesPromise, translatedAddressesPromise]);

  // const chunkedItems = _.chunk(dataItems, PROCESS_ITEM_CHUNK_SIZE);
  // const processedItems = [];

  // for (const items of chunkedItems) {
  //   const formatted = await formatItems(items);
  //   processedItems.push(...formatted)
  // }

  console.log("DEBUGPRINT[4]: index.js:32: result=", processedItems);
}




processData();
