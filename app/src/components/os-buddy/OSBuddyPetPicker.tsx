"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { OS_BUDDY_PETS } from "@/lib/os-buddy/os-buddy-pets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyPetId } from "@/types/os-buddy";

type OSBuddyPetPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: AppLocale;
  selectedPetId: OSBuddyPetId;
  onChoose: (petId: OSBuddyPetId) => void;
};

const PET_IDS: OSBuddyPetId[] = ["xiaoba", "doge"];

export function OSBuddyPetPicker({
  open,
  onOpenChange,
  locale,
  selectedPetId,
  onChoose,
}: OSBuddyPetPickerProps) {
  const zh = locale === "zh-TW";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{zh ? "更換 OS Buddy" : "Change OS Buddy"}</DialogTitle>
          <DialogDescription>
            {zh
              ? "選擇你的像素小夥伴。"
              : "Choose your animated pixel buddy."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PET_IDS.map((petId) => {
            const pet = OS_BUDDY_PETS[petId];
            const selected = petId === selectedPetId;

            return (
              <div
                key={pet.id}
                className={cn(
                  "rounded-xl border p-4",
                  selected ? "border-primary/60 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`${pet.assetBasePath}/idle.gif`}
                    alt={pet.displayName}
                    className="h-auto w-[54px] sm:w-[66px] rounded-md"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{pet.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {zh ? pet.description["zh-TW"] : pet.description.en}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    className="w-full"
                    variant={selected ? "secondary" : "default"}
                    onClick={() => onChoose(pet.id)}
                    disabled={selected}
                  >
                    {selected ? (zh ? "已選擇" : "Selected") : zh ? "選擇" : "Choose"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
