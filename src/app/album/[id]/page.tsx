import { AlbumClient } from "@/components/AlbumClient";

type Props = { params: Promise<{ id: string }> };

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  return <AlbumClient albumId={id} />;
}
