const parser = require("papaparse");
const axios = require("axios");
const fs = require("fs");
const prettier = require("prettier");

const NAMES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLTtsVf7KcGsfVmAf6zO2VF1isqoN-_MgwG_-RkEYsHrDHCaT0A5l6XI6xlJHE3Bg2VmVjCNABodv8/pub?gid=0&single=true&output=csv";
const SUBJ_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLTtsVf7KcGsfVmAf6zO2VF1isqoN-_MgwG_-RkEYsHrDHCaT0A5l6XI6xlJHE3Bg2VmVjCNABodv8/pub?gid=193588532&single=true&output=csv";
const AUTH_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLTtsVf7KcGsfVmAf6zO2VF1isqoN-_MgwG_-RkEYsHrDHCaT0A5l6XI6xlJHE3Bg2VmVjCNABodv8/pub?gid=209551052&single=true&output=csv";
const LOCATIONS_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLTtsVf7KcGsfVmAf6zO2VF1isqoN-_MgwG_-RkEYsHrDHCaT0A5l6XI6xlJHE3Bg2VmVjCNABodv8/pub?gid=1033778529&single=true&output=csv";

const getData = async (url) => {
  const res = await axios.get(url);
  return parser.parse(res.data, { header: true }).data;
};

const writeJSON = (fileName, data) => {
  fs.writeFileSync(
    `${__dirname}/data/${fileName}.json`,
    prettier.format(JSON.stringify(data).replace("’", "'"), { parser: "json" })
  );
};

const fetchAll = async () => {
  await Promise.all([
    (async () => {
      const nameData = await getData(NAMES_URL);
      nameData.forEach((item) => {
        if (!["m", "M", "f", "F", "nb", "NB"].includes(item.gender))
          item.gender = "nb";
        if (item.gender === "NB") item.gender = "nb";
        if (item.gender === "M") item.gender = "m";
        if (item.gender === "F") item.gender = "f";
      });
      writeJSON("names", nameData);
      console.log("Fetched names");
    })(),

    (async () => {
      const data = await getData(SUBJ_URL);
      data.forEach((item) => {
        item.bio = item.bio.replace(/%He%'s/g, "%He's%");
        item.bio = item.bio.replace(/%he%'s/g, "%he's%");
      });

      writeJSON("subject", data);
      console.log("Fetched subject");
    })(),

    (async () => {
      const data = await getData(AUTH_URL);
      data.forEach((item) => {
        item.bio = item.bio.replace(/%He%'s/g, "%He's%");
        item.bio = item.bio.replace(/%he%'s/g, "%he's%");
      });

      writeJSON("authority", data);
      console.log("Fetched authority");
    })(),

    (async () => {
      const data = await getData(LOCATIONS_URL);
      writeJSON(
        "locations",
        data.map((location) => location.location)
      );
      console.log("Fetched locations");
    })(),
  ]);
};

module.exports.fetchAll = fetchAll;
