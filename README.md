# Lyric Workspace 🧊

リリック制作用Webアプリ（PC版 + モバイル版 / PWA対応 / クラウド同期）

---

## 基本セットアップ（ローカル起動）

```bash
cd lyric-workspace
npm install
npm run dev
```

http://localhost:3000 でアプリが開く。

---

## Vercelデプロイ

```bash
git init && git add . && git commit -m "deploy"
git remote add origin https://github.com/ユーザー名/lyric-workspace.git
git branch -M main && git push -u origin main
```

Vercel (https://vercel.com) でGitHubリポジトリをインポート → Deploy。

---

## アカウント同期（Supabase設定）

複数端末でデータを同期するにはSupabase（無料）のセットアップが必要。

### Step 1: Supabaseプロジェクト作成

1. https://supabase.com/ にアクセス → GitHubアカウントでログイン
2. 「New Project」をクリック
3. プロジェクト名: `lyric-workspace`（何でもOK）
4. Database Password: 適当に設定（メモしておく）
5. Region: `Northeast Asia (Tokyo)` 推奨
6. 「Create new project」→ 数分待つ

### Step 2: データベーステーブル作成

1. Supabaseダッシュボード左メニュー「SQL Editor」をクリック
2. 以下のSQLをコピペして「Run」:

```sql
create table user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb,
  updated_at timestamptz default now()
);

alter table user_data enable row level security;

create policy "Users can read own data"
  on user_data for select using (auth.uid() = user_id);

create policy "Users can insert own data"
  on user_data for insert with check (auth.uid() = user_id);

create policy "Users can update own data"
  on user_data for update using (auth.uid() = user_id);
```

### Step 3: APIキーを取得

1. 左メニュー「Project Settings」→「API」
2. 以下の2つをコピー:
   - **Project URL** (例: `https://xxxxx.supabase.co`)
   - **anon public** キー (長い文字列)

### Step 4: 環境変数を設定

**ローカル開発の場合:**
```bash
cp .env.example .env
```
`.env` を開いて値を貼り付け:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Vercelデプロイの場合:**
Vercelのプロジェクト → Settings → Environment Variables に追加:
- `VITE_SUPABASE_URL` → Project URL
- `VITE_SUPABASE_ANON_KEY` → anon public キー

設定後にVercelで再デプロイ。

### Step 5: メール認証設定（任意）

デフォルトではSupabaseは確認メールを送信する。テスト時に面倒な場合:
1. Supabaseダッシュボード → Authentication → Providers
2. Email → 「Confirm email」をOFFにする

---

## PWA（ホーム画面に追加）

デプロイ後、スマホのブラウザからアクセスすると:

**iOS (Safari):**
共有ボタン → 「ホーム画面に追加」

**Android (Chrome):**
メニュー → 「ホーム画面に追加」またはインストールバナーが自動表示

ホーム画面からアプリのように起動できる。
