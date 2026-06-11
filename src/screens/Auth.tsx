import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function Auth(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 新規登録
        console.log('[Auth] 新規登録を試行中...', email.trim());
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        console.log('[Auth] signUp response:', { data, error });

        if (error) {
          console.error('[Auth] signUp error:', error);
          let errorMessage = error.message;

          if (errorMessage.includes('already registered')) {
            errorMessage = 'このメールアドレスは既に登録されています';
          } else if (errorMessage.includes('invalid email')) {
            errorMessage = 'メールアドレスの形式が正しくありません';
          }

          Alert.alert('登録エラー', errorMessage);
        } else if (data.user) {
          console.log('[Auth] 新規登録成功:', data.user.id);

          // メール確認が必要かどうかをチェック
          if (data.user.identities && data.user.identities.length > 0) {
            // メール確認不要（すぐにログイン）
            Alert.alert(
              '登録完了',
              'アカウントが作成されました！',
              [{ text: 'OK' }]
            );
          } else {
            // メール確認が必要
            Alert.alert(
              '登録完了',
              'アカウントが作成されました。確認メールを送信しましたのでご確認ください。',
              [{ text: 'OK' }]
            );
            setIsSignUp(false);
          }
        }
      } else {
        // ログイン
        console.log('[Auth] ログインを試行中...', email.trim());
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        console.log('[Auth] signIn response:', { data, error });

        if (error) {
          console.error('[Auth] signIn error:', error);
          let errorMessage = error.message;

          if (errorMessage.includes('Invalid login credentials')) {
            errorMessage = 'メールアドレスまたはパスワードが正しくありません';
          } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'メールアドレスの確認が完了していません。確認メールをご確認ください。';
          }

          Alert.alert('ログインエラー', errorMessage);
        } else if (data.user) {
          console.log('[Auth] ログイン成功:', data.user.id);
        }
      }
    } catch (err) {
      console.error('[Auth] 例外:', err);
      Alert.alert('エラー', '予期しないエラーが発生しました: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);

    try {
      // Expoのカスタムスキームを使用
      const redirectUrl = makeRedirectUri({
        scheme: 'expo-app',
      });

      console.log('[Auth] リダイレクトURL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Googleアカウント選択画面を強制表示
          },
        },
      });

      console.log('[Auth] OAuth レスポンス:', { data, error });

      if (error) {
        console.error('[Auth] Google認証エラー:', error);
        Alert.alert(
          'Google認証エラー',
          `エラー: ${error.message}\n\nSupabase DashboardでGoogleプロバイダが有効化されているか確認してください。`
        );
        setLoading(false);
        return;
      }

      if (data?.url) {
        console.log('[Auth] ブラウザを開いています...');

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('[Auth] ブラウザの結果:', result);

        if (result.type === 'success' && result.url) {
          // URLからハッシュフラグメントを解析
          const url = result.url;
          let access_token: string | null = null;
          let refresh_token: string | null = null;

          // ハッシュフラグメント（#access_token=...）を確認
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
          }

          // クエリパラメータ（?access_token=...）を確認
          if (!access_token && url.includes('?')) {
            const queryParams = new URLSearchParams(url.split('?')[1]);
            access_token = queryParams.get('access_token');
            refresh_token = queryParams.get('refresh_token');
          }

          console.log('[Auth] トークン取得:', {
            hasAccessToken: !!access_token,
            hasRefreshToken: !!refresh_token,
          });

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error('[Auth] セッション設定エラー:', sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log('[Auth] Google認証成功！');
            }
          } else {
            console.error('[Auth] トークンが見つかりません。URL:', url);
            Alert.alert('エラー', 'Google認証に失敗しました。トークンが取得できませんでした。');
          }
        } else if (result.type === 'cancel') {
          console.log('[Auth] ユーザーがキャンセルしました');
        } else {
          console.log('[Auth] 予期しない結果:', result);
        }
      } else {
        Alert.alert('エラー', 'Google認証URLが取得できませんでした');
      }
    } catch (err) {
      console.error('[Auth] Google認証例外:', err);
      Alert.alert('エラー', '予期しないエラーが発生しました: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ロゴ・ヘッダーセクション */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="book-outline" size={48} color="#FF9900" />
            </View>
            <Text style={styles.title}>学習アプリ</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'アカウントを作成' : 'アカウントにログイン'}
            </Text>
          </View>

          {/* フォームセクション */}
          <View style={styles.formContainer}>
            {/* メールアドレス */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>メールアドレス</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
            </View>

            {/* パスワード */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>パスワード</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="6文字以上"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* ログイン/新規登録ボタン */}
            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? '新規登録' : 'ログイン'}
                </Text>
              )}
            </Pressable>

            {/* 切り替えリンク */}
            <Pressable
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp ? 'すでにアカウントをお持ちですか？ ' : 'アカウントをお持ちでないですか？ '}
                <Text style={styles.switchButtonTextBold}>
                  {isSignUp ? 'ログイン' : '新規登録'}
                </Text>
              </Text>
            </Pressable>

            {/* 区切り線 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Googleログインボタン */}
            <Pressable
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleAuth}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#374151" />
              <Text style={styles.googleButtonText}>Googleでログイン</Text>
            </Pressable>
          </View>

          {/* フッター */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 8,
  },

  primaryButton: {
    backgroundColor: '#FF9900',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#FF9900',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  switchButtonTextBold: {
    fontWeight: '700',
    color: '#FF9900',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  footer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
