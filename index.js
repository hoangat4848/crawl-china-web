const _ = require("lodash");
const puppeteer = require("puppeteer");
const fs = require("fs");
const ExcelJS = require("exceljs");

const { translateText, appendJsonData } = require("./puppeteer-google-translate.js");
const fetchedData = require("./data.js");

const PROCESS_ITEM_CHUNK_SIZE = 500;
const TRANSLATE_OPTIONS = {
  from: "auto",
  to: "en",
  timeout: 10000,
  headless: true,
};

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
  // const translatedAgencyNames = await translateText(_.map(items, 'name'), TRANSLATE_OPTIONS);
  // const translatedProvinceNames = await translateText(_.map(items, 'provinceName'), TRANSLATE_OPTIONS);
  // const translatedAddresses = await translateText(_.map(items, 'localPath'), TRANSLATE_OPTIONS);;

  const formatItemPromises = items.map(async (i, index) => {
    const { name, provinceName, phone, mailBox, localPath } = i;

    return {
      // agencyName: translatedAgencyNames[index],
      // provinceName: translatedProvinceNames[index],
      // type: "outbound",
      // address: translatedAddresses[index],
      // phone,
      // email: (mailBox === '无' || !mailBox) ? "None" : mailBox,
      //

      agencyName: name,
      provinceName: provinceName,
      type: "outbound",
      address: localPath,
      phone,
      email: mailBox === "无" || !mailBox ? "None" : mailBox,
      website: "",
    };
  });
  const formattedItems = await Promise.all(formatItemPromises);
  return formattedItems;
}

async function processData() {
  // const cnAgencyNames = _.uniq(_.map(dataItems, 'name'));
  // const cnProvinceNames = _.uniq(_.map(dataItems, 'provinceName'));
  // const cnAddresses = _.uniq(_.map(dataItems, 'localPath'));
  // const asdasd = findDuplicates(_.map(dataItems, 'localPath'));
  // const translatedAgencyNamesPromise = await translateText(cnAgencyNames, {...TRANSLATE_OPTIONS, fileName: "agencyNames"});
  // const translatedProvinceNamesPromise = await translateText(cnProvinceNames, TRANSLATE_OPTIONS);
  // const translatedAddressesPromise = await translateText(cnAddresses, TRANSLATE_OPTIONS);;
  // const asd = await Promise.all([translatedAgencyNamesPromise, translatedProvinceNamesPromise, translatedAddressesPromise]);

  const chunkedItems = _.chunk(dataItems, PROCESS_ITEM_CHUNK_SIZE);
  const processedItems = [];

  for (const items of chunkedItems) {
    const formatted = await formatItems(items);
    processedItems.push(...formatted);
  }
  return processedItems;
}

async function createExcel() {
  const data = await processData();

  // Create a new workbook
  const wb = new ExcelJS.Workbook();
  const wsheet = wb.addWorksheet("Agencies");

  // Add columns to the worksheet
  wsheet.columns = [
    { header: "Agency Name", key: "agencyName", width: 20 },
    { header: "Province Name", key: "provinceName", width: 20 },
    { header: "Type", key: "type", width: 15 },
    { header: "Address", key: "address", width: 30 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Email", key: "email", width: 25 },
    { header: "Website", key: "website", width: 30 },
  ];

  console.log("data: ", data);
  // Add rows to the worksheet
  data.forEach((item) => {
    wsheet.addRow(item);
  });

  // Save the Excel file
  const filePath = "agencies.xlsx";
  wb.xlsx
    .writeFile(filePath)
    .then(() => {
      console.log(`Excel file created at ${filePath}`);
    })
    .catch((error) => {
      console.error("Error creating Excel file:", error);
    });
}

async function generateTranslatedContent() {
  const savedAgencyNames = require("./agencyNames.json") || {};
  const savedProvinceNames = require("./provinceNames.json") || {};
  const savedAddresses = require("./addresses.json") || {};
  const cnAgencyNames = _.uniq(_.map(dataItems, 'name')).filter(str => !savedAgencyNames.hasOwnProperty(str));
  const cnProvinceNames = _.uniq(_.map(dataItems, 'provinceName')).filter(str => !savedProvinceNames.hasOwnProperty(str));
  const cnAddresses = _.uniq(_.map(dataItems, 'localPath')).filter(str => !savedProvinceNames.hasOwnProperty(str));

  const translatedAgencyNames = await translateText(cnAgencyNames, {
    ...TRANSLATE_OPTIONS,
    onBatchDone: async ({data}) => {
      await appendJsonData("agencyNames.json", data);
    }
  });

  const translatedProvinceNames = await translateText(cnProvinceNames, {
    ...TRANSLATE_OPTIONS,
    onBatchDone: async ({data}) => {
      await appendJsonData("provinceNames.json", data);
    }
  });

  const translatedAddresses = await translateText(cnAddresses, {
    ...TRANSLATE_OPTIONS,
    onBatchDone: async ({data}) => {
      await appendJsonData("addresses.json", data);
    }
  });

}

generateTranslatedContent();
