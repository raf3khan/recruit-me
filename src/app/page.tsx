import { TailorFlow } from "./tailor-flow";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold text-accent">وظيفة</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">سيرتك وخطابك، مفصّلين على كل وظيفة</h1>
        <p className="mt-3 max-w-2xl text-muted">
          الصق سيرتك ووصف الوظيفة، ونجهّز لك سيرة ذاتية وخطاب تقديم بالإنجليزي يناسبون الوظيفة، من معلوماتك أنت بس.
          ما نرسل شي بدالك، أنت تراجع وتقرر.
        </p>
      </header>
      <TailorFlow />
    </main>
  );
}
