import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: '로그인 — filmit',
  description: 'filmit에 로그인하세요',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* 브랜딩 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            film<span className="text-primary">it</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            영상 제작 후원 플랫폼
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-border">
          <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
            로그인
          </h2>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          로그인 시 filmit의 이용약관 및 개인정보처리방침에 동의합니다.
        </p>
      </div>
    </main>
  );
}
