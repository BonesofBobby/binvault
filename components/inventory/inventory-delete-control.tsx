"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeleteInventoryActionState } from "@/lib/types/inventory-lifecycle-actions";

type InventoryDeleteControlProps = {
  itemName: string;
  mediaCount: number;
  action: (
    state: DeleteInventoryActionState,
    formData: FormData,
  ) => Promise<DeleteInventoryActionState>;
};

const initialState: DeleteInventoryActionState = {
  message: null,
};

export function InventoryDeleteControl({
  itemName,
  mediaCount,
  action,
}: InventoryDeleteControlProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.message) {
      errorRef.current?.focus();
    }
  }, [state]);

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
          Delete Inventory
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the inventory record
              {mediaCount > 0
                ? ` and ${mediaCount} associated media ${
                    mediaCount === 1 ? "file" : "files"
                  }`
                : ""}
              . This action cannot be undone.
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
                {isPending ? "Deleting…" : `Yes, delete ${itemName}`}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
