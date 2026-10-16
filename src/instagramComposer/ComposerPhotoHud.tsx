import { imageFilesFromList } from "./composerPhotoDrop";
import { dataUrlFromImageFile } from "../playerOfTheDayComposer/PhotoFrame";

interface ComposerPhotoHudProps {
  onPick: () => void;
  onUpload: (dataUrl: string) => void;
  onUploadMany?: (dataUrls: string[]) => void;
  pickLabel?: string;
}

export function ComposerPhotoHud({
  onPick,
  onUpload,
  onUploadMany,
  pickLabel = "Pick player",
}: ComposerPhotoHudProps) {
  return (
    <div className="sc-look" role="group" aria-label="Photo">
      <span className="sc-look__label">Photo</span>
      <button type="button" className="sc-chip" onClick={onPick}>
        {pickLabel}
      </button>
      <label className="sc-chip">
        Upload
        <input
          className="pod-photo__file"
          type="file"
          accept="image/*"
          multiple
          aria-label="Upload photo"
          onChange={(event) => {
            const files = imageFilesFromList(event.target.files);
            event.currentTarget.value = "";
            if (!files.length) {
              return;
            }
            void (async () => {
              const urls: string[] = [];
              for (const file of files) {
                urls.push(await dataUrlFromImageFile(file));
              }
              if (onUploadMany && urls.length > 1) {
                onUploadMany(urls);
                return;
              }
              onUpload(urls[0]!);
            })();
          }}
        />
      </label>
      {onUploadMany ? (
        <label className="sc-chip">
          Folder
          <input
            className="pod-photo__file"
            type="file"
            accept="image/*"
            multiple
            // @ts-expect-error webkitdirectory is the folder-drop affordance
            webkitdirectory=""
            aria-label="Upload photo folder"
            onChange={(event) => {
              const files = imageFilesFromList(event.target.files);
              event.currentTarget.value = "";
              if (!files.length) {
                return;
              }
              void (async () => {
                const urls: string[] = [];
                for (const file of files) {
                  urls.push(await dataUrlFromImageFile(file));
                }
                onUploadMany(urls);
              })();
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
