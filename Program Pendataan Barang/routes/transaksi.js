const express = require("express");
const router = express.Router();
const transaksiController = require("../controllers/transaksiController");

router.get("/", transaksiController.getAllTransaksi);
router.post("/", transaksiController.createTransaksi);
router.get("/:id/detail", transaksiController.getDetailTransaksi);
router.get("/:id", transaksiController.getTransaksiById);

module.exports = router;
