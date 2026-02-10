import Link from "next/link";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

    // Build full breadcrumb list with Beranda as root
    const fullItems: BreadcrumbItem[] = [
        { label: "Beranda", href: "/" },
        ...items,
    ];

    // JSON-LD BreadcrumbList schema
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": fullItems.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            ...(item.href
                ? { "item": `${siteUrl}${item.href}` }
                : {}),
        })),
    };

    return (
        <>
            {/* JSON-LD Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Visual Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
                <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                    {fullItems.map((item, index) => {
                        const isLast = index === fullItems.length - 1;

                        return (
                            <li key={index} className="flex items-center gap-1.5">
                                {index > 0 && (
                                    <svg
                                        className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                )}
                                {isLast ? (
                                    <span className="text-[#102440] font-medium truncate max-w-[200px]">
                                        {item.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href || "/"}
                                        className="hover:text-[#e7c277] transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </>
    );
}
