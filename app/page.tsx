import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-[#4A5057]">Naap — build in progress.</p>
      {session && (
        <div className="flex flex-col items-center gap-2 text-sm text-[#14171A]">
          <p>
            Signed in as {session.name} ({session.role})
          </p>
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
