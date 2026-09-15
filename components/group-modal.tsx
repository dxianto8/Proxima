"use client";

import { useState } from "react";
import type { Group } from "@/lib/types";
import { Modal } from "./ui/overlay";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";

/**
 * Create or rename a sidebar group. Remount it (via `key`) when switching
 * between groups — the field seeds from props on mount.
 */
export function GroupModal({
  open,
  group,
  onClose,
  onSubmit,
}: {
  open: boolean;
  group?: Group | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");

  function submit() {
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
    if (!group) setName("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? "Rename group" : "New group"}
      description={
        group ? undefined : "Clubs, a job, personal projects — whatever you want to track."
      }
      className="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            {group ? "Rename" : "Add group"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Name" htmlFor="group-name">
          <Input
            id="group-name"
            data-autofocus
            value={name}
            placeholder="Clubs"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
