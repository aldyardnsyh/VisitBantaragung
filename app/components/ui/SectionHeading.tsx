interface SectionHeadingProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    align?: "left" | "center";
    tone?: "light" | "dark";
    className?: string;
}

export default function SectionHeading({
    eyebrow,
    title,
    subtitle,
    align = "center",
    tone = "light",
    className = "",
}: SectionHeadingProps) {
    const alignment =
        align === "center" ? "text-center" : "text-left";

    return (
        <div className={`mb-10 ${alignment} ${className}`}>
            {eyebrow && (
                <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
                    tone === "dark" ? "text-gold-400" : "text-clay-500"
                }`}>
                    {eyebrow}
                </p>
            )}
            <h2 className={`font-display font-bold text-3xl md:text-4xl ${
                tone === "dark" ? "text-white" : "text-forest-800"
            }`}>
                {title}
            </h2>
            {subtitle && (
                <p className={`max-w-2xl mt-3 ${align === "center" ? "mx-auto" : ""} ${
                    tone === "dark" ? "text-white/80" : "text-slate-600"
                }`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}