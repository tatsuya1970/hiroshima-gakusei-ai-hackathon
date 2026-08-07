import { marked } from 'marked'
import { readFileSync, writeFileSync } from 'node:fs'

const [, , src, out, docTitle] = process.argv

const css = `
@page { size: A4 portrait; margin: 16mm 15mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Yu Gothic UI","Yu Gothic","Meiryo","Hiragino Kaku Gothic ProN",sans-serif;
  font-size: 9.6pt; line-height: 1.75; color: #222; margin: 0;
  font-feature-settings: "palt" 1;
}
h1 {
  font-size: 17pt; line-height: 1.35; margin: 0 0 .5em;
  padding-bottom: .35em; border-bottom: 3px solid #D62839; color: #111;
}
h2 {
  font-size: 11.6pt; margin: 1.5em 0 .5em; padding: .28em .7em;
  background: #FBEFE6; border-left: 4px solid #D62839; color: #111;
  break-after: avoid; page-break-after: avoid;
}
h3 { font-size: 10.4pt; margin: 1.2em 0 .4em; color: #B01E2E; break-after: avoid; }
p { margin: .5em 0; }
ol, ul { margin: .4em 0; padding-left: 1.6em; }
li { margin: .28em 0; }
li > ul { margin: .25em 0; padding-left: 1.3em; }
li > ul > li { list-style: none; position: relative; padding-left: .9em; }
li > ul > li::before { content: "・"; position: absolute; left: -.1em; color: #8C7A70; }
strong { color: #B01E2E; }
hr { border: none; border-top: 1px solid #E8DCD2; margin: 1.1em 0; }
blockquote {
  margin: .8em 0; padding: .6em .9em; background: #FFF9F3;
  border: 1px solid #F3E4D8; border-left: 4px solid #E8A13B; border-radius: 3px;
}
blockquote p { margin: .2em 0; }
table { border-collapse: collapse; width: 100%; margin: .7em 0; font-size: 9pt; }
th, td { border: 1px solid #E0D3C8; padding: .4em .6em; vertical-align: top; text-align: left; }
th { background: #FBEFE6; font-weight: 700; }
tr { break-inside: avoid; page-break-inside: avoid; }
a { color: #B01E2E; }
.meta { font-size: 8.6pt; color: #6B5C54; margin: 0 0 1em; line-height: 1.6; }
.foot {
  margin-top: 1.6em; padding-top: .6em; border-top: 1px solid #E8DCD2;
  font-size: 8.2pt; color: #8C7A70; text-align: right;
}
`

let md = readFileSync(src, 'utf8')
// 先頭の H1 と、その直後の発行情報行はヘッダとして別扱いにする
const lines = md.split(/\r?\n/)
const h1 = (lines.shift() || '').replace(/^#\s*/, '')
while (lines.length && lines[0].trim() === '') lines.shift()
let metaLines = []
while (lines.length && lines[0].trim() !== '' && !/^[#>|-]/.test(lines[0])) {
  metaLines.push(lines.shift())
}
md = lines.join('\n')

marked.setOptions({ gfm: true, breaks: false })
const bodyHtml = marked.parse(md)
const metaHtml = metaLines.length ? `<p class="meta">${marked.parseInline(metaLines.join('<br>'))}</p>` : ''

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${docTitle}</title><style>${css}</style></head>
<body><h1>${h1}</h1>${metaHtml}${bodyHtml}
<div class="foot">広島学生AIハッカソン 2026 ／ https://tatsuya1970.github.io/hiroshima-gakusei-ai-hackathon/</div>
</body></html>`

writeFileSync(out, html, 'utf8')
console.log('wrote', out)
