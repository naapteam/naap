import { getRememberedPhone } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const phone = await getRememberedPhone();
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center bg-[#F2F4F5] p-4">
      <LoginForm initialPhone={phone} next={next ?? "/"} />
    </main>
  );
}
