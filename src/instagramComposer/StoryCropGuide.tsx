interface StoryCropGuideProps {
  on: boolean;
}

/** Overlay the 9:16 story clip bands on a 4:5 preview. */
export function StoryCropGuide({ on }: StoryCropGuideProps) {
  if (!on) {
    return null;
  }
  return (
    <div className="sc-story-crop" aria-hidden="true">
      <span className="sc-story-crop__band is-top" />
      <span className="sc-story-crop__band is-bottom" />
      <p className="sc-story-crop__label">9:16 clip</p>
    </div>
  );
}
