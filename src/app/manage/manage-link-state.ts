export const GENERIC_MANAGE_LINK_MESSAGE =
  "If that email can manage a listing, a secure link is on its way.";

export type ManageLinkState = Readonly<{
  fieldError?: string;
  message?: string;
}>;
