# クイズアプリケーション

これはFlaskベースのクイズアプリケーションです。
ユーザー登録、ログイン、クイズの受験、結果表示、管理者による問題作成・編集・削除機能を提供します。

## プロジェクト構造

```
quiz_app/
├── venv/                   # Python仮想環境
├── src/
│   ├── models/             # SQLAlchemyモデル (quiz_models.py)
│   │   └── quiz_models.py
│   ├── routes/             # Flaskブループリント (APIエンドポイント)
│   │   ├── __init__.py
│   │   ├── auth_routes.py    # 認証関連API
│   │   ├── quiz_admin_routes.py # 管理者向けクイズ操作API
│   │   └── quiz_routes.py    # ユーザー向けクイズAPI
│   ├── static/             # 静的ファイル (HTML, CSS, JS)
│   │   └── index.html      # (プレースホルダー)
│   └── main.py             # Flaskアプリケーションエントリーポイント
└── requirements.txt        # Python依存関係
```

## セットアップと実行

1.  **リポジトリのクローンまたはダウンロード:**
    ソースコードを入手します。

2.  **仮想環境の作成と有効化:**
    ```bash
    cd quiz_app
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **依存関係のインストール:**
    ```bash
    pip install -r requirements.txt
    ```
    MySQLクライアントライブラリが必要な場合は、別途インストールしてください。
    例 (Debian/Ubuntu):
    ```bash
    sudo apt-get update
    sudo apt-get install -y default-libmysqlclient-dev build-essential
    pip install mysqlclient
    ```

4.  **データベースの設定:**
    `src/main.py` 内のデータベース接続情報（`SQLALCHEMY_DATABASE_URI`）を、ご自身のMySQL環境に合わせて設定してください。デフォルトでは `mydb` というデータベース名で、ユーザー名 `root`、パスワード `password` でローカルホストに接続しようとします。
    MySQLサーバーが起動しており、指定したデータベースが存在することを確認してください。

5.  **アプリケーションの実行:**
    ```bash
    python src/main.py
    ```
    アプリケーションはデフォルトで `http://localhost:5000` で起動します。

## APIエンドポイント

ベースURL: `http://localhost:5000/api`

### 認証 (`/auth`)

*   **POST /register**
    *   ユーザー登録
    *   リクエストボディ (JSON):
        ```json
        {
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "is_admin": false 
        }
        ```
    *   `is_admin` は任意で、デフォルトは `false` です。
*   **POST /login**
    *   ユーザーログイン
    *   リクエストボディ (JSON):
        ```json
        {
            "username": "testuser",
            "password": "password123"
        }
        ```
    *   成功すると、ユーザー情報と `is_admin` フラグを返します。実際の認証ではJWTトークンなどを発行します。

### 管理者向けクイズ操作 (`/admin`)

*   これらのエンドポイントは、リクエストヘッダーに `X-Admin-User-ID` を含め、そのIDのユーザーが管理者である必要があります（現在の実装では簡易的なチェックです）。

*   **POST /questions**
    *   新しいクイズ問題を作成します。
    *   リクエストボディ (JSON):
        ```json
        {
            "text": "日本の首都はどこですか？",
            "options": [
                {"text": "大阪", "is_correct": false},
                {"text": "京都", "is_correct": false},
                {"text": "東京", "is_correct": true},
                {"text": "名古屋", "is_correct": false}
            ]
        }
        ```
*   **GET /questions**
    *   全てのクイズ問題を取得します。
*   **GET /questions/<question_id>**
    *   指定されたIDのクイズ問題を取得します。
*   **PUT /questions/<question_id>**
    *   指定されたIDのクイズ問題を更新します。
    *   リクエストボディ (JSON): `POST /questions` と同様の形式で、更新したいフィールドを含めます。
*   **DELETE /questions/<question_id>**
    *   指定されたIDのクイズ問題を削除します。

### ユーザー向けクイズ機能 (`/quiz`)

*   これらのエンドポイントは、リクエストヘッダーに `X-User-ID` を含める必要があります（現在の実装では簡易的なチェックです）。

*   **GET /question**
    *   ランダムなクイズ問題を1問取得します。
*   **POST /submit**
    *   クイズの解答を送信します。
    *   リクエストボディ (JSON):
        ```json
        {
            "question_id": 1,
            "selected_option_id": 3
        }
        ```
    *   正解かどうか、正解の選択肢IDなどを返します。
*   **GET /results**
    *   現在のユーザーのクイズ結果（正解数、総解答数、正答率、各問題の詳細）を取得します。

## デザインについて

ご要望いただいた「シックで上品で女性受けするようなデザイン」については、現在のバージョンでは基本的なAPI機能の実装に注力しており、フロントエンドの具体的なデザインは含まれていません。
`src/static/index.html` がプレースホルダーとして存在しますが、ここにHTML、CSS、JavaScriptを記述してデザインを構築していく形になります。

デザインの方向性としては、以下のような要素を検討できます：
*   **配色:** パステルカラー、落ち着いたトーンの色（例：ベージュ、ラベンダー、ローズゴールド、ソフトグレー）を基調とし、アクセントカラーを効果的に使用する。
*   **フォント:** 可読性が高く、エレガントなサンセリフ体やセリフ体を選ぶ。
*   **レイアウト:** シンプルで直感的なナビゲーション、十分な余白を確保し、すっきりとした印象を与える。
*   **要素:** 丸みを帯びたボタンやカード、繊細なアイコン、高品質な画像やイラスト（もし使用する場合）。

具体的なデザインの実装は、このバックエンドAPIを基盤として、フロントエンド開発で進めていただくことになります。

## 今後の拡張について

*   **フロントエンド開発:** React、Vue.js、またはシンプルなHTML/CSS/JavaScriptでユーザーインターフェースを構築。
*   **認証強化:** JWT (JSON Web Tokens) などを導入し、セキュアな認証システムを実装。
*   **進捗管理:** ユーザーごとのクイズ進捗や履歴を詳細に記録・表示。
*   **カテゴリ別クイズ:** 問題にカテゴリを設定し、ユーザーがカテゴリを選択して挑戦できるようにする。
*   **ランキング機能:** ユーザーのスコアに基づいたランキングシステム。
*   **より詳細なフィードバック:** 解答後に解説を表示するなど。

ご不明な点がございましたら、お気軽にお尋ねください。

