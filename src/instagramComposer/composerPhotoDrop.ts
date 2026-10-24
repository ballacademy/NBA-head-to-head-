const isImageFile = (file: File) => file.type.startsWith("image/");

const readEntries = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });

const fileFromEntry = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => {
    entry.file(resolve, reject);
  });

const collectEntryFiles = async (
  entry: FileSystemEntry | null | undefined,
  into: File[],
): Promise<void> => {
  if (!entry) {
    return;
  }
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    if (isImageFile(file)) {
      into.push(file);
    }
    return;
  }
  if (!entry.isDirectory) {
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  for (;;) {
    const batch = await readEntries(reader);
    if (!batch.length) {
      break;
    }
    for (const child of batch) {
      await collectEntryFiles(child, into);
    }
  }
};

export const imageFilesFromList = (files: FileList | File[] | null | undefined) =>
  [...(files ?? [])].filter(isImageFile);

export const imageFilesFromDataTransfer = async (
  data: DataTransfer | null | undefined,
): Promise<File[]> => {
  if (!data) {
    return [];
  }
  const items = [...(data.items ?? [])];
  if (items.some((item) => typeof item.webkitGetAsEntry === "function")) {
    const collected: File[] = [];
    for (const item of items) {
      await collectEntryFiles(item.webkitGetAsEntry?.() ?? null, collected);
    }
    if (collected.length) {
      return collected;
    }
  }
  return imageFilesFromList(data.files);
};
