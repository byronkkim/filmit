import { UserTypeSelect } from '@/components/auth/UserTypeSelect';

export const metadata = {
  title: '회원가입 — filmit',
  description: '사용자 유형을 선택하세요',
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* 브랜딩 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            film<span className="text-primary">it</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            영상 제작 후원 플랫폼
          </p>
        </div>

        {/* 유형 선택 카드 */}
        <div className="rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-border">
          <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
            어떤 유형으로 가입하시겠어요?
          </h2>
          <p className="mb-8 text-center text-sm text-muted">
            가입 후에도 변경할 수 있어요
          </p>
          <UserTypeSelect />
        </div>
      </div>
    </main>
  );
}
