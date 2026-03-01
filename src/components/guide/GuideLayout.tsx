"use client";

import { useState, useEffect, useCallback } from "react";

interface Section {
  id: string;
  title: string;
  group?: string;
}

interface GuideLayoutProps {
  title: string;
  sections: Section[];
  children: React.ReactNode;
  isServer?: boolean;
  groupLabels?: { server: string; admin: string };
}

export default function GuideLayout({ title, sections, children, isServer = false, groupLabels }: GuideLayoutProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    const sectionIds = sections.map((s) => s.id);
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setTocOpen(false);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Group sections by their group
  const serverSections = sections.filter((s) => s.group !== "admin");
  const adminSections = sections.filter((s) => s.group === "admin");

  const renderTocItems = (items: Section[]) =>
    items.map((section) => (
      <button
        key={section.id}
        onClick={() => scrollToSection(section.id)}
        className={`block w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
          activeSection === section.id
            ? "text-blue-600 font-medium border-l-2 border-blue-600 bg-blue-50/50"
            : "text-gray-600 hover:text-gray-900 border-l-2 border-transparent hover:border-gray-300"
        }`}
      >
        {section.title}
      </button>
    ));

  const tocContent = (
    <nav className="space-y-1">
      {groupLabels && adminSections.length > 0 ? (
        <>
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {groupLabels.server}
          </p>
          {renderTocItems(serverSections)}
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {groupLabels.admin}
          </p>
          {renderTocItems(adminSections)}
        </>
      ) : (
        renderTocItems(sections)
      )}
    </nav>
  );

  return (
    <div className="min-h-full">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      <div className="flex gap-8">
        {/* Desktop TOC sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
            <p className="px-3 pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {groupLabels ? "" : ""}
            </p>
            {tocContent}
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0 max-w-3xl">
          {/* Mobile TOC */}
          <details
            className="md:hidden mb-8 rounded-lg border border-gray-200 bg-white shadow-sm"
            open={tocOpen}
            onToggle={(e) => setTocOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer select-none flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z" />
                </svg>
                Table of Contents
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${tocOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-1 border-t border-gray-100">{tocContent}</div>
          </details>

          {/* Guide content */}
          {children}
        </div>
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed right-4 z-40 h-10 w-10 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors ${
          isServer ? "bottom-24" : "bottom-6"
        }`}
        aria-label="Back to top"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
