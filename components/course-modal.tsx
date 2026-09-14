"use client";

import { useState } from "react";
import type { Course } from "@/lib/types";
import { Modal } from "./ui/overlay";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import { ColorPicker } from "./color-picker";

export interface CourseValues {
  name: string;
  code: string;
  color: string;
  archived?: boolean;
}

/**
 * Create/edit dialog for a course. Shared by the Courses page and the
 * sidebar's right-click menu, so remount it (via `key`) when switching
 * between courses — the fields seed from props on mount.
 */
export function CourseModal({
  open,
  course,
  onClose,
  onSubmit,
}: {
  open: boolean;
  course?: Pick<Course, "name" | "code" | "color" | "archived"> | null;
  onClose: () => void;
  onSubmit: (values: CourseValues) => void;
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [color, setColor] = useState(course?.color ?? "indigo");
  const [archived, setArchived] = useState(course?.archived ?? false);

  function submit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim(), color, archived });
    onClose();
    if (!course) {
      setName("");
      setCode("");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? "Edit course" : "New course"}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            {course ? "Save" : "Add course"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Name" htmlFor="course-name">
          <Input
            id="course-name"
            data-autofocus
            value={name}
            placeholder="Introduction to Astrophysics"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Short code" htmlFor="course-code" hint="Shown on task rows and in the sidebar.">
          <Input
            id="course-code"
            value={code}
            placeholder="ASTR 101"
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="Colour">
          <ColorPicker value={color} onChange={setColor} className="pt-1" />
        </Field>
        {course ? (
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => setArchived(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Archive this course (hides it from the sidebar)
          </label>
        ) : null}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
