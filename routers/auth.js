const bcrypt = require("bcrypt");
const { Router } = require("express");
const { toJWT } = require("../auth/jwt");
const authMiddleware = require("../auth/middleware");
const User = require("../models/").user;
const { SALT_ROUNDS } = require("../config/constants");
const Store = require("../models/").store;
const Transaction = require("../models").transaction;
const router = new Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .send({ message: "Please provide both: email and password" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).send({
        message: "User with that email not found or password incorrect",
      });
    }

    delete user.dataValues["password"]; // don't send back the password hash
    const token = toJWT({ userId: user.id });

    if (user.isStore) {
      const store = await Store.findOne({
        where: {
          userId: user.id,
        },
        include: { model: Transaction },
      });

      if (store) {
        return res
          .status(200)
          .send({ token, ...user.dataValues, store: store });
      }
    }

    return res.status(200).send({ token, ...user.dataValues });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ message: "Something went wrong, sorry" });
  }
});

router.post("/signup", async (req, res) => {
  const { email, password, name, isStore, stampLimit } = req.body;
  if (!email || !password || !name) {
    return res.status(400).send("Please provide an email, password and a name");
  }

  try {
    const newUser = await User.create({
      email,
      password: bcrypt.hashSync(password, SALT_ROUNDS),
      name,
      isStore,
    });

    delete newUser.dataValues["password"]; // don't send back the password hash

    const token = toJWT({ userId: newUser.id });

    if (isStore) {
      const userStore = await Store.create({
        name: newUser.name,
        userId: newUser.id,
        stampLimit: stampLimit,
      });
      res.status(201).json({
        token,
        ...newUser.dataValues,
        store: { ...userStore.dataValues },
      });
    }

    if (!isStore) {
      res.status(201).json({ token, ...newUser.dataValues });
    }
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .send({ message: "There is an existing account with this email" });
    }
    console.log("error:", error);
    return res.status(400).send({ message: "Something went wrong, sorry" });
  }
});

// The /me endpoint can be used to:
// - get the users email & name using only their token
// - checking if a token is (still) valid
router.get("/me", authMiddleware, async (req, res) => {
  // don't send back the password hash
  delete req.user.dataValues["password"];
  const user = req.user;
  if (user.isStore) {
    const store = await Store.findOne({
      where: {
        userId: user.id,
      },
      include: { model: Transaction },
    });
    if (store) {
      res.status(200).send({ ...req.user.dataValues, store: store });
      return;
    }
  }

  res.status(200).send({ ...req.user.dataValues });
});

module.exports = router;
