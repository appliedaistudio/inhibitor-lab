import { Metadata } from "next";
import { getNeighborhoodBySlug, NEIGHBORHOODS } from "@/lib/neighborhoods";
import NeighborhoodProfile from "@/components/NeighborhoodProfile";
import Providers from "@/components/Providers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return NEIGHBORHOODS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hood = getNeighborhoodBySlug(slug);
  const name = hood?.name ?? "Unknown";
  return {
    title: `${name} Safety Profile | PHLPulse`,
    description: `Real-time safety data for ${name}, Philadelphia. Crime trends, peak hours, and incident history powered by AI scanner analysis.`,
    openGraph: {
      title: `${name} — PHLPulse Safety Profile`,
      description: `Live safety analytics for ${name}, Philadelphia.`,
    },
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Providers>
      <NeighborhoodProfile slug={slug} />
    </Providers>
  );
}
