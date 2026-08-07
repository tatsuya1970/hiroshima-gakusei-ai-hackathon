# 募集要項PDFの作り方

`作業/` の Markdown から `pdf/` の PDF を作り直す手順。**規約・ガイドラインを直したら、必ずPDFも作り直して push すること。**LPが `pdf/` を直接リンクしているため、忘れると古いPDFが配布され続ける。

## 必要なもの

- Node.js
- Google Chrome（`C:\Program Files\Google\Chrome\Application\chrome.exe`）

## 手順

```bash
cd tools
npm install            # 初回のみ（marked を入れる）

# Markdown → HTML
node md2html.mjs "../作業/参加規約_広島学生AIハッカソン.md" terms.html "広島学生AIハッカソン 参加規約"
node md2html.mjs "../作業/生成AI利用ガイドライン_広島学生AIハッカソン.md" guideline.html "広島学生AIハッカソン 生成AI・開発サービス 利用ガイドライン"
```

```powershell
# HTML → PDF（PowerShell）
# ※ 1本ずつ実行する。まとめて実行すると片方しか出力されない
# ※ --print-to-pdf と file:/// は必ず絶対パスで書く。相対パスだと何も出力されず、
#    しかもエラーも出ないので「成功した」と勘違いする
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$repo   = "C:\projects\hiroshima-gakusei-ai-hackathon"

& $chrome --headless --disable-gpu --no-pdf-header-footer `
  "--print-to-pdf=$repo\pdf\terms.pdf" "file:///$($repo -replace '\\','/')/tools/terms.html"

& $chrome --headless --disable-gpu --no-pdf-header-footer `
  "--print-to-pdf=$repo\pdf\ai-guideline.pdf" "file:///$($repo -replace '\\','/')/tools/guideline.html"
```

`gcm` や `externally_managed_app_manager` のERRORログが出るが、**`... bytes written to file ...` が表示されていれば成功。**この行が出ない場合は書き出されていないので、`pdf/` のタイムスタンプを必ず確認すること。

## 確認すること

- **ガイドラインは A4縦2枚以内**に収まっているか（超えたら本文を削る）
- 日本語が文字化けしていないか
- 中間生成物の `terms.html` / `guideline.html` は `.gitignore` 済み。コミットしない

## 出力先

| PDF | 公開URL |
|---|---|
| `pdf/terms.pdf` | https://tatsuya1970.github.io/hiroshima-gakusei-ai-hackathon/pdf/terms.pdf |
| `pdf/ai-guideline.pdf` | https://tatsuya1970.github.io/hiroshima-gakusei-ai-hackathon/pdf/ai-guideline.pdf |

このURLは**応募フォームとLPの3箇所から参照している**ので、ファイル名を変えないこと。
