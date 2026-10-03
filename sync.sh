#!/usr/bin/env bash
set -e

REMOTE=nova
BRANCH=main
KEEP=(
  "mail-worker/wrangler.toml"
  "mail-vue/index.html"
  ".github"
  "README.md"
  "README.zh-CN.md"
  "LICENSE"
  ".gitignore"
  "doc"
)

git remote get-url "$REMOTE" >/dev/null 2>&1 || git remote add "$REMOTE" https://github.com/beihaime/nova-mail.git
git fetch "$REMOTE"

if git merge-base HEAD "$REMOTE/$BRANCH" >/dev/null 2>&1; then
  FLAGS=()
else
  echo "Ortak geçmiş yok, ilk birleştirme yapılıyor."
  FLAGS=(--allow-unrelated-histories -X theirs)
fi

git merge --no-commit --no-ff "${FLAGS[@]}" "$REMOTE/$BRANCH" || true

# Kalan çakışmalarda nova-mail tarafını al
UNMERGED=$(git diff --name-only --diff-filter=U)
if [ -n "$UNMERGED" ]; then
  echo "$UNMERGED" | xargs -d '\n' git checkout --theirs --
  echo "$UNMERGED" | xargs -d '\n' git add --
fi

# Korunacak yolları kendi sürümüne geri yükle
for p in "${KEEP[@]}"; do
  git rm -rq --cached --ignore-unmatch -- "$p"
  rm -rf -- "$p"
  git checkout HEAD -- "$p" 2>/dev/null || true
done

if git diff --cached --quiet; then
  git merge --abort 2>/dev/null || true
  echo "Yeni değişiklik yok."
else
  git commit -m "merge: nova-mail/$BRANCH (korunan dosyalar hariç)"
  echo "Tamam. Göndermek için: git push"
fi