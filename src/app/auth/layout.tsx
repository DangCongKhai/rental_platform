import { SlimFooter } from "@/components/layout/site-footer";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:px-6">
        {children}
      </main>
      <SlimFooter />
    </div>
  );
}
