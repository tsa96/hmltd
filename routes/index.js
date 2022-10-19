const express = require("express");
const fs = require("fs");
const router = express.Router();
const authData = require("../data/authority.json");

const UserType = {
  Auth: 1,
  Subject: 2,
};

const AUTHORITY_ROUTE = "1f0a22a9";
const SUBJECT_ROUTE = "6d81bce1";

// This strategy for tracking auth is obviously lazy but should be good enough.
// If we have to restart the server, better to start at a random auth index than 0.
const totalAuth = authData.length;
let currentAuth = Math.floor(Math.random() * totalAuth);

router.get("/", (req, res, next) => res.render("no_login"));

router.get(`/${AUTHORITY_ROUTE}`, (req, res, next) => {
  const userData = authData[currentAuth];
  if (currentAuth < totalAuth) currentAuth++;
  else currentAuth = 0;
  console.log(userData)
  res.render("entry", { userType: UserType.Auth, userData: userData });
});

// router.post(`/enter`, (req, res, next) => {
//   const form = formidable({});
//
//   form.parse(req, (err, fields, files) => {
//     if (err) {
//       next(err);
//       return;
//     }
//
//     const image = files.image;
//
//     if (!image) next(new Error("Missing image"));
//   });
//
//   if (!Object.values(UserType).includes(userType))
//     next(new Error("Bad user type"));
//
//   res.send({});
// });

module.exports = router;
