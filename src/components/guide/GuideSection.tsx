"use client";

interface GuideSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export default function GuideSection({ id, title, children }: GuideSectionProps) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-xl font-bold text-gray-900 mb-4 scroll-mt-20">{title}</h2>
      <hr className="border-gray-200 mb-6" />
      <div className="space-y-4">{children}</div>
    </section>
  );
}
