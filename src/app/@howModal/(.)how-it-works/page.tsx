import { HowItWorksContent } from "@/components/public/how-it-works-content";
import { HowItWorksModal } from "@/components/public/how-it-works-modal";

export default function InterceptedHowItWorksPage() {
  return (
    <HowItWorksModal>
      <HowItWorksContent
        headingId="how-it-works-dialog-title"
        presentation="modal"
      />
    </HowItWorksModal>
  );
}
