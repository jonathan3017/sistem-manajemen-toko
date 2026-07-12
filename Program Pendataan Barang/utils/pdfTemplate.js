const PDFDocument = require("pdfkit");

const STORE = {
    title: "Sistem Informasi Transaksi dan Pendataan Barang",
    name: "Sistem Toko Sepeda",
    printedBy: "Admin",
    copyright: "© 2025 Sistem Toko Sepeda"
};

const COLORS = {
    green: "#1f7a4d",
    red: "#c62828",
    lightGreen: "#e8f5e9",
    paleGreen: "#f3fbf5",
    dark: "#202124",
    muted: "#5f6368",
    border: "#d6dde5",
    zebra: "#f7f9fb",
    white: "#ffffff"
};

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function toNumber(value) {
    return Number(value) || 0;
}

function formatCurrency(value) {
    return `Rp ${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0
    }).format(toNumber(value))}`;
}

function normalizeDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(`${value}T00:00:00`);
    }
    return new Date(value);
}

function formatDateLong(value) {
    const date = normalizeDate(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonth(value) {
    const date = normalizeDate(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(value) {
    if (!value) return "-";
    return String(value).slice(0, 8);
}

function pageBottom(doc) {
    return doc.page.height - doc.page.margins.bottom;
}

function contentWidth(doc) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, height) {
    if (doc.y + height > pageBottom(doc)) {
        doc.addPage();
    }
}

function drawHorizontalLine(doc, color = COLORS.border) {
    doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor(color)
        .lineWidth(1)
        .stroke();
}

function reportTitle(jenis) {
    if (jenis === "harian") return "LAPORAN PENJUALAN HARIAN";
    if (jenis === "bulanan") return "LAPORAN PENJUALAN BULANAN";
    return "LAPORAN PENJUALAN TAHUNAN";
}

function periodName(jenis) {
    if (jenis === "harian") return "Tanggal";
    if (jenis === "bulanan") return "Bulan";
    return "Tahun";
}

function drawInfoRow(doc, label, value, x, y, labelWidth, valueWidth) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.dark)
        .text(label, x, y, { width: labelWidth });
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.dark)
        .text(`: ${value || "-"}`, x + labelWidth, y, { width: valueWidth });
}

function drawHeader(doc, data, periode, jenis) {
    const x = doc.page.margins.left;
    const width = contentWidth(doc);

    doc.font("Helvetica-Bold").fontSize(14).fillColor(COLORS.green)
        .text(STORE.title, x, doc.y, { width, align: "center" });
    doc.moveDown(0.35);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.dark)
        .text(STORE.name, { align: "center" });
    doc.moveDown(0.8);
    drawHorizontalLine(doc, COLORS.green);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.dark)
        .text(reportTitle(jenis), x, doc.y, { width, align: "left" });
    doc.moveDown(0.55);

    const rows = [
        ["ID Laporan", data.idLaporan],
        ["Periode", `${periodName(jenis)} ${periode.label || "-"}`],
        ["Tanggal Cetak", formatDateLong(data.tanggalCetak || new Date())],
        ["Dicetak Oleh", STORE.printedBy]
    ];
    const rowY = doc.y;
    const labelWidth = 92;
    const valueWidth = width - labelWidth;

    rows.forEach(([label, value], index) => {
        drawInfoRow(doc, label, value, x, rowY + index * 16, labelWidth, valueWidth);
    });

    doc.y = rowY + rows.length * 16 + 8;
    drawHorizontalLine(doc);
    doc.moveDown(0.7);
}

function drawSectionTitle(doc, title) {
    ensureSpace(doc, 34);
    doc.moveDown(0.15);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.dark)
        .text(title, doc.page.margins.left, doc.y, {
            width: contentWidth(doc),
            align: "left"
        });
    doc.moveDown(0.35);
}

function drawKeyValue(doc, label, value, x, y, width) {
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
        .text(label, x, y, { width });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.dark)
        .text(value, x, y + 12, { width });
}

