const { Router } = require("express");
const Transactions = require("../models").transaction;
const Bean = require("../models").bean;
const User = require("../models").user;
const Store = require("../models").store;
const Voucher = require("../models").voucher;
const { validateToken } = require("../qrcode");
const authMiddleware = require("../auth/middleware");
const _ = require("lodash");
const moment = require("moment");

const router = new Router();

router.get("/", async (req, res, next) => {
  try {
    const transactions = await Transactions.findAll({
      include: { model: User },
    });
    res.send(transactions);
  } catch (e) {
    next(e);
  }
});

router.get("/:storeId", authMiddleware, async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    const cardTransactions = await Transactions.findAll({
      include: [Bean, Store],
      where: {
        storeId,
        userId,
      },
    });

    // console.log("Card transactions:", cardTransactions[0].store);
    const lastTransaction = cardTransactions[cardTransactions.length - 1];
    const bean = lastTransaction ? lastTransaction.bean : undefined;
    const total = cardTransactions //suma de todas las transactiones por id
      .map((t) => parseInt(t.quantity))
      .reduce((a, b) => a + b);

    const stampLimit = cardTransactions[0].store.stampLimit;
    const currentStamps = total % stampLimit;
    const cardResponse = {
      currentStamps: currentStamps,
      total: total,
      lastBean: bean,
      store: cardTransactions[0].store.name,
      stampLimit: stampLimit,
    };
    res.send(cardResponse);
  } catch (e) {
    next(e);
  }
});

router.get("/mycards/:userId", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const transactions = await Transactions.findAll({
      include: { model: Store },
      where: {
        userId: userId,
      },
    });
    const result = {}; // store: number_of_coffees

    transactions.forEach((transaction) => {
      const t_quantity = parseInt(transaction.quantity);
      if (transaction.storeId in result) {
        result[transaction.storeId] = {
          ...result[transaction.storeId],
          quantity: result[transaction.storeId].quantity + t_quantity,
        };
      } else {
        result[transaction.storeId] = {
          store_id: transaction.storeId,
          store_name: transaction.store.name,
          stampLimit: transaction.store.stampLimit,
          quantity: t_quantity,
        };
      }
    });
    const resultArray = Object.values(result);
    const resultArrayProcessed = resultArray.map((storeInfo) => ({
      ...storeInfo,
      stamps: storeInfo.quantity % storeInfo.stampLimit,
    }));
    if (resultArrayProcessed.length == 0) {
      res.send("No cards");
    }
    res.send(resultArrayProcessed);
  } catch (e) {
    console.log(e.message);
    next(e);
  }
});

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { storeuser, quantity, bean, token } = req.query;
    const storeForUser = await Store.findByPk(storeuser);
    if (validateToken(token, storeuser, quantity, bean)) {
      // create new transaction
      // if modulus is 0 but total is more then 0 then create new voucher for a user
      // 55 % 5 = 0
      const userId = req.user.id;
      const newTransaction = await Transactions.create({
        storeId: storeForUser.id,
        userId: req.user.id,
        quantity: quantity,
        beanId: bean,
      });
      const allTransactions = await Transactions.findAll();
      const total = allTransactions
        .map((t) => parseInt(t.quantity))
        .reduce((a, b) => a + b);

      const stampStore = storeForUser;
      const stampLimit = stampStore.stampLimit;
      const currentStamps = total % stampLimit;
      const userVouchers = await Voucher.findAll({
        where: {
          userId: storeForUser.id,
        },
      });

      const currentVouchers = userVouchers.length;
      const newTotalVouchers = Math.floor(total / stampLimit);

      if (total > 0 && currentVouchers < newTotalVouchers) {
        const newVoucher = await Voucher.create({
          storeId: storeForUser.id,
          userId: userId,
          claimed: false,
        });
      }

      return res.status(200).send();
    } else {
      return res.status(403).send();
    }
  } catch (e) {
    console.error(e);
    next(e);
  }
});

router.get("/stats/:storeId", async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const allTransactions = await Transactions.findAll({
      where: {
        storeId: parseInt(storeId),
      },
    });
    var date = function (t) {
      return moment(t.createdAt).format("YYYY-MM-DD");
    };

    var groupToSummary = function (group, date) {
      return {
        date: date,
        transactions: group.length,
      };
    };
    var transactionsGroupedByDate = _(allTransactions)
      .groupBy(date)
      .map(groupToSummary)
      .value();

    const allClaimedVouchers = await Voucher.findAll({
      where: {
        storeId: parseInt(storeId),
        claimed: true,
      },
    });
    var date = function (t) {
      return moment(t.createdAt).format("YYYY-MM-DD");
    };

    var groupToSummaryVouchers = function (group, date) {
      return {
        date: date,
        vouchers: group.length,
      };
    };
    var vouchersGroupedByDate = _(allClaimedVouchers)
      .groupBy(date)
      .map(groupToSummaryVouchers)
      .value();

    let result = transactionsGroupedByDate.map((t) => {
      const vouchers =
        vouchersGroupedByDate.find((v) => v.date === t.date) || 0;
      const vouchersCount = vouchers ? vouchers.vouchers : 0;
      return {
        date: t.date,
        sold: t.transactions,
        free: vouchersCount,
      };
    });

    return res.send(result);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

module.exports = router;
