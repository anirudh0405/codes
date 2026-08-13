"use client";

import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bookmark } from "lucide-react";
import { useState } from "react";

function BookmarkToggle() {
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Toggle
              className="group size-8 p-0 hover:bg-indigo-50/10 hover:text-indigo-400 data-[state=on]:bg-indigo-500/20 data-[state=on]:text-indigo-400 border border-[var(--border)] rounded-md transition-colors cursor-pointer"
              aria-label="Bookmark this"
              pressed={bookmarked}
              onPressedChange={setBookmarked}
            >
              <Bookmark size={15} strokeWidth={2} aria-hidden="true" />
            </Toggle>
          </div>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-primary)]">
          <p>{bookmarked ? "Remove bookmark" : "Bookmark this"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { BookmarkToggle };
