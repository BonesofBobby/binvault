import type { ContainerFieldErrors } from "@/lib/services/container-service";

export type ContainerActionState = {
  message: string | null;
  fieldErrors: ContainerFieldErrors;
};

export type DeleteContainerActionState = {
  message: string | null;
};
