import Link from "next/link";
import BackgroundPattern from "@/app/components/ui/BackgroundPattern";
import type { BreadcrumbItem } from "@/app/components/ui/Breadcrumb";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    breadcrumb?: BreadcrumbItem[];
    start?: React.ReactNode;
    heroClass?: string;
    children?: React.ReactNode;
}

export default function PageHeader({
    title,
    subtitle,
    eyebrow,
    breadcrumb,
    start,
    heroClass,
    children,
}: PageHeaderProps) {
    return (
        <header
            className={`relative overflow-hidden bg-gradient-to-b from-forest-950 to-forest-800 text-white ${
                heroClass ?? ""
            }`}
        >
            <BackgroundPattern
                variant="mountains"
                opacity={0.05}
                className="text-white animate-float"
            />
            <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 animate-fade-up">
                {breadcrumb && breadcrumb.length > 0 && (
                    <nav aria-label="Breadcrumb" className="mb-6">
                        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/70">
                            <li>
                                <Link href="/" className="hover:text-white transition-colors">
                                    Beranda
                                </Link>
                            </li>
                            {breadcrumb.map((item, index) => (
                                <li key={index} className="flex items-center gap-1.5">
                                    <span aria-hidden>›</span>
                                    {index === breadcrumb.length - 1 ? (
                                        <span className="font-medium text-white truncate max-w-[220px]">
                                            {item.label}
                                        </span>
                                    ) : (
                                        <Link
                                            href={item.href || "/"}
                                            className="hover:text-white transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}

                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="space-y-4">
                        {eyebrow && (
                            <span className="inline-block rounded-full bg-white/10 border border-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
                                {eyebrow}
                            </span>
                        )}
                        <h1 className="font-display font-bold text-white text-4xl md:text-5xl leading-tight max-w-3xl">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-white/85 max-w-2xl">{subtitle}</p>
                        )}
                        {children}
                    </div>
                    {start && <div className="shrink-0">{start}</div>}
                </div>
            </div>
        </header>
    );
}