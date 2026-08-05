import Link from "next/link";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    variant?: "light" | "dark";
}

export default function Breadcrumb({ items, variant = "light" }: BreadcrumbProps) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://visitbantaragung.com";

    const fullItems: BreadcrumbItem[] = [
        { label: "Beranda", href: "/" },
        ...items,
    ];

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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <nav aria-label="Breadcrumb" className="mb-6">
                <ol className={`flex flex-wrap items-center gap-1.5 text-sm ${
                    variant === "dark" ? "text-white/70" : "text-slate-500"
                }`}>
                    {fullItems.map((item, index) => {
                        const isLast = index === fullItems.length - 1;

                        return (
                            <li key={index} className="flex items-center gap-1.5">
                                {index > 0 && <span aria-hidden>›</span>}
                                {isLast ? (
                                    <span className="font-medium truncate max-w-[200px]">
                                        {item.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href || "/"}
                                        className={`transition-colors duration-200 ${
                                            variant === "dark"
                                                ? "text-white/80 hover:text-white"
                                                : "text-forest-600 hover:text-clay-500 hover:font-semibold"
                                        }`}
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
