// Google Analytics 4: hanya aktif bila NEXT_PUBLIC_GA_ID diisi di environment.
// Tanpa ID, komponen ini tidak merender apa pun dan tidak ada request keluar.
import Script from "next/script";

export default function GoogleAnalytics() {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (!id) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
                strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${id}');`}
            </Script>
        </>
    );
}
