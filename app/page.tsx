
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();


  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-around py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div className="flex flex-col items-center gap-4 text-base font-medium sm:flex-row">

          <pre>{user ? `Signed in as ${user.email}` : 'Not signed in'}</pre>
          <Link className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-39.5" href={user ? "/dashboard" : "/auth/login"}>
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Dashboard
          </Link>
          </div>
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Welcome to the ADA Hackathon - your Next.js app with Supabase Auth!
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">To get started, edit the page.tsx file or better yet... build it with <strong className="font-medium text-zinc-950 dark:text-zinc-50">AI!</strong></p>
        </div>
      </main>
    </div>
  );
}
