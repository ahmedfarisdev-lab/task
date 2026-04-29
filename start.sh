#!/bin/bash
# تشغيل تطبيق الإنتاجية محلياً
cd "$(dirname "$0")"
echo "🔨 جارٍ البناء..."
npm run build
echo "🚀 جارٍ تشغيل التطبيق..."
npx serve out -p 3000 &
sleep 2
open http://localhost:3000
echo "✅ التطبيق يعمل على http://localhost:3000"
echo "لإيقافه: اضغط Ctrl+C"
wait
