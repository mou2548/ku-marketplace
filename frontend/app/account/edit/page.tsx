import { PageHeader } from "@/components/page-header";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { derivedFirstName } from "@/lib/auth-rules";

// TODO: replace with the real signed-in user's profile from the API
const PROFILE = {
  email: "mike.r@ku.th",
  lastNameEn: "Rojanasakul",
  firstNameTh: "ไมค์",
  lastNameTh: "โรจนสกุล",
  phone: "",
};

export default function AccountEditPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader
          title="แก้ไขโปรไฟล์"
          subtitle={`บัญชีนี้ผูกกับ ${PROFILE.email}`}
        />

        <ProfileEditForm
          lockedFirstName={derivedFirstName(PROFILE.email)}
          initial={{
            lastNameEn: PROFILE.lastNameEn,
            firstNameTh: PROFILE.firstNameTh,
            lastNameTh: PROFILE.lastNameTh,
            phone: PROFILE.phone,
          }}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
