import { JoinModal } from "@/components/join/join-modal";
import { JoinPageContent } from "@/components/join/join-page-content";

export const instant = false;

export default async function InterceptedJoinPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ target?: string }>;
}) {
  const query = await searchParams;

  return (
    <JoinModal key={query.target ?? "new-listing"}>
      <JoinPageContent
        presentation="modal"
        searchParams={Promise.resolve(query)}
      />
    </JoinModal>
  );
}