function drawSummary(doc, summary, jenis) {
    drawSectionTitle(doc, "Ringkasan");

    const leftRows = [
        ["Jumlah Barang Terjual", `${toNumber(summary.jumlahBarangTerjual)} Item`],
        ["Jumlah Pembeli", `${toNumber(summary.jumlahPembeli)} Orang`],
        ["Total Modal", formatCurrency(summary.totalModal)]
    ];
    const rightRows = [
        ["Total Pendapatan", formatCurrency(summary.totalPendapatan)],
        ["Keuntungan", formatCurrency(summary.keuntungan)],
        ["Total Biaya Servis", formatCurrency(summary.totalBiayaServis)]
    ];

    if (jenis !== "harian") {
        leftRows.push(["Total Transaksi", `${toNumber(summary.totalTransaksi)} Transaksi`]);
        rightRows.push([
            jenis === "bulanan" ? "Rata-rata/hari" : "Rata-rata/bulan",
            formatCurrency(summary.rataRataPenjualan)
        ]);
    }

    const x = doc.page.margins.left;
    const gap = 14;
    const width = (contentWidth(doc) - gap) / 2;
    const rowHeight = 36;
    const height = Math.max(leftRows.length, rightRows.length) * rowHeight + 14;
    ensureSpace(doc, height + 8);

    const y = doc.y;
    doc.roundedRect(x, y, width, height, 4).fillAndStroke(COLORS.white, COLORS.border);
    doc.roundedRect(x + width + gap, y, width, height, 4).fillAndStroke(COLORS.white, COLORS.border);
    doc.rect(x, y, width, 6).fill(COLORS.green);
    doc.rect(x + width + gap, y, width, 6).fill(COLORS.green);

    leftRows.forEach(([label, value], index) => {
        drawKeyValue(doc, label, value, x + 12, y + 16 + index * rowHeight, width - 24);
    });
    rightRows.forEach(([label, value], index) => {
        drawKeyValue(doc, label, value, x + width + gap + 12, y + 16 + index * rowHeight, width - 24);
    });

    doc.y = y + height + 12;
}

function measureCell(doc, value, width, fontSize, fontName) {
    doc.font(fontName).fontSize(fontSize);
    return doc.heightOfString(String(value ?? ""), {
        width,
        lineGap: 1
    });
}

function drawTable(doc, columns, rows, options = {}) {
    const x = doc.page.margins.left;
    const width = contentWidth(doc);
    const headerColor = options.headerColor || COLORS.green;
    const emptyText = options.emptyText || "Tidak ada transaksi pada periode ini";
    const fontSize = options.fontSize || 8;
    const paddingX = 4;
    const headerHeight = 23;

    function renderHeader() {
        ensureSpace(doc, headerHeight + 5);
        const y = doc.y;
        doc.rect(x, y, width, headerHeight).fill(headerColor);
        let cursor = x;
        columns.forEach((column) => {
            doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(COLORS.white)
                .text(column.label, cursor + paddingX, y + 7, {
                    width: column.width - paddingX * 2,
                    align: column.align || "left"
                });
            cursor += column.width;
        });
        doc.y = y + headerHeight;
    }

    function getRowHeight(row) {
        const fontName = row.bold ? "Helvetica-Bold" : "Helvetica";
        const heights = columns.map((column, index) => {
            return measureCell(doc, row.values[index], column.width - paddingX * 2, fontSize, fontName) + 12;
        });
        return Math.max(row.minHeight || 22, ...heights);
    }

    function renderRow(row, index) {
        const height = getRowHeight(row);
        if (doc.y + height > pageBottom(doc)) {
            doc.addPage();
            renderHeader();
        }

        const y = doc.y;
        const bg = row.fill || (index % 2 === 0 ? COLORS.white : COLORS.zebra);
        doc.rect(x, y, width, height).fillAndStroke(bg, COLORS.border);

        if (row.separatorTop) {
            doc.moveTo(x, y).lineTo(x + width, y).strokeColor(COLORS.green).lineWidth(1.1).stroke();
        }

        let cursor = x;
        columns.forEach((column, columnIndex) => {
            doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fillColor(COLORS.dark)
                .text(String(row.values[columnIndex] ?? ""), cursor + paddingX, y + 6, {
                    width: column.width - paddingX * 2,
                    align: column.align || "left",
                    lineGap: 1
                });
            cursor += column.width;
        });

        doc.y = y + height;
    }

    renderHeader();

    if (!rows.length) {
        renderRow({
            values: [emptyText, ...Array(columns.length - 1).fill("")]
        }, 0);
    } else {
        rows.forEach((row, index) => renderRow(Array.isArray(row) ? { values: row } : row, index));
    }

    (options.footerRows || []).forEach((row, index) => {
        const values = Array.isArray(row) ? row : row.values;
        renderRow({
            values,
            bold: true,
            fill: COLORS.lightGreen,
            minHeight: 24
        }, index);
    });

    doc.moveDown(0.8);
}

