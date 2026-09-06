import { JoinModal } from "@/components/join/join-modal";
import { JoinPageContent } from "@/components/join/join-page-content";

export const instant = false;

export default async function InterceptedJoinPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ scope?: string; target?: string }>;
}) {
  const query = await searchParams;

  return (
    <JoinModal
      key={`${query.target ?? "new-listing"}-${query.scope ?? "all_time"}`}
    >
      <JoinPageContent
        presentation="modal"
        searchParams={Promise.resolve(query)}
      />
    </JoinModal>
  );
}
