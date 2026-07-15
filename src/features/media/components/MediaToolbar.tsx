"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Icon,
  Input,
} from "@/components/ui";

import {
  useMediaCenter,
  type MediaSearchScope,
  type MediaTypeFilter,
} from "../context";

const TYPE_LABELS: Record<MediaTypeFilter, string> = {
  all: "Todos os tipos",
  Image: "Imagens",
  Document: "Documentos",
};

const SCOPE_LABELS: Record<MediaSearchScope, string> = {
  folder: "Pasta atual",
  all: "Todo o diretório",
};

function Check({ active }: { active: boolean }) {
  return active ? <Icon name="check" size={16} className="text-primary-7" /> : <span />;
}

export function MediaToolbar({ onCreateFolder }: { onCreateFolder: () => void }) {
  const {
    mode,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    searchScope,
    setSearchScope,
  } = useMediaCenter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        aria-label="Buscar arquivos"
        placeholder="Buscar arquivos..."
        value={search}
        onValueChange={setSearch}
        isClearable
        onClear={() => setSearch("")}
        startContent={<Icon name="search" size={18} className="text-neutral-gray-8" />}
        className="max-w-xs flex-1"
      />

      <Dropdown closeOnSelect={false}>
        <DropdownTrigger>
          <Button variant="bordered" icon="filter" className="text-neutral-gray-9">
            Filtros
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Filtros"
          onAction={(key) => {
            const value = String(key);
            if (value.startsWith("type:")) {
              setTypeFilter(value.slice(5) as MediaTypeFilter);
            } else if (value.startsWith("scope:")) {
              setSearchScope(value.slice(6) as MediaSearchScope);
            }
          }}
        >
          <DropdownSection title="Tipo" showDivider>
            {/* No modo select quem chama só aceita imagem. */}
            {(mode === "select"
              ? (["Image"] as MediaTypeFilter[])
              : (["all", "Image", "Document"] as MediaTypeFilter[])
            ).map((key) => (
              <DropdownItem key={`type:${key}`} endContent={<Check active={typeFilter === key} />}>
                {TYPE_LABELS[key]}
              </DropdownItem>
            ))}
          </DropdownSection>

          <DropdownSection title="Buscar em">
            {(["folder", "all"] as MediaSearchScope[]).map((key) => (
              <DropdownItem
                key={`scope:${key}`}
                endContent={<Check active={searchScope === key} />}
              >
                {SCOPE_LABELS[key]}
              </DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      <Button variant="teal" icon="folder_plus" onPress={onCreateFolder} className="ml-auto">
        Criar pasta
      </Button>
    </div>
  );
}
