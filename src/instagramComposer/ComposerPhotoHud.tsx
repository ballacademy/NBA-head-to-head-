import { dataUrlFromImageFile } from "../playerOfTheDayComposer/PhotoFrame";

interface ComposerPhotoHudProps {
  onPick: () => void;
  onUpload: (dataUrl: string) => void;
  pickLabel?: string;
}

export function ComposerPhotoHud({
  onPick,
  onUpload,
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
          aria-label="Upload photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (!file) {
              return;
            }
            void dataUrlFromImageFile(file).then(onUpload);
          }}
        />
      </label>
    </div>
  );
}
