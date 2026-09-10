/**
 * Pure translation table — no React, no "use client", safe to import from
 * server components too. `i18n.ts` adds the client hooks; `i18n-server.ts`
 * adds the cookie-based server reader.
 *
 * English is the source of truth and the fallback for any missing entry.
 */

export type Lang = "en" | "ur" | "roman";

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ur", label: "Urdu", native: "اردو" },
  { id: "roman", label: "Roman Urdu", native: "Roman Urdu" },
];

export const LANG_COOKIE = "mizankhata_lang";

type Entry = Record<Lang, string>;

const DICT: Record<string, Entry> = {
  // ---- common ----------------------------------------------------------
  "c.save": { en: "Save", ur: "محفوظ کریں", roman: "Save karein" },
  "c.saving": { en: "Saving…", ur: "محفوظ ہو رہا ہے…", roman: "Save ho raha hai…" },
  "c.saveChanges": {
    en: "Save changes",
    ur: "تبدیلیاں محفوظ کریں",
    roman: "Changes save karein",
  },
  "c.cancel": { en: "Cancel", ur: "منسوخ", roman: "Cancel" },
  "c.delete": { en: "Delete", ur: "حذف کریں", roman: "Delete karein" },
  "c.edit": { en: "Edit", ur: "ترمیم", roman: "Edit karein" },
  "c.add": { en: "Add", ur: "شامل کریں", roman: "Add karein" },
  "c.done": { en: "Done", ur: "مکمل", roman: "Done" },
  "c.loading": { en: "Loading…", ur: "کھل رہا ہے…", roman: "Load ho raha hai…" },
  "c.optional": { en: "optional", ur: "اختیاری", roman: "optional" },
  "c.note": { en: "Note", ur: "نوٹ", roman: "Note" },
  "c.notePh": {
    en: "Details / comments",
    ur: "تفصیل / تبصرہ",
    roman: "Tafseel / comments",
  },
  "c.date": { en: "Date", ur: "تاریخ", roman: "Date" },
  "c.time": { en: "Time", ur: "وقت", roman: "Waqt" },
  "c.amount": { en: "Amount", ur: "رقم", roman: "Raqam" },
  "c.total": { en: "Total", ur: "کل", roman: "Total" },
  "c.cash": { en: "cash", ur: "نقد", roman: "cash" },
  "c.bank": { en: "bank", ur: "بینک", roman: "bank" },
  "c.customer": { en: "Customer", ur: "گاہک", roman: "Customer" },
  "c.supplier": { en: "Supplier", ur: "سپلائر", roman: "Supplier" },
  "c.customers": { en: "Customers", ur: "گاہک", roman: "Customers" },
  "c.suppliers": { en: "Suppliers", ur: "سپلائرز", roman: "Suppliers" },
  "c.rate": { en: "Rate", ur: "ریٹ", roman: "Rate" },
  "c.noMatches": { en: "No matches.", ur: "کچھ نہیں ملا۔", roman: "Kuch nahi mila." },
  "c.back": { en: "Back", ur: "واپس", roman: "Wapas" },

  // ---- app header titles --------------------------------------------------
  "title./work": { en: "Work", ur: "کام", roman: "Kaam" },
  "title./routine": { en: "Routine", ur: "روٹین", roman: "Routine" },
  "title./ledger": { en: "Ledger", ur: "کھاتہ", roman: "Khata" },
  "title./cashbook": { en: "Cash Book", ur: "نقد بہی", roman: "Cash Book" },
  "title./shop": { en: "Shop", ur: "دکان", roman: "Dukaan" },
  "title./shop/pos": { en: "Sell", ur: "فروخت", roman: "Bikri" },
  "title./shop/stock": { en: "Stock", ur: "اسٹاک", roman: "Stock" },
  "title./shop/bills": { en: "Bills", ur: "بل", roman: "Bills" },
  "title./shop/expense": { en: "Expenses", ur: "اخراجات", roman: "Kharchay" },
  "title./shop/reports": { en: "Reports", ur: "رپورٹس", roman: "Reports" },
  "title./shop/settings": {
    en: "Shop details",
    ur: "دکان کی تفصیل",
    roman: "Dukaan ki tafseel",
  },
  "title./settings": { en: "Settings", ur: "ترتیبات", roman: "Settings" },

  // ---- bottom nav ------------------------------------------------------
  "nav.work": { en: "Work", ur: "کام", roman: "Kaam" },
  "nav.routine": { en: "Routine", ur: "روٹین", roman: "Routine" },
  "nav.ledger": { en: "Ledger", ur: "کھاتہ", roman: "Khata" },
  "nav.shop": { en: "Shop", ur: "دکان", roman: "Dukaan" },

  // ---- date range filter ---------------------------------------------
  "range.all": { en: "All time", ur: "تمام وقت", roman: "Sara waqt" },
  "range.month": { en: "This month", ur: "اِس مہینے", roman: "Is mahine" },
  "range.lastmonth": {
    en: "Last month",
    ur: "پچھلے مہینے",
    roman: "Pichle mahine",
  },
  "range.7d": { en: "Last 7 days", ur: "پچھلے ۷ دن", roman: "Pichle 7 din" },
  "range.30d": { en: "Last 30 days", ur: "پچھلے ۳۰ دن", roman: "Pichle 30 din" },
  "range.year": { en: "This year", ur: "اِس سال", roman: "Is saal" },
  "range.custom": { en: "Custom", ur: "اپنی مرضی", roman: "Apni marzi" },
  "range.to": { en: "to", ur: "سے", roman: "se" },
  "range.hint": {
    en: "first date to last date",
    ur: "پہلی تاریخ سے آخری تاریخ تک",
    roman: "pehli date se aakhri date tak",
  },
  "range.entries": { en: "entries", ur: "اندراجات", roman: "entries" },
  "range.entry": { en: "entry", ur: "اندراج", roman: "entry" },
  "range.netForPeriod": {
    en: "Net for period",
    ur: "اِس مدت کا خالص",
    roman: "Is muddat ka net",
  },
  "range.noneInRange": {
    en: "Nothing in this date range.",
    ur: "اِس تاریخ کی حد میں کچھ نہیں۔",
    roman: "Is date range mein kuch nahi.",
  },

  // ---- ledger list --------------------------------------------------
  "ledger.youllGet": { en: "You'll get", ur: "لینے ہیں", roman: "Lene hain" },
  "ledger.youllGive": { en: "You'll give", ur: "دینے ہیں", roman: "Dene hain" },
  "ledger.netPosition": {
    en: "Net position",
    ur: "مجموعی حیثیت",
    roman: "Majmoyi haisiyat",
  },
  "ledger.customersOweYou": {
    en: "Customers owe you",
    ur: "گاہکوں سے لینے ہیں",
    roman: "Customers se lene hain",
  },
  "ledger.youOweSuppliers": {
    en: "You owe suppliers",
    ur: "سپلائرز کو دینے ہیں",
    roman: "Suppliers ko dene hain",
  },
  "ledger.cashBankInHand": {
    en: "Cash & bank in hand",
    ur: "نقد و بینک",
    roman: "Cash o bank",
  },
  "ledger.net": { en: "Net", ur: "خالص", roman: "Net" },
  "ledger.all": { en: "All", ur: "سب", roman: "Sab" },
  "ledger.customers": { en: "Customers", ur: "گاہک", roman: "Customers" },
  "ledger.suppliers": { en: "Suppliers", ur: "سپلائرز", roman: "Suppliers" },
  "ledger.settled": { en: "Settled", ur: "برابر", roman: "Barabar" },
  "ledger.searchParties": {
    en: "Search {n} parties",
    ur: "{n} کھاتے تلاش کریں",
    roman: "{n} parties talash karein",
  },
  "ledger.empty": {
    en: "Your ledger is empty",
    ur: "آپ کا کھاتہ خالی ہے",
    roman: "Aap ka khata khali hai",
  },
  "ledger.emptyHint": {
    en: "Load Mubeen's parties, suppliers and stock from the Digikhata export to try it out, or add parties yourself with the + button.",
    ur: "آزمانے کے لیے ڈیجی کھاتہ سے پارٹیاں، سپلائرز اور اسٹاک لوڈ کریں، یا + بٹن سے خود پارٹی شامل کریں۔",
    roman: "Try karne ke liye Digikhata se parties, suppliers aur stock load karein, ya + button se khud party add karein.",
  },
  "ledger.loadSample": {
    en: "Load Digikhata sample data",
    ur: "ڈیجی کھاتہ کا نمونہ ڈیٹا لوڈ کریں",
    roman: "Digikhata sample data load karein",
  },
  "ledger.addManual": {
    en: "Add a party manually",
    ur: "خود پارٹی شامل کریں",
    roman: "Khud party add karein",
  },
  "ledger.addParty": {
    en: "Add party",
    ur: "پارٹی شامل کریں",
    roman: "Party add karein",
  },
  "ledger.importContacts": {
    en: "Import from contacts",
    ur: "رابطوں سے شامل کریں",
    roman: "Contacts se import karein",
  },
  "ledger.name": { en: "Name", ur: "نام", roman: "Naam" },
  "ledger.phoneOpt": {
    en: "Phone (optional)",
    ur: "فون (اختیاری)",
    roman: "Phone (optional)",
  },
  "ledger.openingCust": {
    en: "Opening balance they owe (optional)",
    ur: "اُن کے ذمے پرانی رقم (اختیاری)",
    roman: "Un ke zimme purani raqam (optional)",
  },
  "ledger.openingSupp": {
    en: "Opening balance you owe (optional)",
    ur: "آپ کے ذمے پرانی رقم (اختیاری)",
    roman: "Aap ke zimme purani raqam (optional)",
  },

  // ---- party detail -----------------------------------------------------
  "party.youGave": { en: "You gave", ur: "آپ نے دیا", roman: "Aap ne diya" },
  "party.youGot": { en: "You got", ur: "آپ کو ملا", roman: "Aap ko mila" },
  "party.balance": { en: "Balance", ur: "بقایا", roman: "Baqaya" },
  "party.creditCust": {
    en: "You gave (credit)",
    ur: "اُدھار دیا",
    roman: "Udhaar diya",
  },
  "party.creditSupp": {
    en: "Purchase (on credit)",
    ur: "اُدھار خریدا",
    roman: "Udhaar khareeda",
  },
  "party.payCust": {
    en: "You got (payment)",
    ur: "رقم وصول",
    roman: "Raqam wasool",
  },
  "party.paySupp": { en: "Payment made", ur: "رقم ادا", roman: "Raqam ada" },
  "party.searchEntries": {
    en: "Search {n} entries",
    ur: "{n} اندراجات تلاش کریں",
    roman: "{n} entries talash karein",
  },
  "party.noEntries": {
    en: "No entries yet.",
    ur: "ابھی کوئی اندراج نہیں۔",
    roman: "Abhi koi entry nahi.",
  },
  "party.entry": { en: "Entry", ur: "اندراج", roman: "Entry" },
  "party.entries": { en: "Entries", ur: "اندراجات", roman: "Entries" },
  "party.view": { en: "View", ur: "دکھاؤ", roman: "View" },
  "party.viewCols": {
    en: "Two columns",
    ur: "دو خانے",
    roman: "Do khane",
  },
  "party.viewList": { en: "List", ur: "فہرست", roman: "List" },
  "layout.view": { en: "View", ur: "دکھاؤ", roman: "View" },
  "layout.columns": {
    en: "Two columns",
    ur: "دو خانے",
    roman: "Do khane",
  },
  "layout.list": { en: "List", ur: "فہرست", roman: "List" },
  "layout.default": {
    en: "Default view for lists",
    ur: "فہرستوں کا پہلے سے طے شدہ انداز",
    roman: "Behtareen andaz",
  },
  "layout.defaultHint": {
    en: "How the ledger, Cash Book and reports show entries.",
    ur: "کھاتہ، کیش بک اور رپورٹس اندراج کیسے دکھائیں۔",
    roman: "Khata, Cash Book aur reports entries kaise dikhayein.",
  },
  "party.fromBill": { en: "from a bill", ur: "بل سے", roman: "bill se" },
  "party.shareWa": {
    en: "Share on WhatsApp",
    ur: "واٹس ایپ پر بھیجیں",
    roman: "WhatsApp par bhejein",
  },
  "party.addItem": {
    en: "+ Add item from stock",
    ur: "+ اسٹاک سے چیز شامل کریں",
    roman: "+ Stock se cheez add karein",
  },
  "party.itemsMakeBill": {
    en: "Adding items here creates a bill and takes them out of stock.",
    ur: "یہاں چیزیں شامل کرنے سے بل بنتا ہے اور وہ اسٹاک سے نکل جاتی ہیں۔",
    roman: "Yahan items add karne se bill banta hai aur wo stock se nikal jati hain.",
  },
  "party.itemsCount": {
    en: "{n} item(s) → bill",
    ur: "{n} چیزیں → بل",
    roman: "{n} items → bill",
  },
  "party.clearItems": { en: "Clear", ur: "ہٹائیں", roman: "Hatayein" },
  "party.billNoOpt": {
    en: "Bill no. (optional)",
    ur: "بل نمبر (اختیاری)",
    roman: "Bill no. (optional)",
  },
  "party.deleteParty": {
    en: "Delete party",
    ur: "پارٹی حذف کریں",
    roman: "Party delete karein",
  },
  "party.deletePartyArm": {
    en: "Tap again to delete this party",
    ur: "حذف کرنے کے لیے دوبارہ دبائیں",
    roman: "Delete karne ke liye dobara dabayein",
  },
  "party.deletePartyHint": {
    en: "Deletes the party and all its entries.",
    ur: "پارٹی اور اُس کے تمام اندراجات حذف ہو جائیں گے۔",
    roman: "Party aur us ki saari entries delete ho jayengi.",
  },
  "party.notFound": {
    en: "Party not found.",
    ur: "کھاتہ نہیں ملا۔",
    roman: "Khata nahi mila.",
  },
  "party.backToLedger": {
    en: "Back to ledger",
    ur: "کھاتے پر واپس",
    roman: "Khate par wapas",
  },

  // ---- cash book -----------------------------------------------------
  "cash.inHand": {
    en: "Cash in hand",
    ur: "ہاتھ میں نقد",
    roman: "Haath mein cash",
  },
  "cash.bankBal": { en: "Bank balance", ur: "بینک بیلنس", roman: "Bank balance" },
  "cash.entries": { en: "Entries", ur: "اندراجات", roman: "Entries" },
  "cash.in": { en: "Cash in", ur: "نقد آمد", roman: "Cash aaya" },
  "cash.out": { en: "Cash out", ur: "نقد اخراج", roman: "Cash gaya" },
  "cash.addEntry": {
    en: "Add cash entry",
    ur: "نقد اندراج شامل کریں",
    roman: "Cash entry add karein",
  },
  "cash.deleteEntry": {
    en: "Delete entry",
    ur: "اندراج حذف کریں",
    roman: "Entry delete karein",
  },
  "cash.noEntries": {
    en: "No cash entries yet — tap + to add one.",
    ur: "ابھی کوئی اندراج نہیں — شامل کرنے کے لیے + دبائیں۔",
    roman: "Abhi koi entry nahi — add karne ke liye + dabayein.",
  },
  "cash.noParty": {
    en: "No party — general",
    ur: "کوئی پارٹی نہیں — عام",
    roman: "Koi party nahi — aam",
  },
  "cash.notePh": {
    en: "Note (e.g. shop rent)",
    ur: "نوٹ (مثلاً دکان کا کرایہ)",
    roman: "Note (masalan dukaan ka kiraya)",
  },
  "cash.category": { en: "category…", ur: "قسم…", roman: "category…" },
  "cat.purchase": { en: "purchase", ur: "خریداری", roman: "khareedari" },
  "cat.expense": { en: "expense", ur: "خرچ", roman: "kharcha" },
  "cat.salary": { en: "salary", ur: "تنخواہ", roman: "tankhwah" },
  "cat.rent": { en: "rent", ur: "کرایہ", roman: "kiraya" },
  "cat.transport": { en: "transport", ur: "کرایہ بھاڑا", roman: "transport" },
  "cat.other": { en: "other", ur: "دیگر", roman: "deegar" },

  // ---- POS ----------------------------------------------------------
  "pos.searchProducts": {
    en: "Search products",
    ur: "چیزیں تلاش کریں",
    roman: "Cheezein talash karein",
  },
  "pos.outOfStock": { en: "Out of stock", ur: "ختم", roman: "Khatam" },
  "pos.left": { en: "{n} {unit} left", ur: "{n} {unit} باقی", roman: "{n} {unit} baqi" },
  "pos.noProducts": {
    en: "No products yet. Add stock first.",
    ur: "ابھی کوئی چیز نہیں۔ پہلے اسٹاک شامل کریں۔",
    roman: "Abhi koi cheez nahi. Pehle stock add karein.",
  },
  "pos.charge": { en: "Charge {amt}", ur: "وصول {amt}", roman: "Wasool {amt}" },
  "pos.subTotal": { en: "Sub total", ur: "ذیلی میزان", roman: "Sub total" },
  "pos.discount": { en: "Discount", ur: "رعایت", roman: "Discount" },
  "pos.taxPct": { en: "Tax %", ur: "ٹیکس ٪", roman: "Tax %" },
  "pos.notesOpt": {
    en: "Notes (optional)",
    ur: "نوٹ (اختیاری)",
    roman: "Notes (optional)",
  },
  "pos.mode.cash": { en: "Cash", ur: "نقد", roman: "Cash" },
  "pos.mode.credit": { en: "Udhaar", ur: "اُدھار", roman: "Udhaar" },
  "pos.selectParty": {
    en: "Select customer / supplier…",
    ur: "گاہک / سپلائر منتخب کریں…",
    roman: "Customer / supplier select karein…",
  },
  "pos.goesToParty": {
    en: "{amt} goes on their account.",
    ur: "{amt} اُن کے کھاتے میں چڑھے گا۔",
    roman: "{amt} un ke khate mein chdhega.",
  },
  "pos.completeSale": {
    en: "Complete sale · {amt}",
    ur: "فروخت مکمل کریں · {amt}",
    roman: "Bikri complete karein · {amt}",
  },

  // ---- bills ------------------------------------------------------------
  "bills.totalSaleFor": {
    en: "Total sale for {m}",
    ur: "{m} کی کل فروخت",
    roman: "{m} ki kul bikri",
  },
  "bills.salesFor": { en: "Sales · {r}", ur: "فروخت · {r}", roman: "Bikri · {r}" },
  "bills.searchBills": {
    en: "Search {n} bills",
    ur: "{n} بل تلاش کریں",
    roman: "{n} bills talash karein",
  },
  "bills.newBill": { en: "+ New bill", ur: "+ نیا بل", roman: "+ Naya bill" },
  "bills.noBills": {
    en: "No bills yet.",
    ur: "ابھی کوئی بل نہیں۔",
    roman: "Abhi koi bill nahi.",
  },
  "bills.badge.cash": { en: "Cash", ur: "نقد", roman: "Cash" },
  "bills.badge.credit": { en: "On credit", ur: "اُدھار", roman: "Udhaar" },
  "bills.badge.partial": {
    en: "Partial · {amt} credit",
    ur: "جزوی · {amt} اُدھار",
    roman: "Thora · {amt} udhaar",
  },
  "bills.walkin": { en: "Walk-in", ur: "عام گاہک", roman: "Aam customer" },
  "bills.billTo": { en: "Bill to", ur: "بل بنام", roman: "Bill banaam" },
  "bills.walkinFull": {
    en: "Walk-in / cash customer",
    ur: "عام / نقد گاہک",
    roman: "Aam / cash customer",
  },
  "bills.notLinked": {
    en: "Not linked to a ledger account",
    ur: "کسی کھاتے سے منسلک نہیں",
    roman: "Kisi khate se link nahi",
  },
  "bills.item": { en: "Item", ur: "چیز", roman: "Cheez" },
  "bills.qtyRate": { en: "Qty×Rate", ur: "تعداد×ریٹ", roman: "Qty×Rate" },
  "bills.amount": { en: "Amount", ur: "رقم", roman: "Raqam" },
  "bills.grandTotal": { en: "Bill total", ur: "بل کا کل", roman: "Bill ka kul" },
  "bills.total": { en: "Total", ur: "کل", roman: "Total" },
  "bills.previousAmount": {
    en: "Previous amount",
    ur: "پچھلی رقم",
    roman: "Pichli raqam",
  },
  "bills.grandTotalDue": {
    en: "Grand total",
    ur: "مجموعی رقم",
    roman: "Grand total",
  },
  "bills.paidNow": { en: "Paid", ur: "ادا کیا", roman: "Ada kiya" },
  "bills.unpaidThis": {
    en: "Remaining",
    ur: "باقی",
    roman: "Baqi",
  },
  "bills.paidInFull": {
    en: "All paid",
    ur: "سب ادا",
    roman: "Sab ada",
  },
  "bills.status": { en: "Status", ur: "حالت", roman: "Halat" },
  "bills.prevBalance": {
    en: "Old balance",
    ur: "پرانا حساب",
    roman: "Purana hisaab",
  },
  "bills.thisBillUnpaid": {
    en: "This bill",
    ur: "یہ بل",
    roman: "Ye bill",
  },
  "bills.totalDueFrom": {
    en: "{name} to pay",
    ur: "{name} نے دینے ہیں",
    roman: "{name} ne dene hain",
  },
  "bills.accountTitle": {
    en: "Account",
    ur: "حساب",
    roman: "Hisaab",
  },
  "bills.walkinNote": {
    en: "Cash sale — not added to anyone's account. Use Edit to pick a customer.",
    ur: "نقد فروخت — کسی کے حساب میں نہیں۔ گاہک چننے کے لیے ترمیم کریں۔",
    roman: "Cash bikri — kisi ke hisaab mein nahi. Customer chunne ke liye Edit karein.",
  },
  "bills.walkinCash": {
    en: "Walk-in — paid cash",
    ur: "آنے والا — نقد ادا",
    roman: "Walk-in — cash ada",
  },
  "bills.willGoOnAccount": {
    en: "This goes on the customer's account.",
    ur: "یہ گاہک کے حساب میں چڑھے گا۔",
    roman: "Ye customer ke hisaab mein chdhega.",
  },
  "bills.willBeCash": {
    en: "Recorded as a cash sale.",
    ur: "نقد فروخت کے طور پر درج۔",
    roman: "Cash bikri ke tor par darj.",
  },
  "bills.printPdf": { en: "Print / PDF", ur: "پرنٹ / پی ڈی ایف", roman: "Print / PDF" },
  "bills.share": { en: "Share", ur: "بھیجیں", roman: "Bhejein" },
  "bills.readAloud": {
    en: "Read aloud",
    ur: "بول کر سنائیں",
    roman: "Bol kar sunayein",
  },
  "bills.sms": { en: "SMS", ur: "ایس ایم ایس", roman: "SMS" },
  "bills.editBill": {
    en: "Edit bill",
    ur: "بل ترمیم کریں",
    roman: "Bill edit karein",
  },
  "bills.deleteBill": {
    en: "Delete bill",
    ur: "بل حذف کریں",
    roman: "Bill delete karein",
  },
  "bills.deleteBillArm": {
    en: "Tap again to delete",
    ur: "حذف کے لیے دوبارہ دبائیں",
    roman: "Delete ke liye dobara dabayein",
  },
  "bills.taxExtra": {
    en: "Tax / extra",
    ur: "ٹیکس / اضافی",
    roman: "Tax / extra",
  },
  "bills.itemsSubtotal": {
    en: "Items subtotal",
    ur: "چیزوں کا میزان",
    roman: "Cheezon ka total",
  },
  "bills.goesOnCredit": {
    en: "Goes on credit",
    ur: "اُدھار چڑھے گا",
    roman: "Udhaar chdhega",
  },
  "bills.walkinNoLedger": {
    en: "Walk-in (no ledger)",
    ur: "عام گاہک (کھاتہ نہیں)",
    roman: "Aam customer (khata nahi)",
  },
  "bills.itemsLocked": {
    en: "Items on the bill can't be changed here — delete the bill and make a new one if the products are wrong.",
    ur: "بل کی چیزیں یہاں تبدیل نہیں ہو سکتیں — چیزیں غلط ہوں تو بل حذف کر کے نیا بنائیں۔",
    roman: "Bill ki cheezein yahan change nahi hotin — cheezein galat hon to bill delete kar ke naya banayein.",
  },
  "bills.notFound": {
    en: "Bill not found.",
    ur: "بل نہیں ملا۔",
    roman: "Bill nahi mila.",
  },
  "bills.qty": { en: "Qty", ur: "تعداد", roman: "Qty" },
  "bills.rate": { en: "Rate", ur: "ریٹ", roman: "Rate" },
  "bills.discount": { en: "Discount", ur: "رعایت", roman: "Discount" },
  "bills.tax": { en: "Tax", ur: "ٹیکس", roman: "Tax" },
  "bills.billNo": { en: "Bill #{n}", ur: "بل #{n}", roman: "Bill #{n}" },
  "bills.thankYou": { en: "Thank you.", ur: "شکریہ۔", roman: "Shukriya." },

  // ---- shop dashboard ------------------------------------------------
  "dash.netProfit": {
    en: "Net profit (lifetime)",
    ur: "خالص منافع (کل)",
    roman: "Khaalis munafa (kul)",
  },
  "dash.sales": { en: "Sales", ur: "فروخت", roman: "Bikri" },
  "dash.purchases": { en: "Purchases", ur: "خریداری", roman: "Khareedari" },
  "dash.expenses": { en: "Expenses", ur: "اخراجات", roman: "Kharchay" },
  "dash.reports": { en: "Reports", ur: "رپورٹس", roman: "Reports" },

  // ---- expenses ------------------------------------------------------
  "exp.totalFor": {
    en: "Total spent in {m}",
    ur: "{m} میں کل خرچ",
    roman: "{m} mein kul kharch",
  },
  "exp.spentFor": { en: "Spent · {r}", ur: "خرچ · {r}", roman: "Kharch · {r}" },
  "exp.byCategory": { en: "By category", ur: "قسم کے حساب سے", roman: "Qisam ke hisaab se" },
  "exp.search": {
    en: "Search categories",
    ur: "اقسام تلاش کریں",
    roman: "Categories talash karein",
  },
  "exp.none": {
    en: "No expenses yet — tap + to add one.",
    ur: "ابھی کوئی خرچ نہیں — + دبائیں۔",
    roman: "Abhi koi kharch nahi — + dabayein.",
  },
  "exp.noneInCat": {
    en: "No expenses in this category.",
    ur: "اِس قسم میں کوئی خرچ نہیں۔",
    roman: "Is category mein koi kharch nahi.",
  },
  "exp.add": { en: "Add expense", ur: "خرچ شامل کریں", roman: "Kharch add karein" },
  "exp.category": { en: "Category", ur: "قسم", roman: "Category" },
  "exp.newCategory": { en: "+ New category", ur: "+ نئی قسم", roman: "+ Nayi category" },
  "exp.categoryName": { en: "Category name", ur: "قسم کا نام", roman: "Category ka naam" },
  "exp.notePh": {
    en: "Note (e.g. October shop rent)",
    ur: "نوٹ (مثلاً اکتوبر کا کرایہ)",
    roman: "Note (masalan October ka kiraya)",
  },
  "exp.entry": { en: "entry", ur: "اندراج", roman: "entry" },
  "exp.entries": { en: "Entries", ur: "اندراجات", roman: "Entries" },
  "exp.allTime": { en: "All time", ur: "سارا وقت", roman: "Sara waqt" },

  // ---- reports -----------------------------------------------------
  "rep.allTime": { en: "All time", ur: "سارا وقت", roman: "Sara waqt" },
  "rep.pnl": { en: "Profit & loss", ur: "نفع و نقصان", roman: "Nafa nuqsan" },
  "rep.blocks": { en: "Blocks", ur: "خانے", roman: "Blocks" },
  "rep.chart": { en: "Chart", ur: "چارٹ", roman: "Chart" },
  "rep.cogs": {
    en: "Cost of goods sold",
    ur: "بکے مال کی لاگت",
    roman: "Bike maal ki lagat",
  },
  "rep.grossProfit": { en: "Gross profit", ur: "مجموعی نفع", roman: "Gross nafa" },
  "rep.netProfit": { en: "Net profit", ur: "خالص نفع", roman: "Khalis nafa" },
  "rep.last6": {
    en: "Last 6 months · sales vs money out",
    ur: "پچھلے 6 ماہ · فروخت بمقابلہ خرچ",
    roman: "Pichle 6 mahine · bikri vs kharch",
  },
  "rep.noChart": {
    en: "Not enough data for a chart yet.",
    ur: "چارٹ کے لیے ابھی کافی ڈیٹا نہیں۔",
    roman: "Chart ke liye abhi kaafi data nahi.",
  },
  "rep.cashFlow": { en: "Cash flow", ur: "نقد کی آمد و رفت", roman: "Cash flow" },
  "rep.expenseBreakdown": {
    en: "Expenses by category",
    ur: "قسم کے حساب سے اخراجات",
    roman: "Category ke hisaab se kharchay",
  },
  "rep.openExpenses": {
    en: "Open Expenses",
    ur: "اخراجات کھولیں",
    roman: "Expenses kholein",
  },
  "dash.stockValue": {
    en: "Stock value",
    ur: "اسٹاک کی مالیت",
    roman: "Stock ki maliyat",
  },
  "dash.itemsInStock": {
    en: "Items in stock",
    ur: "اسٹاک میں چیزیں",
    roman: "Stock mein cheezein",
  },
  "dash.receivables": {
    en: "Receivables",
    ur: "وصول طلب",
    roman: "Wasool talab",
  },
  "dash.payables": { en: "Payables", ur: "واجب الادا", roman: "Wajib ul ada" },
  "dash.restockSoon": {
    en: "Restock soon",
    ur: "جلد بھروائیں",
    roman: "Jald bharwayein",
  },
  "dash.seeAll": { en: "See all", ur: "سب دیکھیں", roman: "Sab dekhein" },
  "dash.more": { en: "more", ur: "اور", roman: "aur" },
  "dash.topSelling": {
    en: "Top selling",
    ur: "زیادہ بکنے والی",
    roman: "Zyada bikne wali",
  },
  "dash.shopDetails": {
    en: "Shop details",
    ur: "دکان کی تفصیل",
    roman: "Dukaan ki tafseel",
  },
  "dash.income": { en: "Income", ur: "آمدنی", roman: "Aamdani" },
  "dash.expense": { en: "Expense", ur: "خرچ", roman: "Kharcha" },

  // ---- stock ------------------------------------------------------------
  "stock.allItems": { en: "All items", ur: "تمام چیزیں", roman: "Sari cheezein" },
  "stock.lowStock": { en: "Low stock", ur: "کم اسٹاک", roman: "Kam stock" },
  "stock.inReport": { en: "IN report", ur: "آمد رپورٹ", roman: "IN report" },
  "stock.outReport": { en: "OUT report", ur: "اخراج رپورٹ", roman: "OUT report" },
  "stock.addProduct": {
    en: "Add product",
    ur: "نئی چیز شامل کریں",
    roman: "Nai cheez add karein",
  },
  "stock.restock": { en: "Restock", ur: "دوبارہ بھروائیں", roman: "Restock" },
  "stock.searchItems": {
    en: "Search {n} items",
    ur: "{n} چیزیں تلاش کریں",
    roman: "{n} cheezein talash karein",
  },
  "stock.low": { en: "Low", ur: "کم", roman: "Kam" },
  "stock.inBuy": { en: "IN / Buy", ur: "آمد / خرید", roman: "IN / Khareed" },
  "stock.outSell": { en: "OUT / Sell", ur: "اخراج / فروخت", roman: "OUT / Bikri" },
  "stock.qty": { en: "Quantity", ur: "تعداد", roman: "Tadaad" },
  "stock.rate": { en: "Rate", ur: "ریٹ", roman: "Rate" },
  "stock.salePrice": {
    en: "Sale price",
    ur: "فروخت قیمت",
    roman: "Sale price",
  },
  "stock.purchasePrice": {
    en: "Purchase price",
    ur: "خرید قیمت",
    roman: "Khareed price",
  },
  "stock.lowAlert": {
    en: "Low-stock alert at",
    ur: "کم اسٹاک انتباہ پر",
    roman: "Kam stock alert par",
  },
  "stock.unit": { en: "Unit", ur: "اکائی", roman: "Unit" },
  "stock.editProduct": {
    en: "Edit product",
    ur: "چیز ترمیم کریں",
    roman: "Cheez edit karein",
  },
  "stock.deleteProduct": {
    en: "Delete product",
    ur: "چیز حذف کریں",
    roman: "Cheez delete karein",
  },
  "stock.totalIn": { en: "Total in", ur: "کل آمد", roman: "Kul aamad" },
  "stock.totalOut": { en: "Total out", ur: "کل اخراج", roman: "Kul ikhraaj" },
  "stock.inHand": { en: "In hand", ur: "موجود", roman: "Maujood" },
  "stock.supplierOpt": {
    en: "Supplier (optional)",
    ur: "سپلائر (اختیاری)",
    roman: "Supplier (optional)",
  },
  "stock.report": { en: "report", ur: "رپورٹ", roman: "report" },
  "stock.totalQty": { en: "Total qty", ur: "کل تعداد", roman: "Kul tadaad" },
  "stock.totalValue": {
    en: "Total value",
    ur: "کل مالیت",
    roman: "Kul maliyat",
  },
  "stock.nothingYet": {
    en: "Nothing here yet.",
    ur: "ابھی کچھ نہیں۔",
    roman: "Abhi kuch nahi.",
  },
  "stock.items": { en: "Items", ur: "چیزیں", roman: "Cheezein" },
  "stock.inReportBtn": {
    en: "Stock IN report",
    ur: "آمد رپورٹ",
    roman: "Aamad report",
  },
  "stock.outReportBtn": {
    en: "Stock OUT report",
    ur: "اخراج رپورٹ",
    roman: "Ikhraaj report",
  },
  "stock.restockAdd": {
    en: "+ Restock / add product",
    ur: "+ مال بھروائیں / نئی چیز",
    roman: "+ Maal bharwayein / nai cheez",
  },
  "stock.nothingLow": {
    en: "Nothing low on stock.",
    ur: "کوئی چیز کم نہیں۔",
    roman: "Koi cheez kam nahi.",
  },
  "stock.noProducts": { en: "No products.", ur: "کوئی چیز نہیں۔", roman: "Koi cheez nahi." },
  "stock.sale": { en: "Sale", ur: "فروخت", roman: "Sale" },
  "stock.cost": { en: "Cost {v}", ur: "لاگت {v}", roman: "Lagat {v}" },
  "stock.noCost": { en: "no cost", ur: "لاگت نہیں", roman: "lagat nahi" },
  "stock.newProduct": {
    en: "+ New product",
    ur: "+ نئی چیز",
    roman: "+ Nai cheez",
  },
  "stock.productName": {
    en: "Product name",
    ur: "چیز کا نام",
    roman: "Cheez ka naam",
  },
  "stock.costPerUnit": {
    en: "Cost / unit",
    ur: "فی اکائی لاگت",
    roman: "Per unit lagat",
  },
  "stock.lowStockAlert": {
    en: "Low-stock alert",
    ur: "کم اسٹاک انتباہ",
    roman: "Kam stock alert",
  },
  "stock.billRefOpt": {
    en: "Bill / ref no. (optional)",
    ur: "بل / حوالہ نمبر (اختیاری)",
    roman: "Bill / ref no. (optional)",
  },
  "stock.batchTotal": {
    en: "Batch total {v}",
    ur: "کھیپ کا کل {v}",
    roman: "Khep ka kul {v}",
  },
  "stock.cashPaidNow": {
    en: "Cash paid now",
    ur: "ابھی ادا شدہ نقد",
    roman: "Abhi ada cash",
  },
  "stock.selectSupplier": {
    en: "Select supplier…",
    ur: "سپلائر چنیں…",
    roman: "Supplier chunein…",
  },
  "stock.saveRestock": {
    en: "Save restock",
    ur: "محفوظ کریں",
    roman: "Save karein",
  },
  "stock.editEntry": {
    en: "Entry",
    ur: "اندراج",
    roman: "Entry",
  },
  "stock.buy": { en: "Buy", ur: "خرید", roman: "Khareed" },
  "stock.sell": { en: "Sell", ur: "فروخت", roman: "Bikri" },
  "stock.inHandOf": {
    en: "{n} {unit} in hand",
    ur: "{n} {unit} موجود",
    roman: "{n} {unit} maujood",
  },
  "stock.noMoves": {
    en: "No stock movements yet.",
    ur: "ابھی کوئی آمد و رفت نہیں۔",
    roman: "Abhi koi aamad-o-raft nahi.",
  },
  "stock.purchase": { en: "Purchase", ur: "خریداری", roman: "Khareedari" },
  "stock.adjustment": { en: "Adjustment", ur: "درستگی", roman: "Adjustment" },
  "stock.stockIn": { en: "Stock IN", ur: "اسٹاک آمد", roman: "Stock IN" },
  "stock.stockOut": { en: "Stock OUT", ur: "اسٹاک اخراج", roman: "Stock OUT" },
  "stock.inBuyBtn": { en: "IN / Buy", ur: "آمد / خرید", roman: "IN / Khareed" },
  "stock.outSellBtn": {
    en: "OUT / Sell",
    ur: "اخراج / فروخت",
    roman: "OUT / Bikri",
  },
  "stock.date": { en: "Date", ur: "تاریخ", roman: "Date" },
  "stock.ledgerLink": {
    en: "{name} — ledger ›",
    ur: "{name} — کھاتہ ›",
    roman: "{name} — khata ›",
  },
  "stock.deleteEntry": {
    en: "Delete entry",
    ur: "اندراج حذف کریں",
    roman: "Entry delete karein",
  },
  "stock.deleteProductArm": {
    en: "Tap again to delete product",
    ur: "چیز حذف کرنے کے لیے دوبارہ دبائیں",
    roman: "Cheez delete karne ke liye dobara dabayein",
  },
  "stock.editTitle": {
    en: "Edit {name}",
    ur: "{name} ترمیم کریں",
    roman: "{name} edit karein",
  },
  "stock.qtyUnit": {
    en: "Quantity ({unit})",
    ur: "تعداد ({unit})",
    roman: "Tadaad ({unit})",
  },
  "stock.purchaseRate": {
    en: "Purchase rate",
    ur: "خرید ریٹ",
    roman: "Khareed rate",
  },
  "stock.saleRate": { en: "Sale rate", ur: "فروخت ریٹ", roman: "Sale rate" },
  "stock.addItems": {
    en: "+ Add items from stock",
    ur: "+ اسٹاک سے چیزیں شامل کریں",
    roman: "+ Stock se cheezein add karein",
  },
  "stock.amountOf": {
    en: "Amount {v}",
    ur: "رقم {v}",
    roman: "Raqam {v}",
  },
  "stock.stockOnHand": {
    en: "Stock on hand",
    ur: "موجودہ اسٹاک",
    roman: "Maujooda stock",
  },
  "stock.lowAlertLevel": {
    en: "Low-stock alert level",
    ur: "کم اسٹاک انتباہ کی حد",
    roman: "Kam stock alert level",
  },

  // ---- work -----------------------------------------------------------
  "work.start": { en: "Start", ur: "شروع کریں", roman: "Shuru karein" },
  "work.stop": { en: "Stop", ur: "بند کریں", roman: "Band karein" },
  "work.working": { en: "Working", ur: "کام جاری ہے", roman: "Kaam jari hai" },
  "work.timer": { en: "Timer", ur: "ٹائمر", roman: "Timer" },
  "work.since": { en: "since {t}", ur: "{t} سے", roman: "{t} se" },
  "work.tapStart": {
    en: "Tap start when you begin.",
    ur: "شروع کرتے وقت شروع دبائیں۔",
    roman: "Shuru karte waqt Shuru dabayein.",
  },
  "work.notYet": { en: "not yet", ur: "ابھی نہیں", roman: "abhi nahi" },
  "work.today": { en: "Today", ur: "آج", roman: "Aaj" },
  "work.thisWeek": { en: "This week", ur: "اِس ہفتے", roman: "Is hafte" },
  "work.monSun": { en: "Mon–Sun", ur: "پیر–اتوار", roman: "Mon–Sun" },
  "work.session": { en: "session", ur: "سیشن", roman: "session" },
  "work.sessions": { en: "sessions", ur: "سیشن", roman: "sessions" },
  "work.todaysSessions": {
    en: "Today's sessions",
    ur: "آج کے سیشن",
    roman: "Aaj ke sessions",
  },
  "work.noSessions": {
    en: "No sessions logged today yet.",
    ur: "آج ابھی کوئی سیشن درج نہیں۔",
    roman: "Aaj abhi koi session darj nahi.",
  },
  "work.notePh": {
    en: "Note (what did you work on?)",
    ur: "نوٹ (کس چیز پر کام کیا؟)",
    roman: "Note (kis cheez par kaam kiya?)",
  },
  "work.deleteSession": {
    en: "Delete session",
    ur: "سیشن حذف کریں",
    roman: "Session delete karein",
  },
  "work.earlierWeek": {
    en: "Earlier this week",
    ur: "اِس ہفتے پہلے",
    roman: "Is hafte pehle",
  },

  // ---- routine ------------------------------------------------------
  "routine.dueNow": { en: "Due now", ur: "ابھی کرنا ہے", roman: "Abhi karna hai" },
  "routine.upNext": { en: "Up next", ur: "اگلا", roman: "Agla" },
  "routine.catchUp": { en: "Catch-up", ur: "رہ گیا", roman: "Reh gaya" },
  "routine.today": { en: "Today", ur: "آج", roman: "Aaj" },
  "routine.markDone": { en: "Done", ur: "ہو گیا", roman: "Ho gaya" },
  "routine.snooze15": {
    en: "Snooze 15m",
    ur: "۱۵ منٹ بعد",
    roman: "15 min baad",
  },
  "routine.skip": { en: "Skip", ur: "چھوڑ دیں", roman: "Chhod dein" },
  "routine.later": { en: "Later", ur: "بعد میں", roman: "Baad mein" },
  "routine.allDone": {
    en: "All done for now.",
    ur: "فی الحال سب مکمل۔",
    roman: "Filhaal sab mukammal.",
  },
  "routine.turnOn": {
    en: "Turn on reminders",
    ur: "یاد دہانیاں آن کریں",
    roman: "Reminders on karein",
  },
  "routine.turnOnHint": {
    en: "A nudge when each item is due, then a check-in that keeps reminding until you mark it done.",
    ur: "ہر کام کے وقت پر ایک اشارہ، پھر یاد دہانی جو مکمل کرنے تک آتی رہے گی۔",
    roman: "Har kaam ke waqt par ek ishara, phir yaad-dahani jo mukammal karne tak aati rahegi.",
  },
  "routine.repeating": { en: "Repeating", ur: "بار بار", roman: "Baar baar" },
  "routine.doneShort": { en: "done", ur: "ہو گیا", roman: "ho gaya" },
  "routine.countOf": {
    en: "{c} / {t} {u}",
    ur: "{c} / {t} {u}",
    roman: "{c} / {t} {u}",
  },
  "routine.nextIn": {
    en: "next in {m}m",
    ur: "اگلا {m} منٹ میں",
    roman: "agla {m} min mein",
  },
  "routine.setup": {
    en: "Set up your routine",
    ur: "اپنی روٹین ترتیب دیں",
    roman: "Apni routine set karein",
  },
  "routine.setupHint": {
    en: "Start with the five prayers plus open/close shop, a morning walk and sleep. You can change every time and add your own afterwards.",
    ur: "پانچ نمازوں کے ساتھ دکان کھولنا/بند کرنا، صبح کی سیر اور نیند سے شروع کریں۔ ہر وقت بدل سکتے ہیں اور بعد میں اپنے کام شامل کر سکتے ہیں۔",
    roman: "Paanch namazon ke sath dukaan kholna/band karna, subah ki sair aur neend se shuru karein. Har waqt badal sakte hain aur baad mein apne kaam add kar sakte hain.",
  },
  "routine.addStarter": {
    en: "Add starter routine",
    ur: "ابتدائی روٹین شامل کریں",
    roman: "Shuruaati routine add karein",
  },
  "routine.notLogged": {
    en: "Not logged yet",
    ur: "ابھی درج نہیں",
    roman: "Abhi darj nahi",
  },
  "routine.markedDone": { en: "Marked done", ur: "مکمل نشان زد", roman: "Done nishan zad" },
  "routine.markedMissed": {
    en: "Marked missed",
    ur: "رہ گیا نشان زد",
    roman: "Reh gaya nishan zad",
  },
  "routine.markedSkipped": {
    en: "Skipped",
    ur: "چھوڑ دیا",
    roman: "Chhod diya",
  },
  "routine.windowUntil": {
    en: "window until {t}",
    ur: "وقت {t} تک",
    roman: "waqt {t} tak",
  },
  "routine.prayerLock": {
    en: "A prayer can be logged once its time begins.",
    ur: "نماز اُس کا وقت شروع ہونے پر درج ہو سکتی ہے۔",
    roman: "Namaz us ka waqt shuru hone par darj ho sakti hai.",
  },
  "routine.missed": { en: "Missed", ur: "رہ گیا", roman: "Reh gaya" },
  "routine.clear": { en: "Clear", ur: "ہٹائیں", roman: "Hatayein" },
  "routine.checkIn": { en: "Check in", ur: "پوچھ گچھ", roman: "Check in" },
  "routine.now": { en: "Now", ur: "ابھی", roman: "Abhi" },
  "routine.didYouPray": {
    en: "Did you offer {label} prayer?",
    ur: "کیا آپ نے {label} کی نماز پڑھی؟",
    roman: "Kya aap ne {label} ki namaz parhi?",
  },
  "routine.doneQ": {
    en: "{label} — done?",
    ur: "{label} — ہو گیا؟",
    roman: "{label} — ho gaya?",
  },
  "routine.yes": { en: "Yes", ur: "ہاں", roman: "Haan" },
  "routine.no": { en: "No", ur: "نہیں", roman: "Nahi" },
  "routine.inTime": { en: "in {d}", ur: "{d} میں", roman: "{d} mein" },
  "routine.prayerLogWhen": {
    en: "Can be logged once the prayer time begins.",
    ur: "نماز کا وقت شروع ہونے پر درج ہو سکتی ہے۔",
    roman: "Namaz ka waqt shuru hone par darj ho sakti hai.",
  },
  "routine.markDoneEarly": {
    en: "Mark done early",
    ur: "پہلے ہی مکمل کریں",
    roman: "Pehle hi mukammal karein",
  },
  "routine.setForToday": {
    en: "You're set for today.",
    ur: "آج کے لیے سب تیار ہے۔",
    roman: "Aaj ke liye sab tayyar hai.",
  },
  "routine.nothingElse": {
    en: "Nothing else on the schedule.",
    ur: "شیڈول میں اور کچھ نہیں۔",
    roman: "Schedule mein aur kuch nahi.",
  },
  "routine.upcoming": { en: "Upcoming", ur: "آنے والا", roman: "Aane wala" },
  "routine.past": { en: "Past", ur: "گزرا", roman: "Guzra" },

  // ---- settings ---------------------------------------------------------
  "settings.account": { en: "Account", ur: "اکاؤنٹ", roman: "Account" },
  "settings.language": { en: "Language", ur: "زبان", roman: "Zabaan" },
  "settings.languageHint": {
    en: "Changes labels across the app.",
    ur: "پوری ایپ کے لیبل بدل دیتا ہے۔",
    roman: "Poori app ke labels badal deta hai.",
  },
  "settings.routine": { en: "Routine", ur: "روٹین", roman: "Routine" },
  "settings.editRoutine": {
    en: "Edit routine items & times",
    ur: "روٹین کی چیزیں اور اوقات ترمیم کریں",
    roman: "Routine ki cheezein aur auqaat edit karein",
  },
  "settings.signOut": { en: "Sign out", ur: "سائن آؤٹ", roman: "Sign out" },

  // ---- shop settings ----------------------------------------------------
  "shopset.business": { en: "Business", ur: "کاروبار", roman: "Business" },
  "shopset.active": { en: "active", ur: "فعال", roman: "active" },
  "shopset.newBusiness": {
    en: "+ New business",
    ur: "+ نیا کاروبار",
    roman: "+ Naya business",
  },
  "shopset.newBusinessTitle": {
    en: "New business",
    ur: "نیا کاروبار",
    roman: "Naya business",
  },
  "shopset.businessName": {
    en: "Business name",
    ur: "کاروبار کا نام",
    roman: "Business ka naam",
  },
  "shopset.createBusiness": {
    en: "Create business",
    ur: "کاروبار بنائیں",
    roman: "Business banayein",
  },
  "shopset.deleteBusiness": {
    en: "Delete this business",
    ur: "یہ کاروبار حذف کریں",
    roman: "Ye business delete karein",
  },
  "shopset.deleteBusinessArm": {
    en: "Tap again — deletes “{name}” and all its data",
    ur: "دوبارہ دبائیں — “{name}” اور اُس کا سارا ڈیٹا حذف ہو گا",
    roman: "Dobara dabayein — “{name}” aur us ka sara data delete ho ga",
  },
  "shopset.profile": {
    en: "Profile — shows on bills",
    ur: "پروفائل — بل پر نظر آتا ہے",
    roman: "Profile — bill par nazar aata hai",
  },
  "shopset.noLogo": { en: "No logo", ur: "لوگو نہیں", roman: "Logo nahi" },
  "shopset.logoPremium": {
    en: "Bills show the MizanKhata logo. Upgrade to Premium to put your own logo on bills.",
    ur: "بلوں پر میزان کھاتہ کا لوگو آتا ہے۔ اپنا لوگو لگانے کے لیے پریمیم لیں۔",
    roman: "Billon par MizanKhata ka logo aata hai. Apna logo lagane ke liye Premium lein.",
  },
  "shopset.uploadLogo": {
    en: "Upload logo",
    ur: "لوگو اپ لوڈ کریں",
    roman: "Logo upload karein",
  },
  "shopset.changeLogo": {
    en: "Change logo",
    ur: "لوگو بدلیں",
    roman: "Logo badlein",
  },
  "shopset.phone": { en: "Phone", ur: "فون", roman: "Phone" },
  "shopset.address": { en: "Address", ur: "پتہ", roman: "Pata" },
  "shopset.shopAddress": {
    en: "Shop address",
    ur: "دکان کا پتہ",
    roman: "Dukaan ka pata",
  },
  "shopset.data": { en: "Data", ur: "ڈیٹا", roman: "Data" },
  "shopset.display": { en: "Display", ur: "نمائش", roman: "Display" },
  "shopset.importDigikhata": {
    en: "Import from Digikhata",
    ur: "ڈیجی کھاتہ سے درآمد کریں",
    roman: "Digikhata se import karein",
  },
};

/** Replace `{k}` placeholders. */
function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function translate(
  lang: Lang,
  key: string,
  fallback?: string,
  vars?: Record<string, string | number>,
): string {
  const e = DICT[key];
  const raw = e ? e[lang] || e.en : (fallback ?? key);
  return fill(raw, vars);
}

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "ur" || v === "roman";
}
