"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Course, Group } from "@/lib/types";
import { openTaskCount } from "@/lib/selectors";
import { colorHex } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useTaskEditor } from "./task-editor";
import { CourseModal } from "./course-modal";
import { GroupModal } from "./group-modal";
import { ContextMenu, useContextMenu, type MenuItem } from "./ui/context-menu";
import { ConfirmDialog } from "./ui/overlay";
import { Dot } from "./ui/badge";
import {
  ArchiveIcon,
  BookIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "./icons";

/** Where a dragged course would land: above or below the row under the cursor. */
interface DropTarget {
  groupId: string;
  index: number;
}

export function SidebarGroups({ onNavigate }: { onNavigate?: () => void }) {
  const {
    data,
    addCourse,
    updateCourse,
    deleteCourse,
    addGroup,
    updateGroup,
    deleteGroup,
    moveGroup,
    moveCourse,
  } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const { openNew } = useTaskEditor();

  const courseMenu = useContextMenu<Course>();
  const groupMenu = useContextMenu<Group>();

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [addingTo, setAddingTo] = useState<Group | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<DropTarget | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const groups = [...data.groups].sort((a, b) => a.order - b.order);
  const coursesIn = (groupId: string) =>
    data.courses
      .filter((course) => course.groupId === groupId && !course.archived)
      .sort((a, b) => a.order - b.order);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function endDrag() {
    setDragging(null);
    setDropAt(null);
  }

  function commitDrop() {
    if (dragging && dropAt) moveCourse(dragging, dropAt.groupId, dropAt.index);
    endDrag();
  }

  function courseMenuItems(course: Course): MenuItem[] {
    const otherGroups = groups.filter((group) => group.id !== course.groupId);
    return [
      {
        label: "Open",
        icon: <ChevronRightIcon size={14} />,
        onSelect: () => {
          router.push(`/courses/${course.id}`);
          onNavigate?.();
        },
      },
      {
        label: "Add task",
        icon: <PlusIcon size={14} />,
        onSelect: () => openNew({ courseId: course.id }),
      },
      {
        label: "Edit…",
        icon: <PencilIcon size={14} />,
        separated: true,
        onSelect: () => setEditingCourse(course),
      },
      ...otherGroups.slice(0, 4).map((group) => ({
        label: `Move to ${group.name}`,
        icon: <ChevronRightIcon size={14} />,
        onSelect: () => moveCourse(course.id, group.id, coursesIn(group.id).length),
      })),
      {
        label: course.archived ? "Unarchive" : "Archive",
        icon: <ArchiveIcon size={14} />,
        onSelect: () => updateCourse(course.id, { archived: !course.archived }),
      },
      {
        label: "Delete…",
        icon: <TrashIcon size={14} />,
        danger: true,
        separated: true,
        onSelect: () => setDeletingCourse(course),
      },
    ];
  }

  function groupMenuItems(group: Group): MenuItem[] {
    const index = groups.findIndex((entry) => entry.id === group.id);
    return [
      {
        label: "Add to this group",
        icon: <PlusIcon size={14} />,
        onSelect: () => setAddingTo(group),
      },
      {
        label: "Rename…",
        icon: <PencilIcon size={14} />,
        separated: true,
        onSelect: () => setEditingGroup(group),
      },
      ...(index > 0
        ? [
            {
              label: "Move up",
              icon: <ChevronDownIcon size={14} className="rotate-180" />,
              onSelect: () => moveGroup(group.id, -1),
            },
          ]
        : []),
      ...(index < groups.length - 1
        ? [
            {
              label: "Move down",
              icon: <ChevronDownIcon size={14} />,
              onSelect: () => moveGroup(group.id, 1),
            },
          ]
        : []),
      ...(groups.length > 1
        ? [
            {
              label: "Delete group…",
              icon: <TrashIcon size={14} />,
              danger: true,
              separated: true,
              onSelect: () => setDeletingGroup(group),
            },
          ]
        : []),
    ];
  }

  const empty = data.courses.filter((c) => !c.archived).length === 0;

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col px-2.5">
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-subtle">
          Groups
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreatingGroup(true)}
            title="New group"
            aria-label="New group"
            className="text-subtle transition-colors hover:text-accent"
          >
            <PlusIcon size={13} />
          </button>
          <Link
            href="/courses"
            onClick={onNavigate}
            className="text-[11px] font-medium text-subtle transition-colors hover:text-accent"
          >
            Manage
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2" onDragEnd={endDrag}>
        {groups.map((group) => {
          const items = coursesIn(group.id);
          const isCollapsed = collapsed.has(group.id);

          return (
            <section key={group.id}>
              <div
                onContextMenu={(event) => groupMenu.open(event, group)}
                className={cn(
                  "group/head flex items-center gap-1 rounded-md px-1.5 py-1",
                  groupMenu.state?.target.id === group.id && "bg-surface-2",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleCollapsed(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.name}`}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                  <ChevronDownIcon
                    size={12}
                    className={cn(
                      "shrink-0 text-subtle transition-transform duration-150",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-subtle">
                    {group.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddingTo(group)}
                  title={`Add to ${group.name}`}
                  aria-label={`Add to ${group.name}`}
                  className={cn(
                    "shrink-0 rounded p-0.5 text-subtle opacity-0 transition-opacity",
                    "hover:text-accent focus-visible:opacity-100 group-hover/head:opacity-100",
                  )}
                >
                  <PlusIcon size={13} />
                </button>
              </div>

              {isCollapsed ? null : (
                <div
                  className="space-y-0.5 pt-0.5"
                  // An empty group still needs to accept a drop.
                  onDragOver={(event) => {
                    if (!dragging) return;
                    event.preventDefault();
                    if (items.length === 0) setDropAt({ groupId: group.id, index: 0 });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    commitDrop();
                  }}
                >
                  {items.length === 0 ? (
                    <p
                      className={cn(
                        "rounded-lg px-2.5 py-2 text-[12px] text-subtle/80",
                        dropAt?.groupId === group.id && "bg-accent-soft text-accent",
                      )}
                    >
                      {dropAt?.groupId === group.id ? "Drop here" : "Nothing here yet"}
                    </p>
                  ) : (
                    items.map((course, index) => {
                      const open = openTaskCount(data.tasks, course.id);
                      const active = pathname === `/courses/${course.id}`;
                      const showLine =
                        dropAt?.groupId === group.id && dropAt.index === index;
                      const showLineAfter =
                        dropAt?.groupId === group.id &&
                        dropAt.index === items.length &&
                        index === items.length - 1;

                      return (
                        <div key={course.id}>
                          <DropLine visible={Boolean(showLine)} />
                          <Link
                            href={`/courses/${course.id}`}
                            draggable
                            onClick={onNavigate}
                            onContextMenu={(event) => courseMenu.open(event, course)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", course.id);
                              setDragging(course.id);
                            }}
                            onDragOver={(event) => {
                              if (!dragging) return;
                              event.preventDefault();
                              const box = event.currentTarget.getBoundingClientRect();
                              const after = event.clientY > box.top + box.height / 2;
                              setDropAt({
                                groupId: group.id,
                                index: index + (after ? 1 : 0),
                              });
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              commitDrop();
                            }}
                            className={cn(
                              "flex cursor-grab items-center gap-2.5 rounded-lg px-2.5 py-[6px]",
                              "text-[13px] transition-colors duration-100 active:cursor-grabbing",
                              dragging === course.id && "opacity-40",
                              active || courseMenu.state?.target.id === course.id
                                ? "bg-surface-2 font-medium text-text"
                                : "text-muted hover:bg-surface-2 hover:text-text",
                            )}
                          >
                            <Dot color={colorHex(course.color)} />
                            <span className="flex-1 truncate">
                              {course.code || course.name}
                            </span>
                            {open > 0 ? (
                              <span className="tabular text-[11px] text-subtle">{open}</span>
                            ) : null}
                          </Link>
                          <DropLine visible={Boolean(showLineAfter)} />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          );
        })}

        {empty ? (
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-subtle hover:bg-surface-2 hover:text-text"
          >
            <BookIcon size={15} />
            Import from Canvas
          </Link>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ menus */}
      <ContextMenu
        label={courseMenu.state ? `Actions for ${courseMenu.state.target.name}` : undefined}
        position={courseMenu.state?.position ?? null}
        onClose={courseMenu.close}
        items={courseMenu.state ? courseMenuItems(courseMenu.state.target) : []}
      />
      <ContextMenu
        label={groupMenu.state ? `Actions for ${groupMenu.state.target.name}` : undefined}
        position={groupMenu.state?.position ?? null}
        onClose={groupMenu.close}
        items={groupMenu.state ? groupMenuItems(groupMenu.state.target) : []}
      />

      {/* ---------------------------------------------------------- dialogs */}
      <CourseModal
        key={editingCourse?.id ?? "edit-none"}
        open={Boolean(editingCourse)}
        course={editingCourse}
        groups={groups}
        onClose={() => setEditingCourse(null)}
        onSubmit={(values) => editingCourse && updateCourse(editingCourse.id, values)}
      />
      <CourseModal
        key={addingTo?.id ?? "add-none"}
        open={Boolean(addingTo)}
        groups={groups}
        defaultGroupId={addingTo?.id}
        onClose={() => setAddingTo(null)}
        onSubmit={(values) => addCourse({ ...values, groupId: addingTo?.id })}
      />
      <GroupModal
        open={creatingGroup}
        onClose={() => setCreatingGroup(false)}
        onSubmit={(name) => addGroup(name)}
      />
      <GroupModal
        key={editingGroup?.id ?? "rename-none"}
        open={Boolean(editingGroup)}
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSubmit={(name) => editingGroup && updateGroup(editingGroup.id, { name })}
      />

      <ConfirmDialog
        open={Boolean(deletingCourse)}
        onClose={() => setDeletingCourse(null)}
        onConfirm={() => deletingCourse && deleteCourse(deletingCourse.id)}
        title={`Delete ${deletingCourse?.name ?? "course"}?`}
        body="Its tasks stay, but they lose their tag. If it came from Canvas, syncing again will recreate it."
      />
      <ConfirmDialog
        open={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        onConfirm={() => deletingGroup && deleteGroup(deletingGroup.id)}
        title={`Delete the ${deletingGroup?.name ?? "group"} group?`}
        confirmLabel="Delete group"
        body={`Anything inside moves to ${groups[0]?.name ?? "the first group"} — nothing is lost.`}
      />
    </div>
  );
}

/** The insertion indicator shown between rows while dragging. */
function DropLine({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "mx-2 h-[2px] rounded-full transition-all duration-100",
        visible ? "my-0.5 bg-accent opacity-100" : "my-0 opacity-0",
      )}
    />
  );
}
