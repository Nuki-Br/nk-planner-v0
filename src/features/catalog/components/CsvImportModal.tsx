"use client";

import React from "react";
import Papa from "papaparse";

import { Button, Icon, Modal } from "@/components/ui";
import { useImportMateriais } from "@/lib/hooks/useMateriais";
import { cn } from "@/lib/utils";

import { convertRows, CSV_FIELD_OPTS, guessMapping, type CsvField, type CsvMapping } from "../csv";

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedFile {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

const STEP_LABELS = ["Upload", "Mapeamento", "Pré-visualização", "Importado"];
const MAX_SIZE_MB = 5;

function CsvSteps({ step }: { step: number }) {
  return (
    <div className="mb-5 flex items-center border-b border-neutral-gray-4 pb-4">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={cn(
                  "mx-1.5 h-px max-w-9 flex-1",
                  done ? "bg-primary-7" : "bg-neutral-gray-4"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-primary-7 text-white"
                    : active
                      ? "bg-neutral-gray-11 text-white"
                      : "bg-neutral-gray-4 text-neutral-gray-6"
                )}
              >
                {done ? <Icon name="check" size={11} className="text-white" /> : n}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px]",
                  active
                    ? "font-bold text-neutral-gray-11"
                    : done
                      ? "text-primary-7"
                      : "text-neutral-gray-6"
                )}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Wizard Importar CSV — parsing real com PapaParse (decisão §12):