function dailyColumns() {
    return [
        { label: "No", width: 25, align: "center" },
        { label: "Kode Pembeli", width: 75 },
        { label: "Waktu", width: 50, align: "center" },
        { label: "Nama Barang", width: 145 },
        { label: "Jumlah", width: 45, align: "center" },
        { label: "Harga", width: 75, align: "center" },
        { label: "Subtotal", width: 92, align: "right" }
    ];
}

function getTransactionItemSubtotal(trx) {
    const items = trx.items || [];
    if (items.length > 0) {
        return items.reduce((sum, item) => sum + toNumber(item.subtotal), 0);
    }

    return Math.max(toNumber(trx.total_harga) - toNumber(trx.biaya_servis), 0);
}

function drawDailyTransactions(doc, transactions) {
    drawSectionTitle(doc, "Detail Transaksi");

    const rows = [];
    transactions.forEach((trx, trxIndex) => {
        const items = trx.items || [];
        if (!items.length) {
            rows.push([
                trxIndex + 1,
                trx.kode_pembeli || "-",
                formatTime(trx.waktu),
                "-",
                0,
                formatCurrency(0),
                formatCurrency(0)
            ]);
        } else {
            items.forEach((item, itemIndex) => {
                rows.push({
                    values: [
                        itemIndex === 0 ? trxIndex + 1 : "",
                        itemIndex === 0 ? trx.kode_pembeli || "-" : "",
                        itemIndex === 0 ? formatTime(trx.waktu) : "",
                        item.nama_barang || "-",
                        toNumber(item.jumlah),
                        formatCurrency(item.harga_jual),
                        formatCurrency(item.subtotal)
                    ],
                    separatorTop: itemIndex === 0 && trxIndex > 0
                });
            });
        }

        const subtotalBarang = getTransactionItemSubtotal(trx);
        const biayaServis = toNumber(trx.biaya_servis);
        const totalTransaksi = subtotalBarang + biayaServis;

        rows.push({
            values: ["", "", "", "Sub-total Transaksi", "", "", formatCurrency(subtotalBarang)],
            bold: true,
            fill: COLORS.paleGreen
        });
        rows.push({
            values: ["", "", "", "Biaya Servis", "", "", formatCurrency(biayaServis)],
            bold: true,
            fill: COLORS.paleGreen
        });
        rows.push({
            values: ["", "", "", `Total Transaksi ${trxIndex + 1}`, "", "", formatCurrency(totalTransaksi)],
            bold: true,
            fill: COLORS.paleGreen
        });
    });

    const grandTotal = transactions.reduce((sum, trx) => {
        return sum + getTransactionItemSubtotal(trx) + toNumber(trx.biaya_servis);
    }, 0);

    drawTable(doc, dailyColumns(), rows, {
        footerRows: [
            ["", "", "", "Grand Total", "", "", formatCurrency(grandTotal)]
        ]
    });
}

function drawPeriodSummary(doc, jenis, rows, summary) {
    const isMonthlyReport = jenis === "bulanan";
    drawSectionTitle(doc, isMonthlyReport ? "Ringkasan Harian" : "Ringkasan Bulanan");

    const tableRows = (rows || []).map((row, index) => [
        index + 1,
        isMonthlyReport ? formatDateLong(row.tanggal) : row.bulan,
        toNumber(row.transaksi),
        toNumber(row.itemTerjual),
        formatCurrency(row.pendapatan),
        formatCurrency(row.servis),
        formatCurrency(row.keuntungan)
    ]);

    drawTable(doc, [
        { label: "No", width: 28, align: "center" },
        { label: isMonthlyReport ? "Tanggal" : "Bulan", width: 112 },
        { label: "Transaksi", width: 58, align: "center" },
        { label: "Item", width: 60, align: "center" },
        { label: "Pendapatan", width: 88, align: "right" },
        { label: "Servis", width: 78, align: "right" },
        { label: isMonthlyReport ? "Untung" : "Keuntungan", width: 91, align: "right" }
    ], tableRows, {
        footerRows: [[
            "",
            "Grand Total",
            toNumber(summary.totalTransaksi),
            toNumber(summary.jumlahBarangTerjual),
            formatCurrency(summary.totalPendapatan),
            formatCurrency(summary.totalBiayaServis),
            formatCurrency(summary.keuntungan)
        ]]
    });
}

