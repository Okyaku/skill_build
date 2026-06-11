# Supabase 認証設定ガイド

## 1. メール認証の設定

### Supabase Dashboard での設定:
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニューの「Authentication」→「Providers」を開く
4. 「Email」プロバイダを有効化
5. 以下の設定を確認:
   - ✅ Enable Email provider: ON
   - ✅ Confirm email: 必要に応じてON/OFF（開発中はOFFが便利）
   - ✅ Secure email change: ON（推奨）

### メール確認を無効にする（開発用）:
開発中はメール確認を無効にすると便利です:
1. Authentication → Settings → Email Auth
2. 「Confirm email」をOFFにする
3. これで登録後すぐにログインできます

## 2. Google OAuth の設定

### Google Cloud Console での設定:

#### ステップ1: OAuth 2.0 クライアントIDの作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 左メニューから「APIとサービス」→「認証情報」を開く
4. 「+ 認証情報を作成」→「OAuth クライアント ID」をクリック
5. 同意画面の構成を求められた場合:
   - 「外部」を選択して続行
   - アプリ名、ユーザーサポートメール、デベロッパー連絡先を入力
   - スコープは追加不要（デフォルトのまま）
   - テストユーザーを追加（開発中のみ）
   - 保存して続行

#### ステップ2: クライアントIDの設定
1. アプリケーションの種類: 「ウェブアプリケーション」を選択
2. 名前: 「Supabase Auth」など任意の名前
3. 承認済みのリダイレクトURI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   ※ YOUR_PROJECT_REF は Supabase のプロジェクトURL（例: abcdefghijklmn）
4. 「作成」をクリック
5. 表示される「クライアントID」と「クライアントシークレット」をコピー

### Supabase Dashboard での設定:
1. Supabase Dashboard → Authentication → Providers
2. 「Google」プロバイダを選択
3. 以下を入力:
   - **Client ID**: Google Cloud Console でコピーした クライアントID
   - **Client Secret**: Google Cloud Console でコピーした クライアントシークレット
4. 「Save」をクリック

### モバイルアプリ用の追加設定（React Native / Expo）:

Google認証はWebブラウザで行われるため、以下の追加設定が必要です:

#### app.json / app.config.js に設定を追加:
```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "plugins": [
      [
        "expo-auth-session"
      ]
    ]
  }
}
```

#### 必要なパッケージをインストール:
```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

#### Auth.tsx のGoogle認証を更新（WebBrowser使用）:
```typescript
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const handleGoogleAuth = async () => {
  try {
    const redirectUrl = makeRedirectUri({
      scheme: 'your-app-scheme',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success') {
        const url = result.url;
        // URLからトークンを抽出してSupabaseセッションを設定
        // （Supabaseが自動的に処理するため、通常は何もする必要なし）
      }
    }
  } catch (err) {
    console.error('[Auth] Google認証エラー:', err);
    Alert.alert('エラー', 'Google認証に失敗しました');
  }
};
```

## 3. RLSポリシーの確認

認証を有効化したので、RLSポリシーが `authenticated` ユーザー向けになっているか確認してください:

```sql
-- 現在のポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('projects', 'chat_messages', 'study_items')
ORDER BY tablename, policyname;

-- 必要に応じて anon を削除して authenticated のみに
-- 例: projects テーブル
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;

CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

## 4. テスト

### メール/パスワード認証:
1. アプリを起動
2. 「新規登録」をタップ
3. メールアドレスとパスワード（6文字以上）を入力
4. 登録後、そのままログインされる（Confirm email が OFF の場合）
5. ログアウトして再度ログインできることを確認

### Google認証:
1. 「Googleでログイン」ボタンをタップ
2. ブラウザが開いてGoogleログイン画面が表示される
3. Googleアカウントでログイン
4. アプリに戻ってログイン完了

## トラブルシューティング

### エラー: "Email not confirmed"
- Supabase Dashboard → Authentication → Settings で「Confirm email」をOFFにする

### Google認証が動作しない
- Google Cloud Console のリダイレクトURIが正確に設定されているか確認
- Supabase の Client ID / Secret が正しいか確認
- モバイルアプリの場合、expo-web-browser と expo-auth-session がインストールされているか確認

### RLSエラー: "new row violates row-level security policy"
- 各テーブルのRLSポリシーに `TO authenticated` が含まれているか確認
- `anon` ロールを削除して `authenticated` のみにする

## セキュリティのベストプラクティス

1. **本番環境では必ずメール確認を有効化**
2. **パスワードポリシーを強化**（Supabase Dashboard → Authentication → Settings）
3. **RLSポリシーで `anon` ロールを削除**（認証必須にする）
4. **レート制限を設定**（Supabase Dashboard → Authentication → Rate Limits）
5. **セッションの有効期限を適切に設定**