// Upload → Mapeamento (auto-sugerido por sinônimos) → Pré-visualização
// (com linhas descartadas e motivo) → gravação em lote no store.
export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const importMateriais = useImportMateriais();

  const [step, setStep] = React.useState(1);
  const [file, setFile] = React.useState<ParsedFile | null>(null);
  const [mapping, setMapping] = React.useState<CsvMapping>({});
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [importedCount, setImportedCount] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setFile(null);
    setMapping({});
    setFileError(null);
    setImportedCount(0);
    setDragging(false);
  }, [open]);

  const handleFile = (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("Formato inválido — envie um arquivo .csv.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`Arquivo acima de ${MAX_SIZE_MB} MB.`);
      return;
    }
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((h) => h.trim() !== "");
        if (headers.length === 0 || res.data.length === 0) {
          setFileError("Não foi possível ler o arquivo — vazio ou sem cabeçalho.");
          return;
        }
        setFile({ name: f.name, headers, rows: res.data });
        setMapping(guessMapping(headers));
        setStep(2);
      },
      error: () => setFileError("Não foi possível ler o arquivo."),
    });
  };

  const nomeMapped = Object.values(mapping).includes("nome");
  const conversion = React.useMemo(
    () => (file && step >= 3 ? convertRows(file.rows, mapping) : null),
    [file, mapping, step]
  );

  const handleImport = () => {
    if (!conversion || conversion.materiais.length === 0) return;
    importMateriais.mutate(conversion.materiais, {
      onSuccess: (created) => {
        setImportedCount(created.length);
        setStep(4);
      },
    });
  };

  const mappedColumns = file?.headers.filter((h) => (mapping[h] ?? "") !== "") ?? [];
  const fieldLabel = (f: CsvField) => CSV_FIELD_OPTS.find((o) => o.value === f)?.label ?? f;

  return (
    <Modal open={open} onClose={onClose} title="Importar materiais via CSV" width={700}>
      <CsvSteps step={step} />

      {step === 1 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed px-6 py-11 text-center transition-colors",
              dragging
                ? "border-primary-7 bg-primary-1"
                : "border-neutral-gray-4 hover:border-primary-7 hover:bg-primary-1"
            )}
          >
            <Icon name="upload" size={40} className="mx-auto text-neutral-gray-5" />
            <p className="mb-1.5 mt-3.5 text-[15px] font-bold text-neutral-gray-9">
              Arraste seu arquivo CSV aqui
            </p>
            <p className="text-[13px] text-neutral-gray-6">
              ou <span className="text-primary-7 underline">clique para selecionar</span>
            </p>
            <p className="mt-2.5 text-[11px] text-neutral-gray-5">
              Formato .csv · máx {MAX_SIZE_MB} MB
            </p>
          </div>
          {fileError && (
            <p className="mt-3 text-[13px] font-semibold text-functional-error">{fileError}</p>
          )}
          <div className="mt-4 rounded-lg bg-neutral-gray-2 px-4 py-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7">
              Formato esperado
            </p>
            <code className="font-mono text-xs text-neutral-gray-9">
              codigo, nome, fabricante, categoria, unidade, custo_mat, custo_mo
            </code>
            <p className="mt-1.5 text-[11px] text-neutral-gray-6">
              Custo pode ser vazio — preenchido depois pela construtora.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="bordered" onPress={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === 2 && file && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-gray-2 px-3.5 py-2.5">
            <Icon name="check" size={14} className="text-functional-success" />
            <span className="text-[13px] font-semibold text-neutral-gray-9">{file.name}</span>
            <span className="text-xs text-neutral-gray-6">
              — {file.headers.length} colunas · {file.rows.length} linha
              {file.rows.length !== 1 ? "s" : ""} detectada{file.rows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-3 text-[13px] text-neutral-gray-8">
            Mapeie cada coluna do arquivo para um campo Nuki:
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-gray-4">
                {["Coluna no CSV", "Amostra de valor", "Campo Nuki"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {file.headers.map((col) => (
                <tr key={col} className="border-b border-neutral-gray-4">
                  <td className="px-3 py-2.5">
                    <code className="font-mono text-xs font-bold text-neutral-gray-9">{col}</code>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 font-mono text-xs text-neutral-gray-6">
                    {file.rows[0]?.[col] ?? ""}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={mapping[col] ?? ""}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [col]: e.target.value as CsvField }))
                      }
                      className="h-[34px] min-w-[210px] cursor-pointer rounded-lg border border-neutral-gray-5 bg-white px-2 text-xs text-neutral-gray-9 outline-none"
                    >
                      {CSV_FIELD_OPTS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!nomeMapped && (
            <p className="mt-3 text-xs font-semibold text-functional-error">
              Mapeie uma coluna para &quot;Especificação completa&quot; para continuar.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="bordered" onPress={() => setStep(1)}>
              ← Voltar
            </Button>
            <Button onPress={() => setStep(3)} isDisabled={!nomeMapped}>
              Continuar →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && file && conversion && (
        <div>
          <div className="mb-3.5 flex items-center gap-2 rounded-lg border border-functional-success/30 bg-functional-success-light px-3.5 py-2.5">
            <Icon name="check" size={14} className="text-functional-success" />
            <span className="text-[13px] font-semibold text-functional-success">
              {conversion.materiais.length} linha{conversion.materiais.length !== 1 ? "s" : ""}{" "}
              pronta{conversion.materiais.length !== 1 ? "s" : ""} para importar
              {conversion.materiais.length > 3 ? " — mostrando primeiras 3" : ""}
            </span>
          </div>
          {conversion.descartadas.length > 0 && (
            <div className="mb-3.5 rounded-lg border border-tint-amber-fg/20 bg-tint-amber-bg px-3.5 py-2.5">
              <p className="text-[13px] font-semibold text-tint-amber-fg">
                {conversion.descartadas.length} linha
                {conversion.descartadas.length !== 1 ? "s" : ""} será
                {conversion.descartadas.length !== 1 ? "ão" : ""} ignorada
                {conversion.descartadas.length !== 1 ? "s" : ""}:
              </p>
              <ul className="mt-1 text-xs text-tint-amber-fg">
                {conversion.descartadas.slice(0, 4).map((d) => (
                  <li key={d.linha}>
                    linha {d.linha} — {d.motivo}
                  </li>
                ))}
                {conversion.descartadas.length > 4 && (
                  <li>… e mais {conversion.descartadas.length - 4}</li>
                )}
              </ul>
            </div>
          )}
          <div className="mb-4 overflow-x-auto rounded-lg border border-neutral-gray-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-gray-4 bg-neutral-gray-2">
                  {mappedColumns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7"
                    >
                      {fieldLabel(mapping[col] ?? "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.rows.slice(0, 3).map((row, ri) => (
                  <tr key={ri} className="border-b border-neutral-gray-4 last:border-b-0">
                    {mappedColumns.map((col) => (
                      <td key={col} className="px-3 py-[9px] text-xs text-neutral-gray-9">
                        {row[col] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="bordered" onPress={() => setStep(2)}>
              ← Voltar
            </Button>
            <Button
              onPress={handleImport}
              isDisabled={conversion.materiais.length === 0}
              isLoading={importMateriais.isPending}
            >
              Confirmar importação
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="px-0 pb-3 pt-7 text-center">
          <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-functional-success-light">
            <Icon name="check_circle" size={40} className="text-functional-success" />
          </div>
          <p className="mb-2 text-xl font-bold text-neutral-gray-11">
            {importedCount} materia{importedCount === 1 ? "l importado" : "is importados"}!
          </p>
          <p className="mb-1 text-[13px] text-neutral-gray-7">
            Os novos materiais já estão disponíveis no catálogo.
          </p>
          <p className="mb-6 text-xs text-neutral-gray-6">
            Campos de custo serão preenchidos pela construtora.
          </p>
          <Button onPress={onClose}>Fechar</Button>
        </div>
      )}
    </Modal>
  );
}
