/**
 * タマ活：メンターへのレビューを「受け取る」「ページに返す」Apps Script
 *
 * ■ 使い方（はじめの1回だけ）
 *   1. Googleスプレッドシートを新しく作る（例：「タマ活 メンターレビュー」）
 *   2. メニューの「拡張機能」→「Apps Script」を開き、このファイルの中身をすべて貼りつけて保存
 *   3. 右上の「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *        ・次のユーザーとして実行：自分
 *        ・アクセスできるユーザー：全員
 *      で「デプロイ」し、表示された「ウェブアプリのURL」（…/exec）をコピー
 *   4. リポジトリの site-config.js の reviewWebhookUrl に、そのURLを入れる
 *
 * ■ シート「レビュー」の見方
 *   受付日時 / メンターID / メンター名 / 評価 / ニックネーム / 感想 / 非表示
 *   ・届いたレビューは、すぐにページに表示されます
 *   ・載せたくないレビューは「非表示」にチェックを入れると、ページから消えます（1分ほどで反映）
 *
 * ※ スクリプトを書きかえたときは、「デプロイ」→「デプロイを管理」→ 鉛筆マーク →
 *    バージョン「新しいバージョン」で更新してください（URLは変わりません）
 */

const SHEET_NAME = 'レビュー';
const HEADERS = ['受付日時', 'メンターID', 'メンター名', '評価', 'ニックネーム', '感想', '非表示'];
const HIDE_COL = 7; // 「非表示」の列（G列）

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

// 「=」などで始まる文字が、スプレッドシートの数式として動かないようにする
function safeText_(value, max) {
  let s = String(value || '').replace(/\r\n?/g, '\n').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// レビューを受け取る（ページの「レビューを送る」から呼ばれる）
function doPost(e) {
  const p = (e && e.parameter) || {};
  const mentorId = String(p.mentorId || '');
  const stars = parseInt(p.stars, 10);
  const text = safeText_(p.text, 500);
  if (!/^mentor-\d{2}$/.test(mentorId) || !(stars >= 1 && stars <= 5) || text.length < 5) {
    return json_({ ok: false });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_();
    sh.appendRow([new Date(), mentorId, safeText_(p.mentorName, 40), stars, safeText_(p.name, 20), text, false]);
    sh.getRange(sh.getLastRow(), HIDE_COL).insertCheckboxes();
  } finally {
    lock.releaseLock();
  }
  CacheService.getScriptCache().remove('reviews');
  return json_({ ok: true });
}

// 表示するレビューを返す（メンターの「詳しく見る」ページが読み込む）
function doGet() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('reviews');
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  const rows = getSheet_().getDataRange().getValues().slice(1);
  const reviews = rows
    .filter(r => r[1] && r[HIDE_COL - 1] !== true)
    .map(r => ({
      mentorId: String(r[1]),
      stars: Number(r[3]) || 0,
      name: String(r[4] || '').replace(/^'/, ''),
      text: String(r[5] || '').replace(/^'/, ''),
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Tokyo', 'yyyy-MM-dd') : ''
    }))
    .reverse(); // 新しい順
  const body = JSON.stringify({ reviews: reviews });
  cache.put('reviews', body, 60); // 1分だけ覚えておく（「非表示」は1分ほどで反映）
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
