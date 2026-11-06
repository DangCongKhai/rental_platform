import { Suspense } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { ProfileForm } from "@/components/account/profile-form";
import { getMyProfile } from "@/server/profile";

export default function ProfilePage() {
  return (
    <section className="max-w-[780px]">
      <h1 className="mb-5 text-[28px] leading-9 font-bold tracking-[-0.56px]">
        Hồ sơ cá nhân
      </h1>
      <Suspense
        fallback={
          <LoadingScreen
            message="Đang tải hồ sơ..."
            className="min-h-80 w-full"
          />
        }
      >
        <ProfileContent />
      </Suspense>
    </section>
  );
}
async function ProfileContent() {
  return <ProfileForm profile={await getMyProfile()} />;
}
