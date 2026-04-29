#!/bin/bash
# تشغيل تطبيق الإنتاجية محلياً
cd "$(dirname "$0")"
echo "🚀 جارٍ تشغيل تطبيق الإنتاجية..."
npm start &
sleep 2
open http://localhost:3000
echo "✅ التطبيق يعمل على http://localhost:3000"
echo "لإيقافه: اضغط Ctrl+C في هذه النافذة"
wait
