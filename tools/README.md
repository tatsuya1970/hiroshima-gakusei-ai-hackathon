このフォルダには2つの道具が入っている。

- `create-google-form.gs` — 応募フォーム（Googleフォーム）を生成するApps Script。下の「応募フォームの作り方」参照
- `md2html.mjs` — 募集要項をPDFにする変換スクリプト。下の「募集要項PDFの作り方」参照

---

# 応募フォームの作り方

`作業/応募フォーム案_広島学生AIハッカソン.md` の内容を、Googleフォームとして一括生成する。

1. https://script.google.com/ を開き「新しいプロジェクト」
2. `create-google-form.gs` の中身をすべて貼り付けて保存
3. 関数 `createHackathonForm` を選んで「実行」（初回のみ権限の承認が必要）
4. 実行ログに編集URLと回答URLが出る

**スクリプトでは設定できないので、実行後に手作業で行うこと。**

- 設定 > 回答 > **「回答のコピーを回答者に送信」を ON**
- 回答先スプレッドシートの作成
- **セクション4（メンバー3情報）の分岐設定** — 2人チームにセクション4を出したくない場合は、フォーム編集画面でセクション3の右下「次のセクションに進む」を条件分岐に変更する。※Googleフォームは「その設問があるセクションを終えた時点」で分岐するため、セクション1のチーム人数からは分岐できない（代表者情報とメンバー2情報まで飛ばしてしまう）。スクリプトではセクション4の各設問を**任意入力**にして、説明文で「3人チームのみ記入」と案内する形にしてある
- 公開して回答URLをLPの「参加を申し込む」ボタンに差し込む（`index.html` の2箇所）

## ⚠️ フォームは公開済み（2026-08-07）

**回答URL**: https://docs.google.com/forms/d/e/1FAIpQLSeR5Z-szACHxYXKmX-PMUy8MHzJys1QhfFfDZW293ubt9phjg/viewform

このURLは **LPの2箇所（ヒーローと最終CTA）の「参加を申し込む」ボタンから参照している。**

**`createHackathonForm` を再実行してはいけない。**実行すると別のフォームが新規に作られ、上記の回答URLとは別物になる。設問を直すときは、**フォーム編集画面で手作業で直し、あわせて `作業/応募フォーム案_広島学生AIハッカソン.md` とこのスクリプトも同じ内容に更新する**こと。

---

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
