# Printforge — инструкции по работе с большими файлами и оптимизации (коротко)

Это минимальная инструкция, чтобы быстро и безопасно уменьшить размер репозитория и начать использовать Git LFS, а также базовые команды для оптимизации изображений и GLB.

1) Быстрая проверка (на вашем ПК)
- git checkout main
- git pull origin main
- cat .gitattributes   # убедиться, что есть строки для product_photos/* и *.glb

2) Включить Git LFS (одноразово)
- git lfs install

3) Если хотите добавить трекинг (на всякий случай)
- git lfs track "*.glb" "product_photos/*" "*.stl" "*.fbx"
- git add .gitattributes
- git commit -m "Enable Git LFS tracking (local)"
- git push

4) Обработка уже существующих больших файлов — варианты
A) Ничего не трогать сейчас (самый безопасный): начать использовать LFS для новых добавлений. Старые большие файлы останутся в истории.

B) Миграция истории в LFS (уменьшит размер репо, НО перепишет историю — требуются force-push и координация с другими клонами):
- git lfs migrate import --include="*.glb,product_photos/*,*.stl,*.fbx" --include-ref=refs/heads/main
- git push --force origin main

ВНИМАНИЕ: вариант B требует, чтобы вы были готовы к force-push. Все, кто клонировал репо, должны будут заново клонировать.

5) Быстрая оптимизация изображений (локально)
- Установите cwebp (например, Ubuntu: `sudo apt install webp`, macOS: `brew install webp`).
- Создать WebP копии:
  mkdir -p product_photos_webp
  for f in product_photos/*.jpg; do cwebp -q 80 "$f" -o "product_photos_webp/$(basename "${f%.*}").webp"; done

- Проверьте сайт локально. Если всё ок, можно заменить пути в products.json на /product_photos_webp/NAME.webp.

6) Быстрая команда для сжатия GLB (локально)
- Установите gltfpack (https://github.com/zeux/meshoptimizer)
- Пример:
  gltfpack -i Zayka.glb -o Zayka.opt.glb -c 10 --draco
- Проверить Zayka.opt.glb в просмотрщике. Загрузить оптимизированный файл в GitHub Releases или CDN и заменить путь в сайте.

7) Вынести inline CSS/JS (рекомендация)
- Откройте index.html и:
  - Вырежьте содержимое <style>...</style> в файл styles.css и добавьте в <head>:
    <link rel="stylesheet" href="styles.css">
  - Для больших скриптов вынесите в app.js и подключите с `defer`.
- Закоммитьте и пушьте.

8) Примеры коммитов
- git add .
- git commit -m "Enable Git LFS and add optimization scripts"
- git push

Если вы хотите, я могу прямо сейчас подготовить в репозитории небольшие файлы:
- README (сделал этот файл),
- скрипт batch_convert_images.sh для конвертации в WebP,
- скрипт optimize_glb.sh для запуска gltfpack (шаблон),
- или PR с вынесением CSS/JS.

Напишите коротко: "Сделай скрипты" или "Хочу PR" или "Только команды" — и я выполню соответствующее действие.
