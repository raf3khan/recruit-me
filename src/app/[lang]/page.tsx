import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth/current";

async function Route({ params }: { params: Promise<{ lang: string }> }): Promise<null> {
  const { lang } = await params;
  const user = await currentUser();
  if (!user) redirect(`/${lang}/signup`);
  redirect(`/${lang}/${user.onboardedAt ? "home" : "onboard"}`);
}

/** Sends people to the right place: sign-up, onboarding, or the assistant. */
export default function Start(props: PageProps<"/[lang]">) {
  return (
    <Suspense fallback={null}>
      <Route params={props.params} />
    </Suspense>
  );
}
