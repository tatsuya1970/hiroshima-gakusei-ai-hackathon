# -*- coding: utf-8 -*-
"""sitemap.xml の <lastmod> を、各ファイルの最終コミット日で書き換える。

使い方（リポジトリのルートで）:
    python tools/update-sitemap.py

<loc> の URL からリポジトリ内のファイルを割り出し、
git の最終コミット日（コミッタ日付・YYYY-MM-DD）を <lastmod> に入れる。
GitHub Actions（.github/workflows/update-sitemap.yml）から毎回実行され、
差分があるときだけコミットされる。
"""
import io
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
BASE = "https://hiroshima-ai-hackathon.jp/"


def url_to_path(loc):
    """<loc> の URL を、リポジトリ内のファイルパスに変換する。"""
    if not loc.startswith(BASE):
        return None
    rel = loc[len(BASE):]
    if rel == "" or rel.endswith("/"):
        rel += "index.html"
    return os.path.join(ROOT, rel.replace("/", os.sep))


def last_commit_date(path):
    out = subprocess.check_output(
        ["git", "log", "-1", "--format=%cs", "--", path],
        cwd=ROOT, universal_newlines=True).strip()
    return out or None


with io.open(SITEMAP, encoding="utf-8") as f:
    xml = f.read()

changed = []


def fix(block):
    loc = re.search(r"<loc>(.*?)</loc>", block.group(0), re.S)
    if not loc:
        return block.group(0)
    path = url_to_path(loc.group(1).strip())
    if not path or not os.path.exists(path):
        print("skip (ファイルが見つかりません): %s" % loc.group(1).strip())
        return block.group(0)
    date = last_commit_date(path)
    if not date:
        print("skip (コミット履歴なし): %s" % path)
        return block.group(0)

    def repl(m):
        if m.group(1) != date:
            changed.append((loc.group(1).strip(), m.group(1), date))
        return "<lastmod>%s</lastmod>" % date

    return re.sub(r"<lastmod>(.*?)</lastmod>", repl, block.group(0))


new_xml = re.sub(r"<url>.*?</url>", fix, xml, flags=re.S)

if new_xml == xml:
    print("sitemap.xml は最新です。")
    sys.exit(0)

with io.open(SITEMAP, "w", encoding="utf-8", newline="\n") as f:
    f.write(new_xml)

for loc, old, new in changed:
    print("updated: %s  %s -> %s" % (loc, old, new))
