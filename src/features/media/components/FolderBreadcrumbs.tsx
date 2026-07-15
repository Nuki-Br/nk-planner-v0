"use client";

// Breadcrumbs cru do HeroUI, não o wrapper de components/ui: aquele é href-only
// (BreadcrumbEntry { label, href? }) e a navegação de pasta dentro do modal
// precisa de onPress. Contorcer o wrapper para aceitar callback pioraria os dois.
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";

import { Button, Icon } from "@/components/ui";

import { useMediaCenter } from "../context";

export function FolderBreadcrumbs() {
  const { path, goToRoot, goToCrumb, goBack, canGoBack } = useMediaCenter();

  return (
    <div className="flex items-center gap-2">
      <Button
        isIconOnly
        size="sm"
        variant="bordered"
        radius="full"
        aria-label="Voltar"
        isDisabled={!canGoBack}
        onPress={goBack}
        className="h-8 min-w-8 border-neutral-gray-5 text-neutral-gray-9 disabled:opacity-40"
      >
        <Icon name="back" size={16} />
      </Button>

      <Breadcrumbs
        classNames={{ list: "flex-wrap" }}
        itemClasses={{
          item: "text-neutral-gray-9 data-[current=true]:text-primary-7 data-[current=true]:font-semibold",
          separator: "text-neutral-gray-7",
        }}
      >
        <BreadcrumbItem onPress={goToRoot} isCurrent={path.length === 0}>
          <span className="flex items-center gap-1">
            <Icon name="home" size={16} />
            Media Center
          </span>
        </BreadcrumbItem>
        {path.map((folder, index) => (
          <BreadcrumbItem
            key={folder.id}
            isCurrent={index === path.length - 1}
            onPress={() => goToCrumb(index)}
          >
            {folder.name}
          </BreadcrumbItem>
        ))}
      </Breadcrumbs>
    </div>
  );
}
