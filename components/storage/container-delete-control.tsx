"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";
import { Trash2 } from "lucide-react";

import {
  type DeleteContainerActionState,
} from "@/lib/types/container-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContainerDeleteControlProps = {
  containerName: string;
  inventoryCount: number;
  action: (
    state: DeleteContainerActionState,
    formData: FormData,
  ) => Promise<DeleteContainerActionState>;
};

const initialDeleteContainerActionState: DeleteContainerActionState = {
  message: null,
};

export function ContainerDeleteControl({
  containerName,
  inventoryCount,
  action,
}: ContainerDeleteControlProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialDeleteContainerActionState,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.message) {
      errorRef.current?.focus();
    }
  }, [state]);

  if (inventoryCount > 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          This container cannot be deleted while it contains{" "}
          <strong>
            {inventoryCount} inventory{" "}
            {inventoryCount === 1 ? "record" : "records"}
          </strong>
          . Move or otherwise resolve those records before deleting
          the container.
        </p>
        <Button type="button" variant="destructive" disabled>
          <Trash2 aria-hidden="true" />
          Delete Container
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.message ? (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="text-sm text-red-300 outline-none"
        >
          {state.message}
        </p>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger
          className={cn(
            buttonVariants({
              variant: "destructive",
            }),
          )}
        >
          <Trash2 aria-hidden="true" />
          Delete Container
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {containerName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This empty container will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <form action={formAction}>
              <AlertDialogAction
                type="submit"
                variant="destructive"
                disabled={isPending}
                className="w-full"
              >
                {isPending
                  ? "Deleting…"
                  : "Yes, delete container"}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
