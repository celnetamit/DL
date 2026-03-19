import { Metadata } from "next";
import ProductDetailClient from "@/components/ProductDetailClient";
import { apiFetch } from "@/lib/api";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    // We can't use process.env here if it's not exposed to the server correctly,
    // but apiFetch handles it or we can hardcode the internal URL for server side.
    const res = await apiFetch<any>(`/api/v1/products/${id}/contents?limit=1`);
    if (res && res.product) {
      return {
        title: `${res.product.name} | Digital Library`,
        description: res.product.description || `Explore ${res.product.name} and related learning materials in our digital library.`,
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    title: "Product Details | Digital Library",
    description: "View product details and available materials.",
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}
