# X Blue Delete

X/Twitter の「認証される」「X Premium」「プレミアムにアップグレード」などの勧誘 UI を非表示にする Chrome 拡張機能です。
フォロー中タイムラインの並び替えメニューが出る画面では、「人気」や「おすすめ」ではなく「最新」を自動で選びます。

## できること

- 「認証される」ボタンを非表示
- 「まだ認証されていません」カードを非表示
- 「プレミアムにアップグレード」カードを非表示
- 「プレミアムプラスにアップグレード」カードを非表示
- X Premium / Premium+ の登録・アップグレード誘導を非表示
- Verified Organizations / 認証済み組織の誘導を非表示
- 後から画面に差し込まれる勧誘カードやダイアログを非表示
- フォロー中タイムラインの並び替えを「最新」に維持

投稿本文の中に出てくる単語は、できるだけ消さないようにしています。

## 導入方法

1. このリポジトリをダウンロードする
   - Git が使える場合: `git clone https://github.com/7g3n/X-Blue-Delete.git`
   - ZIP で使う場合: GitHub の「Code」から「Download ZIP」を選び、ZIP を展開する
2. Chrome で `chrome://extensions/` を開く
3. 右上の「デベロッパー モード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」を押す
5. ダウンロードまたは clone した `X-Blue-Delete` フォルダを選ぶ
6. X/Twitter のタブを再読み込みする

## 更新方法

1. Git で導入した場合は、リポジトリ内で `git pull` を実行する
2. ZIP で導入した場合は、最新の ZIP をダウンロードして展開し直す
3. `chrome://extensions/` で X Blue Delete の「更新」ボタンを押す
4. X/Twitter のタブを再読み込みする

## 対象サイト

- `https://x.com/*`
- `https://twitter.com/*`
- `https://mobile.twitter.com/*`

## リリース告知ポスト文

X の Premium 勧誘や「認証される」表示をまとめて消して、フォロー中の並び替えも「最新」に固定する Chrome 拡張機能を作りました。

邪魔なアップグレードカードや認証誘導を減らして、タイムラインをすっきり見られます。

GitHub:
https://github.com/7g3n/X-Blue-Delete

#Chrome拡張 #X #Twitter #XPremium #タイムライン #拡張機能
