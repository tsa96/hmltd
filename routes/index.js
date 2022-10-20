const express = require("express");
const router = express.Router();

const UserType = {
  Auth: 1,
  Subject: 2,
};

const randomDate = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const AUTHORITY_ROUTE = "authority6942";
const SUBJECT_ROUTE = "subject4956";

router.get("/", (req, res, _next) => res.render("no_login"));

router.get(`/${AUTHORITY_ROUTE}`, (req, res, _next) =>
  entry(req, res, UserType.Auth)
);

router.get(`/${SUBJECT_ROUTE}`, (req, res, _next) =>
  entry(req, res, UserType.Subject)
);

// This strategy for tracking auth is obviously lazy but should be good enough.
// If we have to restart the server, better to start at a random auth index than 0.
const users = {
  [UserType.Auth]: {
    data: require("../data/authority.json"),
  },
  [UserType.Subject]: {
    data: [], // TODO
  },
};

users[UserType.Auth] = {
  ...users[UserType.Auth],
  total: users[UserType.Auth].data.length,
  current: Math.floor(Math.random() * users[UserType.Auth].data.length),
};

users[UserType.Subject] = {
  ...[UserType.Subject],
  total: users[UserType.Subject].data.length,
  current: Math.floor(Math.random() * users[UserType.Subject].data.length),
};

const entry = (req, res, userType) => {
  let data;
  if (req.cookies && req.cookies["OrderData"]) {
    data = req.cookies["OrderData"];
    console.log(
      `GET SUCCESS: Found cookie for user with data\n\t${JSON.stringify(
        data,
        null,
        "\t"
      )}`
    );
  } else {
    const u = users[userType];
    const userData = u.data[u.current];
    if (u.current < u.total) u.current++;
    else u.current = 0;

    userData.dob = randomDate(new Date(1940, 1, 1), new Date(2000, 12, 31));
    userData.birthplace = "dunno yet";

    data = {
      userType: UserType.Auth,
      userData: userData,
    };

    console.log(
      `GET SUCCESS: Generated new user with data:\n\t${JSON.stringify(
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
      `SUBMIT ERROR: Missing expected data in submit/ body, something is going very wrong! Body is\n\t${JSON.stringify(
        req.body,
        null,
        "\t"
      )}`
    );
  }

  if (status !== "error") {
    console.log(
      `SUBMIT SUCCESS: User successfully generated PDF with data\n\t${JSON.stringify(
        userData,
        null,
        "\t"
      )}.`
    );
  } else {
    console.error(
      `SUBMIT ERROR: Error whilst generating PDF. User data is\n\t${JSON.stringify(
        userData,
        null,
        "\t"
      )}, error is\n\t${JSON.stringify(req.body.error)}`
    );
  }
});

module.exports = router;
