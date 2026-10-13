import { readJson, writeJson } from "../lib/browserStorage";

export interface NamedGraphic<T> {
  id: string;
  name: string;
  savedAt: number;
  board: T;
}

const isNamed = <T>(value: unknown): value is NamedGraphic<T> =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as NamedGraphic<T>).id === "string" &&
      typeof (value as NamedGraphic<T>).name === "string" &&
      typeof (value as NamedGraphic<T>).savedAt === "number" &&
      "board" in (value as NamedGraphic<T>),
  );

export const listNamedGraphics = <T>(key: string): NamedGraphic<T>[] => {
  const raw = readJson<unknown>(key);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isNamed<T>);
};

export const writeNamedGraphics = <T>(key: string, saves: NamedGraphic<T>[]) => {
  writeJson(key, saves);
};

export const upsertNamedGraphic = <T>(
  key: string,
  name: string,
  board: T,
  existingId?: string,
): { saves: NamedGraphic<T>[]; saved: NamedGraphic<T> } => {
  const label = name.replace(/\s+/g, " ").trim() || "Untitled";
  const current = listNamedGraphics<T>(key);
  const id =
    existingId && current.some((save) => save.id === existingId)
      ? existingId
      : `g-${Date.now().toString(36)}`;
  const saved: NamedGraphic<T> = {
    id,
    name: label,
    savedAt: Date.now(),
    board,
  };
  const saves = current.some((save) => save.id === id)
    ? current.map((save) => (save.id === id ? saved : save))
    : [...current, saved];
  writeNamedGraphics(key, saves);
  return { saves, saved };
};

export const deleteNamedGraphic = <T>(
  key: string,
  id: string,
): NamedGraphic<T>[] => {
  const saves = listNamedGraphics<T>(key).filter((save) => save.id !== id);
  writeNamedGraphics(key, saves);
  return saves;
};
