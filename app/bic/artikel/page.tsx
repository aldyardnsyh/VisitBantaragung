import Link from "next/link";
import { getAllArticles, type Article } from "@/lib/content";
import { assetUrl } from "@/lib/asset";

export default function ArtikelList() {
    const items = getAllArticles();

    return (
        <main style={{ padding: 32 }}>
            <h1>Pusat Pengetahuan Bantaragung</h1>

            {items.map((item: Article) => (
                <div key={item.slug}>
                    <Link href={`/bic/artikel/${item.slug}`}>
                        <img src={assetUrl(item.cover)} alt={item.title} width={400} />
                        <h3>{item.title}</h3>
                        <small>{item.date}</small>
                        <p>{item.excerpt}</p>
                    </Link>
                </div>
            ))}
        </main>
    );
}
