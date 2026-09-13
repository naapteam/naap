import { getRememberedPhone } from "@/lib/auth/session";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const phone = await getRememberedPhone();
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#F2F4F5] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <LanguageSwitcher />
        </div>
        <LoginForm initialPhone={phone} next={next ?? "/"} />
      </div>
    </main>
  );
}
