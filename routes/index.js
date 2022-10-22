const express = require("express");
const router = express.Router();

const Locations = require("../data/locations.json");
const Names = require("../data/names.json");

// This file is chaos but whatever, no need to over-engineer.

const UserTypes = {
  Auth: 1,
  Subject: 2,
};

const randomDate = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const AUTHORITY_ROUTE = "authority6942";
const SUBJECT_ROUTE = "subject4956";

router.get("/", (req, res, _next) => res.render("no_login"));

router.get(`/${AUTHORITY_ROUTE}`, (req, res, _next) =>
  entry(req, res, UserTypes.Auth)
);

router.get(`/${SUBJECT_ROUTE}`, (req, res, _next) =>
  entry(req, res, UserTypes.Subject)
);

// This strategy for tracking auth is obviously lazy but should be good enough.
// If we have to restart the server, better to start at a random auth index than 0.
const roles = {
  [UserTypes.Auth]: {
    data: require("../data/authority.json"),
  },
  [UserTypes.Subject]: {
    data: require("../data/subject.json"),
  },
};

roles[UserTypes.Auth] = {
  ...roles[UserTypes.Auth],
  total: roles[UserTypes.Auth].data.length,
  current: Math.floor(Math.random() * roles[UserTypes.Auth].data.length),
};

roles[UserTypes.Subject] = {
  ...roles[UserTypes.Subject],
  total: roles[UserTypes.Subject].data.length,
  current: Math.floor(Math.random() * roles[UserTypes.Subject].data.length),
};

const entry = (req, res, userType) => {
  let data;
  // TODO: use node_env
  // TODO!!!!!: DELETE TO ENABLE COOKIES
  if (req.cookies && req.cookies["OrderData"] && false) {
    data = req.cookies["OrderData"];
    console.log(
      `GET SUCCESS: Found cookie for user with data\n\t${JSON.stringify(
        data,
        null,
        "\t"
      )}`
    );
  } else {
    // Grab the role and bio first, then we'll add in the extra shit
    const r = roles[userType];
    const userData = r.data[r.current];

    if (r.current < r.total) r.current++;
    else r.current = 0;

    userData.dob = randomDate(new Date(2036, 1, 1), new Date(2100, 12, 31));
    userData.birthplace =
      Locations[Math.floor(Math.random() * Locations.length)];
    name = randomElement(Names);
    userData.name = name.name;

    const multiReplace = (str, mappings) => {
      Object.entries(mappings).forEach(
        ([token, string]) =>
          (str = str.replace(new RegExp(`%${token}%`, "g"), string))
      );
      return str;
    };

    userData.bio = multiReplace(userData.bio, {
      fullName: name.name,
      // This method won't handle certain names well (e.g. Dr. Foo Bar) but fine for our current names
      firstName: name.name.split(" ")[0],
    });

    if (name.gender === "m") {
      // Kinda crappy replace method but whatever, good enough.
      userData.bio = multiReplace(userData.bio, {
        He: "He",
        he: "he",
        "He's": "He's",
        "he's": "he's",
        His: "His",
        his: "his",
        him: "him",
      });
    } else if (name.gender === "f") {
      userData.bio = multiReplace(userData.bio, {
        He: "She",
        he: "she",
        "He's": "She's",
        "he's": "she's",
        His: "Her",
        his: "her",
        him: "her",
      });
    }
    // Default to they, nb representation etc
    else {
      userData.bio = multiReplace(userData.bio, {
        He: "They",
        he: "they",
        "He's": "They've",
        "he's": "they've",
        His: "Their",
        his: "their",
        him: "them",
      });
    }

    data = {
      userType: userType,
      userData: userData,
    };

    console.log(
      `GET SUCCESS: Generated new user with data:\n${JSON.stringify(
        data,
        null,
        "\t"
      )}`
    );

    res.cookie("OrderData", data, {
      expires: new Date("10 25 2022"),
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  }
  res.render("entry", data);
};

router.post("/submit", (req, res, _next) => {
  const status = req.body.status;
  const userData = req.body.data;

  if (!req.body.status || !req.body.data) {
    console.error(
      `SUBMIT ERROR: Missing expected data in submit/ body, something is going very wrong! Body is\n${JSON.stringify(
        req.body,
        null,
        "\t"
      )}`
    );
  }

  if (status !== "error") {
    console.log(
      `SUBMIT SUCCESS: User successfully generated PDF with data\n${JSON.stringify(
        { userData: userData, statusData: req.body.statusData },
        null,
        "\t"
      )}.`
    );
  } else {
    console.error(
      `SUBMIT ERROR: Error whilst generating PDF. User data is\n${JSON.stringify(
        userData,
        null,
        "\t"
      )}, error is\n\t${JSON.stringify(req.body.error)}`
    );
  }
});

module.exports = router;