function drawTopProducts(doc, topProducts) {
    drawSectionTitle(doc, "Top 5 Barang Terlaris");
    drawTable(doc, [
        { label: "No", width: 40, align: "center" },
        { label: "Nama Barang", width: 300 },
        { label: "Jumlah", width: 70, align: "center" },
        { label: "Pendapatan", width: 92, align: "right" }
    ], (topProducts || []).map((item, index) => [
        index + 1,
        item.nama_barang || "-",
        toNumber(item.jumlah),
        formatCurrency(item.pendapatan)
    ]));
}

function drawRestock(doc, restockItems) {
    drawSectionTitle(doc, "Rekomendasi Restok");
    drawTable(doc, [
        { label: "No", width: 40, align: "center" },
        { label: "Nama Barang", width: 300 },
        { label: "Stok", width: 75, align: "center" },
        { label: "Status", width: 100, align: "center" }
    ], (restockItems || []).map((item, index) => {
        const stock = toNumber(item.stok);
        return [
            index + 1,
            item.nama_barang || "-",
            stock,
            stock <= 0 ? "Habis" : "Segera Restok"
        ];
    }), {
        headerColor: COLORS.red,
        emptyText: "Tidak ada barang yang perlu direstok"
    });
}

function getBestProduct(topProducts) {
    if (!topProducts || !topProducts.length) return null;
    return topProducts[0];
}

function drawConclusion(doc, data, periode) {
    drawSectionTitle(doc, "Kesimpulan");

    const summary = data.summary || {};
    const bestProduct = getBestProduct(data.topProducts || []);
    const restockCount = (data.restockItems || []).length;
    const productText = bestProduct
        ? `Produk terlaris adalah ${bestProduct.nama_barang} dengan ${toNumber(bestProduct.jumlah)} unit terjual.`
        : "Belum ada produk terlaris pada periode ini.";
    const restockText = restockCount > 0
        ? `Terdapat ${restockCount} barang yang perlu menjadi perhatian untuk restok.`
        : "Stok barang masih dalam kondisi aman untuk periode laporan ini.";

    const text = `Pada ${periode.label || "-"}, toko mencatat ${toNumber(summary.totalTransaksi)} transaksi dengan total ${toNumber(summary.jumlahBarangTerjual)} item terjual. Total pendapatan yang diperoleh adalah ${formatCurrency(summary.totalPendapatan)} dengan keuntungan ${formatCurrency(summary.keuntungan)}. ${productText} ${restockText}`;

    const x = doc.page.margins.left;
    const width = contentWidth(doc);
    const textHeight = doc.heightOfString(text, {
        width: width - 24,
        align: "justify",
        lineGap: 4
    });
    const height = Math.max(72, textHeight + 24);
    ensureSpace(doc, height + 8);

    const y = doc.y;
    doc.roundedRect(x, y, width, height, 4).fillAndStroke(COLORS.white, COLORS.border);
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.dark)
        .text(text, x + 12, y + 12, {
            width: width - 24,
            align: "justify",
            lineGap: 4
        });
    doc.y = y + height;
}

function drawFooter(doc) {
    ensureSpace(doc, 82);
    doc.moveDown(1.2);
    drawHorizontalLine(doc);
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.dark)
        .text(`Dicetak oleh: ${STORE.printedBy}`);
    doc.moveDown(1.5);
    doc.text("Tanda Tangan: __________________");
}

function generateReportPDF(data, periode, jenis) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 40,
            size: "A4"
        });
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        drawHeader(doc, data, periode, jenis);
        drawSummary(doc, data.summary || {}, jenis);

        if (jenis === "harian") {
            drawDailyTransactions(doc, data.transactions || []);
        } else {
            drawPeriodSummary(doc, jenis, data.periodRows || [], data.summary || {});
        }

        drawTopProducts(doc, data.topProducts || []);
        drawRestock(doc, data.restockItems || []);
        drawConclusion(doc, data, periode);
        drawFooter(doc);

        doc.end();
    });
}

module.exports = {
    generateReportPDF,
    formatCurrency,
    formatDateLong,
    formatMonth
};
