/**
 * 広島学生AIハッカソン 参加申込フォーム 生成スクリプト
 *
 * 元になる仕様: 作業/応募フォーム案_広島学生AIハッカソン.md（2026-08-07 時点）
 *
 * 使い方
 *   1. https://script.google.com/ を開き「新しいプロジェクト」
 *   2. このファイルの中身をすべて貼り付けて保存
 *   3. 関数 createHackathonForm を選んで「実行」
 *      → 初回のみ権限の承認を求められる。「詳細」→「（安全ではないページ）に移動」で承認
 *   4. 実行ログに編集URLと回答URLが出力される
 *
 * 実行後に手作業で行うこと（スクリプトからは設定できない項目）
 *   - 設定 > 回答 > 「回答のコピーを回答者に送信」を ON
 *   - 回答先スプレッドシートの作成
 *   - 公開して回答URLをLPの「参加を申し込む」ボタンに差し込む
 */

const TERMS_PDF = 'https://hiroshima-ai-hackathon.jp/pdf/terms.pdf';
const GUIDE_PDF = 'https://hiroshima-ai-hackathon.jp/pdf/ai-guideline.pdf';

function createHackathonForm() {
  const form = FormApp.create('広島学生AIハッカソン 参加申込フォーム');

  form.setDescription(
    [
      '日時: 2026年9月19日（土）11:00〜17:00（受付10:30〜）',
      '会場: イノベーション・ハブ・ひろしまCamps（広島市）',
      '参加費: 無料',
      '対象: 広島県内に所在する学校に在籍する、13歳以上の中学生・高校生・大学生・高専生・専門学校生（在籍する学校の所在地で判断します）',
      '参加形式: 2〜3人のチーム単位での申込（代表者がこのフォームに入力してください）',
      '申込締切: 2026年9月7日（月） ／ 選考結果のご連絡: 9月9日（水）',
      '　※諸事情により延長する場合があります',
      'チームは同じ区分どうしで組んでください（中学生×高校生などの混成は不可）',
      '定員: 25人前後（2〜3人のチームで8チーム程度。応募多数の場合は、年齢や学校のバランスを調整して主催者が参加チームを決定します）',
      '',
      '■ 申込前に、次の2つを必ずお読みください',
      '参加規約（PDF）: ' + TERMS_PDF,
      '生成AI・開発サービス 利用ガイドライン（PDF）: ' + GUIDE_PDF,
      '',
      '※ 本大会は、中学生から大学生まで全員が同じ道具で競います。使えるAIサービスは ChatGPT・Gemini（AIコーディングツールは Codex）、作品の公開は Netlify・GitHub Pages・ChatGPT Sites を使います。保護者の方も一緒にガイドラインをご確認ください。'
    ].join('\n')
  );

  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  // ===== セクション1: チーム情報（1ページ目） =====
  form.addSectionHeaderItem()
    .setTitle('セクション1: チーム情報');

  form.addTextItem()
    .setTitle('チーム名')
    .setHelpText('後から変更できます。決まっていなければ仮の名前で構いません')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('参加区分')
    .setHelpText('チームは同じ区分どうしで組んでください。区分をまたぐ混成チームは組めません')
    .setChoiceValues(['13歳以上の中学生', '高校生', '大学生・高専生・専門学校生'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('チーム人数')
    .setHelpText('1名（個人）での参加はできません')
    .setChoiceValues(['2人', '3人'])
    .setRequired(true);

  // ===== セクション2: 代表者情報 =====
  form.addPageBreakItem()
    .setTitle('セクション2: 代表者情報')
    .setHelpText('連絡はすべて代表者の方あてにお送りします');

  addPersonFields(form, '代表者', true);

  form.addTextItem()
    .setTitle('代表者のメールアドレス')
    .setHelpText('選考結果をこのアドレスにお送りします。普段確認するアドレスをご記入ください')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build())
    .setRequired(true);

  form.addTextItem()
    .setTitle('代表者の電話番号（緊急連絡用）')
    .setHelpText('当日の緊急連絡にのみ使用します')
    .setRequired(true);

  // ===== セクション3: メンバー2 情報 =====
  form.addPageBreakItem()
    .setTitle('セクション3: メンバー2 情報');

  addPersonFields(form, 'メンバー2', false);

  // ===== セクション4: メンバー3 情報 =====
  form.addPageBreakItem()
    .setTitle('セクション4: メンバー3 情報')
    .setHelpText('■ 3人チームの方のみご記入ください。2人チームの方は空欄のまま次へ進んでください');

  addPersonFields(form, 'メンバー3', false, /* optional= */ true);

  // ===== セクション5: その他 =====
  form.addPageBreakItem()
    .setTitle('セクション5: その他');

  form.addMultipleChoiceItem()
    .setTitle('ノートPCの持参')
    .setHelpText('全員分は不要ですが、チームに1台もないと開発がむずかしくなります')
    .setChoiceValues(['チームで1台以上持参できる', '持参できない（主催者へ相談したい）'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('写真の顔出しNGのメンバー（任意）')
    .setHelpText('顔出しNGのメンバーがいる場合はお名前を書いてください。当日の撮影・掲載時に配慮します')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('質問・連絡事項（任意）')
    .setRequired(false);

  // ===== セクション6: 同意事項（最終セクション） =====
  form.addPageBreakItem()
    .setTitle('セクション6: 同意事項（すべて必須）')
    .setHelpText(
      [
        'お申し込みの前に、次の2つを必ずお読みください。',
        '',
        '参加規約（PDF）',
        TERMS_PDF,
        '',
        '生成AI・開発サービス 利用ガイドライン（PDF）',
        GUIDE_PDF
      ].join('\n')
    );

  form.addCheckboxItem()
    .setTitle('募集要項の遵守')
    .setHelpText('参加規約および生成AI・開発サービス利用ガイドラインの内容を確認し、チーム全員がこれを遵守することに同意します。')
    .setChoiceValues(['同意します'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('肖像の利用への同意')
    .setHelpText('当日、運営が撮影した写真・動画（参加者が写ったものを含む）を、主催者およびHiBiSのWebサイト・SNS・広報物・報道機関への提供に使用することに、チーム全員が同意します。')
    .setChoiceValues(['同意します'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('保護者の同意（18歳未満）')
    .setHelpText(
      'チームに18歳未満の方が含まれる場合、その方全員が、次の4点について保護者の同意を得ることができます。' +
      '①本イベントへの参加 ②撮影された写真・動画を記録・広報の目的で使用すること ' +
      '③参加規約の内容（とくに免責事項）を了解すること ' +
      '④当日使用する生成AIサービスのアカウントが保護者の同意のうえで作成されたものであること。' +
      '同意の確認は参加が決定したあとに行い、対象の方へ運営から個別にご案内します（申込時には保護者の氏名・連絡先は取得しません）。' +
      '※18歳未満の方がいない場合もチェックしてください'
    )
    .setChoiceValues(['確認しました'])
    .setRequired(true);

  form.setConfirmationMessage(
    [
      'お申し込みありがとうございます！',
      '',
      '応募が定員（25人前後）を超えた場合は、年齢や学校のバランスを調整して主催者が参加チームを決定します。',
      '2026年9月9日（水）までに、代表者のメールアドレスへ参加可否をご連絡します。',
      '',
      '■ 当日までにお願いしたいこと',
      'ChatGPTとGeminiの両方のアカウントを、チーム全員が各自でご用意ください。',
      '無料版には使用量の上限があるため、片方が上限に達したらもう一方に切り替えて開発を続けます。チームで1つでは足りません。',
      '当日その場でアカウントを作ると、開発時間が足りなくなります。',
      '',
      '当日は「ノートPC・アイデア・好奇心」を持ってきてください。昼食は各自でご用意ください。'
    ].join('\n')
  );

  Logger.log('編集URL: ' + form.getEditUrl());
  Logger.log('回答URL: ' + form.getPublishedUrl());
  Logger.log('この回答URLをLPの「参加を申し込む」ボタンに差し込んでください。');
}

/**
 * 氏名・ふりがな・学校名・学年・年齢の5項目をまとめて追加する。
 * @param {GoogleAppsScript.Forms.Form} form
 * @param {string} label   「代表者」「メンバー2」など、設問名の接頭辞
 * @param {boolean} isRep  代表者なら true（年齢の補足文言を変える）
 * @param {boolean} optional 3人目のように任意入力にする場合 true
 */
function addPersonFields(form, label, isRep, optional) {
  const required = !optional;

  form.addTextItem().setTitle(label + ' 氏名').setRequired(required);
  form.addTextItem().setTitle(label + ' ふりがな').setRequired(required);

  form.addTextItem()
    .setTitle(label + ' 学校名')
    .setHelpText('広島県内に所在する学校に限ります。在籍する学校の所在地で判断します')
    .setRequired(required);

  form.addTextItem()
    .setTitle(label + ' 学年')
    .setRequired(required);

  // 年齢は参加資格（開催日時点で13歳以上）と保護者同意の要否（18歳未満）の判定に使う
  const ageHelp = '2026年9月19日（開催日）時点の年齢を半角数字でご記入ください' +
    (isRep ? '。開催日時点で13歳未満の方は参加できません' : '');

  form.addTextItem()
    .setTitle(label + ' 年齢')
    .setHelpText(ageHelp)
    .setValidation(
      FormApp.createTextValidation()
        .requireNumberGreaterThanOrEqualTo(13)
        .setHelpText('開催日時点で13歳以上の方が対象です')
        .build()
    )
    .setRequired(required);
}
