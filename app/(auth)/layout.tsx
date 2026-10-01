export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <div className="flex flex-1 flex-col justify-center py-10">{children}</div>
    </main>
  );
}
