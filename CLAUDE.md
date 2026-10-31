# Claude 作業ルール（タマ活LP）

このリポジトリは本番ページ（GitHub Pages）そのもの。`main` に入った変更は1〜2分で公開される。
`README.md` の「変えないもの（約束）」「直したあとの確認チェック」「更新履歴」も必ず守る。

## 反映ルール：編集する前に、必ず保存する

`main` で直接編集し、そのまま push して反映してよい（別ブランチ・Pull Request・オーナー確認は不要）。
ただし、次の順番を必ず守り、どれか1つでも失敗したら、その先には進まない。

1. **保存：編集する前に、今の `main` をバックアップする**
   - `git pull origin main` で最新にする
   - 今の `main` を `backup-YYYYMMDD-HHMM` ブランチとして保存する：`git push origin main:refs/heads/backup-YYYYMMDD-HHMM`
     （この環境ではタグの push が拒否されるため、ブランチで保存する）
   - `git ls-remote --heads origin` でバックアップブランチが GitHub にあることを確認してから、編集を始める（問題が起きたら、このブランチの状態に戻す）
2. **編集する**（`main` 上で直接）
3. **反映前の確認**
   - `README.md` の「直したあとの確認チェック」を実行する（スマホ幅390pxで横スクロールなし、トップ→診断→結果、下部5タブなど）
   - `git diff` で、意図しない変更が入っていないか確認する
4. **反映**：コミットして `git push origin main` する
5. **公開ページで確認して報告**
   https://haru0101ma11ka09-crypto.github.io/tamakatsu-preview/ で反映を確認し、
   変更内容・バックアップブランチ名を報告する

## 元に戻すとき
バックアップブランチの状態に戻すコミットを作って `main` に push する（履歴は消さない。`git push --force` はしない）。

## その他
- `changelog/index.html` に「何を・どこを・どう直したか」と、直す前／直した後のスクショ（`changelog/img/`）を追記する
- `diagnosis-data.js`・`result-guidance.js` の採点・文言は、相談なしに変えない
- リポジトリは公開されているので、社外秘の情報を書かない
