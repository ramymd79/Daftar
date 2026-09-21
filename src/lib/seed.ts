import type { AppState } from "./types";

export const DEMO_PASSWORD = "demo1234";

export function createSeedState(): AppState {
  return {
    unlocked: false,
    clients: [
      {
        id: "cli_ahmed",
        name: "أحمد حسن العزب",
        phone: "+20 1099887766",
      },
      {
        id: "cli_mona",
        name: "منى عادل",
        phone: "+20 1011223344",
      },
    ],
    contractors: [
      {
        id: "ctr_naggash",
        name: "مقاول النقاشة — سامح يوسف",
        phone: "+20 1000112233",
      },
      {
        id: "ctr_sebaka",
        name: "مقاول السباكة — هشام فاروق",
        phone: "+20 1222334455",
      },
    ],
    suppliers: [
      {
        id: "sup_tiles",
        name: "معرض السيراميك — المعادي",
        phone: "+20 1555667788",
      },
      {
        id: "sup_paint",
        name: "دهانات النور",
        phone: "+20 1666778899",
      },
    ],
    categories: [
      { id: "cat_tiles", name: "بلاط", color: "#e67e22" },
      { id: "cat_wood", name: "نجارة", color: "#8e44ad" },
      { id: "cat_paint", name: "نقاشة", color: "#2980b9" },
      { id: "cat_plumb", name: "سباكة", color: "#16a085" },
      { id: "cat_elec", name: "كهرباء", color: "#c0392b" },
      { id: "cat_other", name: "متنوع", color: "#7f8c8d" },
    ],
    projects: [
      {
        id: "prj_maadi",
        name: "فيلا المعادي - تشطيبات",
        address: "المعادي — القاهرة",
        clientId: "cli_ahmed",
        status: "active",
        contractTotal: 2050000,
        supervisionPct: 12,
        createdAt: "2024-08-01T10:00:00.000Z",
      },
      {
        id: "prj_zayed",
        name: "شقة الشيخ زايد",
        address: "الشيخ زايد — الجيزة",
        clientId: "cli_mona",
        status: "active",
        contractTotal: 780000,
        supervisionPct: 10,
        createdAt: "2024-09-10T10:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "tx_pay_1",
        projectId: "prj_maadi",
        type: "client_payment",
        amount: 250000,
        date: "2024-08-05T12:00:00.000Z",
        notes: "دفعة تحت الحساب",
        createdAt: "2024-08-05T12:00:00.000Z",
      },
      {
        id: "tx_pay_2",
        projectId: "prj_maadi",
        type: "client_payment",
        amount: 145000,
        date: "2024-08-28T14:39:00.000Z",
        notes: "دفعة ثانية",
        createdAt: "2024-08-28T14:39:00.000Z",
      },
      {
        id: "tx_exp_1",
        projectId: "prj_maadi",
        type: "expense",
        amount: 77500,
        date: "2024-08-12T09:00:00.000Z",
        notes: "شراء بلاط",
        categoryId: "cat_tiles",
        supplierId: "sup_tiles",
        createdAt: "2024-08-12T09:00:00.000Z",
      },
      {
        id: "tx_exp_2",
        projectId: "prj_maadi",
        type: "expense",
        amount: 5000,
        date: "2024-08-13T11:00:00.000Z",
        notes: "نقل ومشونة بلاط",
        categoryId: "cat_tiles",
        createdAt: "2024-08-13T11:00:00.000Z",
      },
      {
        id: "tx_exp_3",
        projectId: "prj_maadi",
        type: "expense",
        amount: 25000,
        date: "2024-08-20T16:00:00.000Z",
        notes: "مصنعيات بلاط",
        categoryId: "cat_tiles",
        contractorId: "ctr_naggash",
        createdAt: "2024-08-20T16:00:00.000Z",
      },
      {
        id: "tx_exp_4",
        projectId: "prj_maadi",
        type: "expense",
        amount: 57500,
        date: "2024-08-22T10:00:00.000Z",
        notes: "خشب أبواب",
        categoryId: "cat_wood",
        createdAt: "2024-08-22T10:00:00.000Z",
      },
      {
        id: "tx_exp_5",
        projectId: "prj_maadi",
        type: "expense",
        amount: 3700,
        date: "2024-08-23T10:00:00.000Z",
        notes: "نقل نجارة",
        categoryId: "cat_wood",
        createdAt: "2024-08-23T10:00:00.000Z",
      },
      {
        id: "tx_exp_6",
        projectId: "prj_maadi",
        type: "expense",
        amount: 18500,
        date: "2024-08-25T15:00:00.000Z",
        notes: "دهانات",
        categoryId: "cat_paint",
        supplierId: "sup_paint",
        createdAt: "2024-08-25T15:00:00.000Z",
      },
      {
        id: "tx_pay_z1",
        projectId: "prj_zayed",
        type: "client_payment",
        amount: 120000,
        date: "2024-09-12T10:00:00.000Z",
        notes: "دفعة أولى",
        createdAt: "2024-09-12T10:00:00.000Z",
      },
      {
        id: "tx_exp_z1",
        projectId: "prj_zayed",
        type: "expense",
        amount: 32000,
        date: "2024-09-15T12:00:00.000Z",
        notes: "محارة وكهرباء ابتدائي",
        categoryId: "cat_elec",
        createdAt: "2024-09-15T12:00:00.000Z",
      },
    ],
    photos: [
      {
        id: "ph_1",
        projectId: "prj_maadi",
        dataUrl:
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect fill="#d6d3d1" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#44403c" font-size="28" font-family="Tahoma">صور الموقع — بلاط</text></svg>`,
          ),
        caption: "توريد بلاط الصالة",
        sharedWithClient: true,
        createdAt: "2024-08-14T10:00:00.000Z",
      },
      {
        id: "ph_2",
        projectId: "prj_maadi",
        dataUrl:
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect fill="#e7e5e4" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#44403c" font-size="28" font-family="Tahoma">ملاحظة داخلية</text></svg>`,
          ),
        caption: "ملاحظة داخلية للمكتب",
        sharedWithClient: false,
        createdAt: "2024-08-18T10:00:00.000Z",
      },
    ],
  };
}
