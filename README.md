# دفتر | Daftar

دفتر فلوس لمشاريع التشطيب — تجربة عربية RTL على الموبايل.

الاسم الإنجليزي للمنتج: **Daftar** (ليس SiteFlow). في الواجهة: **دفتر**.

## للمساعدين / Agents

- قاعدة المنتج الدائمة: [`.cursor/rules/daftar-product.mdc`](.cursor/rules/daftar-product.mdc)
- موجز المنتج: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- تسليم سريع: [`AGENTS.md`](AGENTS.md)
- تجربة حية: https://ramymd79.github.io/Daftar/ — كلمة السر `demo1234`

## تشغيل محلي

```bash
npm install
npm run dev
```

افتح http://localhost:3000

كلمة سر التجربة: `demo1234`

## بناء ثابت لـ GitHub Pages

```bash
set GITHUB_PAGES=true
npm run build
```

المخرجات في `out/` مع `basePath` = `/Daftar`.

## ماذا تجرب؟

1. دخول بكلمة السر
2. فتح مشروع تجريبي أو إنشاء مشروع
3. تسجيل دفعة من العميل أو مصروف بصورة اختيارية
4. مراجعة الملخص والتوزيع
5. فتح عرض العميل (قراءة فقط)
6. طباعة / حفظ PDF لكشف الحساب
